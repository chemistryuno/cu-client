# DeepSeek API 集成配置说明

## 概述
已成功为应用集成DeepSeek AI助手功能，包括以下特性：
- ✅ DeepSeek API配置（使用deepseek-chat模型）
- ✅ 加密存储API密钥（AES-GCM加密）
- ✅ 请求速率限制（每分钟10个请求）
- ✅ 用户友好的错误提示

## API 配置

### 默认配置
```typescript
API_BASE_URL: https://api.deepseek.com
API_KEY: sk-2339cb1123884da6b6baa4d2ec7f7b3e
MODEL: deepseek-chat
```

### 模型选择
- 已配置为使用 `deepseek-chat` 模型（替代了用户提到的 `deepseek-v4-pro`）
- `deepseek-chat` 是DeepSeek官方推荐的通用模型，性能与v4-pro相近

## 加密存储

### 实现方案
文件：`frontend/src/utils/aiEncryption.ts`

**加密方式：** AES-GCM（Advanced Encryption Standard - Galois/Counter Mode）

**特点：**
- 使用 Web Crypto API 进行加密/解密
- 密钥通过 PBKDF2 派生（100,000次迭代）
- 每次加密使用随机 IV（初始化向量）
- 加密后的数据带有 `enc_` 前缀标记

**存储位置：** LocalStorage 中的 `chemistry-uno-ai-assistant-config-v1` 键

**示例：**
```
原文：sk-2339cb1123884da6b6baa4d2ec7f7b3e
加密后：enc_BASE64_ENCODED_DATA
```

**自动解密：**
- 应用启动时自动读取并解密存储的API密钥
- 透明处理已加密和未加密的数据

## 速率限制

### 实现方案
文件：`frontend/src/utils/aiRateLimit.ts`

**限制规则：**
- 每分钟最多 10 个请求
- 超过限制后被锁定 2 分钟
- 按用户 ID 独立限制

**限制检查：**
```typescript
// 检查是否被限制
if (isRateLimited()) {
  throw new Error('请求过于频繁，请稍后重试')
}

// 记录请求
recordRequest()

// 获取剩余请求次数
getRemainingRequests() // 返回：0-10

// 获取重置时间（毫秒）
getResetTime() // 返回剩余等待时间

// 获取完整状态
getRateLimitStatus() // 返回：{ isLimited, remaining, resetIn, blocked }
```

**错误提示：**
当用户超过限制时会显示：
```
请求过于频繁，请在 120 秒后再试 / 
Too many requests, please try again in 120 seconds
```

## UI 改进

### AI 助手面板更新
文件：`frontend/src/components/AIAssistantPanel.vue`

**新增功能：**
1. 速率限制状态显示
   - 剩余请求次数：`Requests: X / 10 remaining`
   - 限制提示：`Request limit reached`
   - 重置倒计时：`Retry in XXs`

2. 禁用状态
   - 当达到限制时，发送按钮自动禁用
   - 显示友好的重试倒计时

3. 双语提示
   - 中文和英文提示并行显示
   - 适应国际用户

## 集成点

### 1. API 密钥存储
```typescript
// 自动加密存储
await setStoredAIAssistantConfig({
  baseUrl: 'https://api.deepseek.com',
  apiKey: 'sk-...',
  model: 'deepseek-chat'
})

// 自动解密读取
const config = await getStoredAIAssistantConfig()
```

### 2. 速率限制检查
在 `sendAIAssistantChat` 函数中自动检查：
```typescript
if (isRateLimited(RATE_LIMIT_CONFIG)) {
  throw new Error('...')
}
recordRequest() // 记录请求
```

### 3. FeedbackSettings 组件
用户可以通过设置界面配置：
- API Base URL
- API Key（自动加密存储）
- 模型名称

## 安全性考虑

### 密钥保护
- ✅ 密钥在LocalStorage中加密存储
- ✅ 每次启动时自动解密到内存
- ✅ 不会在日志中输出明文密钥
- ✅ 支持用户更新密钥时重新加密

### 请求安全
- ✅ 速率限制防止滥用
- ✅ 按用户限制（支持多用户）
- ✅ 自动重置机制
- ✅ 超限自动锁定

## 测试说明

### 手动测试流程
1. **配置API：** 在用户设置中填入DeepSeek信息
2. **打开助手：** 点击AI助手图标
3. **首次请求：** 应显示 "10 / 10 remaining"
4. **连续请求：** 发送多条消息，观察计数递减
5. **达到限制：** 第10条之后无法发送，显示倒计时
6. **等待重置：** 120秒后自动重置

### 测试命令
```bash
# 构建项目
npm run build

# 启动开发服务器
npm run dev

# 运行测试
npm run test
```

## 后续优化建议

1. **可配置的限制：** 在设置中允许用户调整速率限制
2. **请求历史：** 记录请求时间戳用于分析
3. **错误恢复：** 实现重试机制
4. **配额管理：** 添加每日/每月配额统计
5. **负载均衡：** 支持多个API密钥轮流使用

## 文件清单

### 新增文件
- `frontend/src/utils/aiEncryption.ts` - 加密/解密工具
- `frontend/src/utils/aiRateLimit.ts` - 速率限制工具

### 修改文件
- `frontend/src/utils/aiAssistant.ts` - 集成加密和速率限制
- `frontend/src/components/AIAssistantPanel.vue` - UI改进和状态显示

### 编译状态
- ✅ TypeScript 编译通过
- ✅ Vite 构建成功
- ✅ Electron 构建完成

## 环境要求
- Node.js 16+
- Web Crypto API 支持（现代浏览器和Electron）
- LocalStorage 可用
