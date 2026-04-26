# 导入数据库集成指南

## 概述
已成功集成 `importedRuntimeSqlite.ts` 中的预加载数据到项目的运行时数据库中。

## 实现内容

### 1. 新建文件：`importedDatabaseManager.ts`
位置：`frontend/src/utils/importedDatabaseManager.ts`

**功能：**
- `importBundledDatabase()` - 导入捆绑的数据库
- `reimportBundledDatabase()` - 强制重新导入数据库
- `hasBundledDatabase()` - 检查是否有可用的捆绑数据库
- `getBundledDatabaseSize()` - 获取捆绑数据库的大小

**特点：**
- 自动检测是否已导入（使用 `imported-database-mark-v1` 标记）
- 防止重复导入
- 提供导入统计信息（各表的记录数）
- 错误处理和详细的日志记录

### 2. 修改 `main.ts`
- 添加 `importBundledDatabase` 的导入
- 在应用启动时，使用 `scheduleNonCriticalTask` 在后台执行导入
- 导入延迟 800ms，确保不影响关键启动路径
- 导入失败时记录警告日志

### 3. 增强 `DataConfig.vue`
添加了：
- **导入按钮** - 在未导入时显示"导入数据"按钮
- **导入状态** - 实时显示导入进度（正在导入/已导入）
- **数据统计** - 导入完成后显示各表的记录统计
- **UI 反馈** - 使用图标和颜色变化提示用户状态

## 工作流程

### 首次加载应用
1. 应用启动时检查是否有捆绑数据库
2. 如果有且未导入过，自动在后台导入
3. 导入完成后，在浏览器 localStorage 中标记为已导入
4. 用户可在 Data Config 页面看到导入统计

### 用户界面
在 `/data` (Data Config) 页面中：
- 如果有可用的捆绑数据库且未导入：显示"导入数据"按钮
- 点击按钮手动导入数据
- 导入过程中显示加载状态
- 导入完成后显示数据统计表

## 导入的数据

导入包括 5 个表的所有数据：
- **announcements** (公告)
- **reactions** (化学反应)
- **substances** (化学物质)
- **configs** (配置)
- **leaderboard** (排行榜)

## 技术细节

### 数据格式
- `importedRuntimeSqlite.ts` 包含一个大的 Base64 编码的 SQLite 数据库
- 使用 sql.js 库的 `importImage()` 方法导入
- 导入时自动替换现有数据库

### 防重复机制
```typescript
// localStorage 中的标记
localStorage.setItem('imported-database-mark-v1', 'true')
```

### 错误恢复
- 导入失败不会中断应用启动
- 所有错误都被捕获并记录到控制台
- 用户可以手动重试导入

## 测试方法

1. **自动导入**
   - 打开浏览器开发者工具的 Console 标签
   - 刷新页面
   - 观察是否看到导入日志：`[Database] bundled database imported`

2. **手动导入**
   - 进入 `/data` 页面
   - 如果看到"导入数据"按钮，点击导入
   - 确认显示数据统计

3. **检查导入状态**
   - 打开浏览器 LocalStorage
   - 查找 `imported-database-mark-v1` 键值
   - 值应为 `"true"`

## 注意事项

⚠️ **关于 chemistryuno.db**
- 原始的 `chemistryuno.db` 文件已损坏（包含孤立的索引）
- 不能直接导入该文件
- 使用 `importedRuntimeSqlite.ts` 中的预加载数据作为替代方案

## 未来改进

可能的增强功能：
1. 添加增量更新机制（只导入新数据）
2. 提供数据导出功能
3. 支持 JSON 导入/导出
4. 添加数据校验和验证
5. 实现数据版本控制

## 相关文件

- `/frontend/src/utils/importedDatabaseManager.ts` - 新增管理器
- `/frontend/src/main.ts` - 启动流程集成
- `/frontend/src/pages/DataConfig.vue` - UI 增强
- `/frontend/src/utils/importedRuntimeSqlite.ts` - 数据源（已存在）
- `/frontend/src/utils/clientRuntimeDatabase.ts` - 数据库核心（无变动）
