# WoaApp 自动更新系统设计文档

## 概述

本文档描述了为 WoaApp Electron 应用设计的自动更新系统。该系统支持从后端服务查询版本信息，并根据不同的更新策略提供用户友好的更新体验。

## 系统架构

### 核心组件

1. **AutoUpdaterService** (`src/main/auto-updater.ts`)
   - 负责与后端API通信
   - 管理 electron-updater 的生命周期
   - 处理不同的更新策略

2. **UpdateNotification** (`src/renderer/src/components/UpdateNotification.vue`)
   - 渲染进程的更新通知UI组件
   - 支持不同类型的通知显示

3. **UpdateControls** (`src/renderer/src/components/UpdateControls.vue`)
   - 开发/测试用的更新控制面板
   - 可以手动触发更新检查和模拟不同策略

## 更新策略

系统支持三种更新策略：

### 1. 强制更新 (forced)
- 用户必须更新才能继续使用应用
- 显示模态对话框，只有"立即更新"和"退出应用"选项
- 适用于安全性更新或重大变更

### 2. 主动提示更新 (active)
- 主动弹出更新提示框
- 用户可以选择"立即更新"、"稍后提醒"或"忽略此版本"
- 适用于功能更新和优化

### 3. 被动提示更新 (passive)
- 在应用界面右上角显示轻量级通知
- 10秒后自动隐藏
- 用户可以主动点击更新或忽略
- 适用于非关键性更新

## 后端API接口

### 检查更新接口

**请求**
```http
POST /api/v1/check-update
Content-Type: application/json

{
  "currentVersion": "1.0.5",
  "platform": "win32",
  "arch": "x64"
}
```

**响应**
```json
{
  "version": "1.0.6",
  "downloadUrl": "https://example.com/releases/WoaApp-1.0.6-setup.exe",
  "updateStrategy": "active",
  "releaseNotes": "更新内容说明",
  "publishDate": "2024-01-15T10:00:00Z"
}
```

**字段说明**
- `version`: 新版本号
- `downloadUrl`: 安装包下载地址，如果为"auto"则使用electron-updater自动下载
- `updateStrategy`: 更新策略（"forced"、"active"、"passive"）
- `releaseNotes`: 更新日志（可选）
- `publishDate`: 发布日期（可选）

## 配置选项

### 环境变量配置

在 `.env` 文件中配置：

```bash
# 后端API地址
UPDATE_API_URL=https://your-backend-api.com/api/v1/check-update

# 更新检查间隔（毫秒）
UPDATE_CHECK_INTERVAL=14400000

# 启动时自动检查
AUTO_CHECK_ON_STARTUP=true

# 开发环境API地址
DEV_UPDATE_URL=http://localhost:3000/api/check-update
```

### electron-builder 配置

在 `electron-builder.yml` 中配置发布选项：

```yaml
publish:
  - provider: generic
    url: https://your-update-server.com/releases
    publishAutoUpdate: true
  - provider: github
    owner: tutusiji
    repo: WoaApp
    private: false
    publishAutoUpdate: true
```

## 使用方式

### 初始化（主进程）

```typescript
import { AutoUpdaterService } from './auto-updater'

// 创建服务实例
const autoUpdaterService = new AutoUpdaterService('https://api.example.com/check-update')
autoUpdaterService.setMainWindow(mainWindow)

// 启动定期检查（4小时间隔）
autoUpdaterService.startPeriodicCheck(4 * 60 * 60 * 1000)

// 应用启动时检查更新
setTimeout(() => {
  autoUpdaterService.checkForUpdates()
}, 30000)
```

### IPC通信处理

```typescript
// 手动检查更新
ipcMain.on('check-for-updates', () => {
  autoUpdaterService?.manualCheckForUpdates()
})

// 开始下载更新
ipcMain.on('start-update-download', (event, versionInfo) => {
  autoUpdaterService?.checkForUpdates()
})

// 重启并安装
ipcMain.on('restart-and-install-update', () => {
  autoUpdater.quitAndInstall()
})
```

### 渲染进程使用

```vue
<template>
  <UpdateNotification />
</template>

<script setup>
import UpdateNotification from './components/UpdateNotification.vue'

// 手动触发更新检查
const checkUpdate = () => {
  window.api.checkForUpdates()
}
</script>
```

## 工作流程

1. **应用启动**
   - 30秒后自动检查更新
   - 启动定期检查定时器（默认4小时）

2. **检查更新**
   - 首先调用后端API获取版本信息
   - 比较版本号判断是否有更新
   - 如果后端API不可用，回退到electron-updater

3. **处理更新策略**
   - 根据服务器返回的策略类型处理
   - 显示相应的用户界面
   - 处理用户交互

4. **下载和安装**
   - 支持自定义下载URL（打开浏览器下载）
   - 支持electron-updater自动下载
   - 显示下载进度
   - 下载完成后提示重启安装

## 错误处理

- 网络请求失败时的重试机制
- API响应错误的降级处理
- 下载失败的用户提示
- 版本比较异常的处理

## 安全考虑

- 使用HTTPS确保更新包的安全性
- 验证服务器响应的合法性
- 支持签名验证（electron-updater内置）

## 测试

系统提供了完整的测试界面：

1. **UpdateControls组件**
   - 手动触发更新检查
   - 模拟不同更新策略
   - 显示当前版本和检查状态

2. **模拟测试**
   ```typescript
   // 模拟强制更新
   simulateUpdate('forced')
   
   // 模拟主动提示
   simulateUpdate('active')
   
   // 模拟被动提示
   simulateUpdate('passive')
   ```

## 部署注意事项

1. **代码签名**
   - Windows: 配置代码签名证书
   - macOS: 配置Apple Developer证书

2. **更新服务器**
   - 确保服务器支持版本文件和安装包托管
   - 配置正确的CORS策略

3. **CDN加速**
   - 使用CDN加速更新包下载
   - 配置合适的缓存策略

## 常见问题

### Q: 如何自定义更新检查间隔？
A: 修改环境变量 `UPDATE_CHECK_INTERVAL` 或调用 `startPeriodicCheck(interval)` 方法。

### Q: 如何禁用自动更新？
A: 设置环境变量 `AUTO_CHECK_ON_STARTUP=false` 并且不调用 `startPeriodicCheck()`。

### Q: 如何处理离线环境？
A: 系统会自动处理网络错误，离线时不会显示错误提示，下次联网时会自动检查。

### Q: 如何自定义UI样式？
A: 修改 `UpdateNotification.vue` 组件的样式，所有样式都是scoped的，不会影响其他组件。

## 版本历史

- v1.0.0: 初始版本，支持基本的更新检查和安装功能
- v1.0.5: 当前版本，完整的更新策略支持和UI组件