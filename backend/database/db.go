package database

import (
	"context"
	"errors"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	_ "modernc.org/sqlite" // 纯Go的SQLite实现
)

var (
	DB          *gorm.DB
	RedisClient *redis.Client

	redisMu           sync.RWMutex
	redisOpts         *redis.Options
	redisConfigured   bool
	redisLastRetryAt  time.Time
	redisRetryBackoff = 5 * time.Second
)

var errRedisDisabled = errors.New("redis is disabled")

// InitDB 初始化GORM数据库连接和Redis
func InitDB(dbPath string) error {
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	log.Println("🚀 Chemistry UNO 数据库初始化 (本地单机版)")
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	// 写死使用 SQLite
	sqlitePath := "./chemistryuno.db?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)"
	
	dialector := sqlite.Dialector{
		DriverName: "sqlite",
		DSN:        sqlitePath,
	}
	log.Printf("📊 使用 SQLite 数据库 (单机版)")

	var err error
	DB, err = gorm.Open(dialector, &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
		PrepareStmt:            true,
		SkipDefaultTransaction: true,
	})

	if err != nil {
		return fmt.Errorf("连接数据库失败: %v", err)
	}

	// 配置连接池 (单机版写死配置)
	sqlDB, err := DB.DB()
	if err == nil {
		sqlDB.SetMaxIdleConns(2)
		sqlDB.SetMaxOpenConns(10)
		sqlDB.SetConnMaxLifetime(time.Hour)
	}

	// 单机版不需要 Redis
	setRedisConfig(nil, false)
	setRedisClient(nil)

	// 自动迁移数据表
	if err := autoMigrate(); err != nil {
		return fmt.Errorf("数据库迁移失败: %v", err)
	}

	// 初始化默认数据
	if err := initDefaultData(); err != nil {
		return fmt.Errorf("初始化默认数据失败: %v", err)
	}

	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	log.Println("✅ 数据库初始化完成")
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	log.Println("")
	return nil
}



// GetRedisStatus 返回 Redis 状态（disabled / ok / error）。
// 当 Redis 已配置但连接断开时，会按退避策略尝试自动重连。
func GetRedisStatus(parent context.Context) (string, error) {
	if !IsRedisConfigured() {
		return "disabled", nil
	}
	if parent == nil {
		parent = context.Background()
	}
	pingCtx, cancel := context.WithTimeout(parent, 2*time.Second)
	defer cancel()
	if err := EnsureRedisConnection(pingCtx); err != nil {
		return "error", err
	}
	return "ok", nil
}

// IsRedisConfigured 返回 Redis 是否已显式配置（并非是否当前可用）。
func IsRedisConfigured() bool {
	redisMu.RLock()
	defer redisMu.RUnlock()
	return redisConfigured && redisOpts != nil
}

// EnsureRedisConnection 确保 Redis 客户端可用。
func EnsureRedisConnection(parent context.Context) error {
	if parent == nil {
		parent = context.Background()
	}
	if !IsRedisConfigured() {
		return errRedisDisabled
	}

	redisMu.RLock()
	client := RedisClient
	redisMu.RUnlock()
	if client != nil {
		if err := client.Ping(parent).Err(); err == nil {
			return nil
		}
		setRedisClient(nil)
	}

	return reconnectRedis(parent, 2*time.Second)
}

func reconnectRedis(parent context.Context, timeout time.Duration) error {
	if parent == nil {
		parent = context.Background()
	}
	redisMu.Lock()
	if !redisConfigured || redisOpts == nil {
		redisMu.Unlock()
		return errRedisDisabled
	}
	if RedisClient != nil {
		redisMu.Unlock()
		return nil
	}
	if !redisLastRetryAt.IsZero() && time.Since(redisLastRetryAt) < redisRetryBackoff {
		redisMu.Unlock()
		return fmt.Errorf("redis reconnect backoff: retry later")
	}
	opts := *redisOpts
	redisLastRetryAt = time.Now()
	redisMu.Unlock()

	client := redis.NewClient(&opts)
	pingCtx, cancel := context.WithTimeout(parent, timeout)
	defer cancel()
	if err := client.Ping(pingCtx).Err(); err != nil {
		_ = client.Close()
		return err
	}
	setRedisClient(client)
	return nil
}

func setRedisConfig(opts *redis.Options, configured bool) {
	redisMu.Lock()
	redisOpts = opts
	redisConfigured = configured
	if !configured {
		redisLastRetryAt = time.Time{}
	}
	redisMu.Unlock()
}

func setRedisClient(client *redis.Client) {
	redisMu.Lock()
	old := RedisClient
	RedisClient = client
	redisMu.Unlock()
	if old != nil && old != client {
		_ = old.Close()
	}
}

// tryConnectRedis 尝试连接Redis（快速检测）
func tryConnectRedis(addr, password string) bool {
	client := redis.NewClient(&redis.Options{
		Addr:        addr,
		Password:    password,
		DB:          0,
		DialTimeout: 500 * time.Millisecond,
	})
	defer client.Close()

	pingCtx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
	defer cancel()

	err := client.Ping(pingCtx).Err()
	return err == nil
}









// Close 关闭数据库连接
func Close() {
	if sqlDB, err := DB.DB(); err == nil {
		sqlDB.Close()
	}
	setRedisClient(nil)
}
