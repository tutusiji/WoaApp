# WoaApp 架构设计文档

## 项目概述

WoaApp 是一个基于 Electron + Vue + TypeScript 的桌面聊天客户端应用，主要用于连接金山云办公(WPS)的即时通讯服务。该应用具有消息气泡提醒、截图、待办事项管理等功能。

## 技术栈

- **框架**: Electron 33.2.0
- **前端**: Vue.js + TypeScript
- **构建工具**: Electron-vite 2.3.0
- **打包工具**: Electron-builder 25.1.8
- **包管理**: pnpm
- **数据存储**: electron-store

## 架构总体设计

### 1. 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      WoaApp 桌面应用                        │
├─────────────────────┬─────────────────┬─────────────────────┤
│    主进程 (Main)     │   渲染进程 (Renderer)  │  预加载脚本 (Preload) │
├─────────────────────┼─────────────────┼─────────────────────┤
│  • 窗口管理          │  • 主窗口(聊天)   │  • IPC 通信桥梁      │
│  • 系统托盘          │  • 气泡窗口(消息) │  • API 暴露         │
│  • 截图功能          │  • 待办窗口      │  • 安全隔离         │
│  • 待办管理          │  • Vue 组件      │                    │
│  • WebSocket监听     │                 │                    │
│  • 数据持久化        │                 │                    │
└─────────────────────┴─────────────────┴─────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   外部服务集成       │
                    ├─────────────────────┤
                    │  • WPS 云办公平台    │
                    │  • WebSocket 实时通信│
                    │  • 用户认证服务      │
                    └─────────────────────┘
```

## 核心模块设计

### 2. 主进程 (Main Process) 架构

主进程位于 `src/main/index.ts`，负责应用的核心控制逻辑。

#### 2.1 主进程核心组件

```typescript
// 主要模块导入
import {
  app, BrowserWindow, ipcMain, Tray, Menu, screen, session, dialog
} from 'electron'
import { TodoManager } from './todo'
import { initScreenshot } from './screenshot'
import { fetchAndCacheUserInfo } from './getDepartMent'
import { reportUserBehavior } from './report'
```

#### 2.2 窗口管理系统

```
窗口管理器
├── 主窗口 (mainWindow)
│   ├── 尺寸: 1024x780
│   ├── WebView: 加载 WPS 聊天页面
│   ├── 会话管理: 持久化登录状态
│   └── 脚本注入: 消息监听和功能增强
├── 气泡窗口 (bubbleWindow)
│   ├── 尺寸: 260x180
│   ├── 位置: 屏幕右下角
│   ├── 特性: 置顶、透明、无边框
│   └── 用途: 消息通知提醒
└── 待办窗口 (todoWindow)
    ├── 尺寸: 800x600
    ├── 管理类: TodoManager
    └── 功能: 待办事项管理
```

#### 2.3 系统集成功能

**托盘管理 (Tray)**
- 图标状态切换 (正常/活跃/闪烁)
- 右键菜单功能
- 通知方式配置

**截图功能 (Screenshot)**
- 快捷键: Alt+Shift+A
- 框选截图
- 自动复制到剪贴板
- 保存功能

**会话管理 (Session)**
- 持久化分区: 'persist:woachat'
- Cookie 管理和自动登录
- 安全策略配置
- WebSocket 连接监听

### 3. 渲染进程 (Renderer Process) 架构

#### 3.1 多窗口渲染

```
渲染进程
├── 主窗口渲染
│   ├── 加载目标: https://woa.wps.cn/im/messages
│   ├── 脚本注入: 消息监听、UI增强
│   ├── 功能集成: 待办提取、消息转发
│   └── 开发工具: F12 调试支持
├── 气泡窗口渲染
│   ├── 文件: bubble.html
│   ├── 功能: 消息气泡显示
│   ├── 交互: 悬停控制、点击操作
│   └── 动画: 显示/隐藏动效
└── 待办窗口渲染
    ├── 文件: todo.html
    ├── 框架: Vue.js 组件
    ├── 功能: CRUD 操作界面
    └── 数据: 本地存储绑定
```

#### 3.2 Vue.js 应用结构

```
src/renderer/src/
├── App.vue              # 主应用组件
├── main.ts             # 应用入口
├── bubble.ts           # 气泡窗口逻辑
├── todo.ts             # 待办窗口逻辑
├── components/         # Vue 组件库
│   └── Versions.vue    # 版本信息组件
├── assets/            # 静态资源
└── types/             # TypeScript 类型定义
```

### 4. 预加载脚本 (Preload Scripts) 架构

#### 4.1 安全通信桥梁

```typescript
// src/preload/index.ts - 主预加载脚本
const api = {
  // 截图功能
  takeScreenshot: () => ipcRenderer.send('take-screenshot'),
  
  // 待办事项
  openTodoWindow: () => ipcRenderer.send('open-todo-window'),
  getTodos: () => ipcRenderer.invoke('get-todos'),
  addTodo: (todo) => ipcRenderer.invoke('add-todo', todo),
  
  // 气泡窗口
  openBubbleDevtools: () => ipcRenderer.send('open-bubble-devtools')
}
```

#### 4.2 多预加载脚本

```
预加载脚本系统
├── index.ts           # 主窗口预加载
│   ├── IPC 通信封装
│   ├── API 安全暴露
│   └── 类型定义支持
└── bubblePreload.ts   # 气泡窗口预加载
    ├── 消息处理
    ├── 窗口控制
    └── 事件监听
```

## 功能模块设计

### 5. 核心功能模块

#### 5.1 消息监听与处理

```typescript
// WebSocket 消息监听
class MessageMonitor {
  // 注入脚本监听页面消息
  injectScript(): void
  
  // 解析 Protobuf 消息
  parseMessage(data: ArrayBuffer): MessageData
  
  // 转发消息到气泡窗口
  sendToBubble(messages: Message[]): void
  
  // 更新托盘状态
  updateTrayIcon(unreadCount: number): void
}
```

#### 5.2 待办事项管理

```typescript
// src/main/todo.ts
export class TodoManager {
  private todoWindow: BrowserWindow | null
  private store: ElectronStore
  
  // 创建待办窗口
  createTodoWindow(): void
  
  // CRUD 操作
  addTodo(todo: TodoItem): Promise<TodoItem>
  updateTodo(todo: TodoItem): Promise<TodoItem>
  deleteTodo(id: string): Promise<boolean>
  getTodos(): Promise<TodoItem[]>
  
  // 脚本注入
  getInjectScript(): string
}
```

#### 5.3 截图功能

```typescript
// src/main/screenshot.ts
export function initScreenshot(mainWindow: BrowserWindow) {
  // 注册全局快捷键
  globalShortcut.register('Alt+Shift+A', startScreenshot)
  
  // 监听截图事件
  screenshotsInstance.on('ok', handleScreenshotComplete)
  screenshotsInstance.on('cancel', handleScreenshotCancel)
  screenshotsInstance.on('save', handleScreenshotSave)
}
```

### 6. 数据管理

#### 6.1 本地存储策略

```
数据存储架构
├── electron-store
│   ├── 用户配置 (notificationMode, bubblePosition)
│   ├── 用户信息缓存 (userInfo)
│   └── 待办数据 (todo-data)
├── Session 存储
│   ├── Cookies (登录状态)
│   ├── LocalStorage (页面数据)
│   └── IndexedDB (离线数据)
└── 临时存储
    ├── 消息缓存 (lastMessages)
    ├── WebSocket 状态
    └── 窗口状态
```

#### 6.2 配置管理

```typescript
// 通知模式配置
enum NotificationMode {
  ACTIVE = 'active',           // 常驻显示
  ACTIVE_3S = 'active-3s',     // 显示4秒后消失
  IMMERSIVE = 'immersive'      // 悬停显示
}

// 应用配置结构
interface AppConfig {
  notificationMode: NotificationMode
  bubbleWindowPosition: { x: number; y: number }
  userInfo: { name: string; avatar: string }
  autoStart: boolean
}
```

## 通信机制设计

### 7. IPC 通信架构

#### 7.1 主进程 ↔ 渲染进程通信

```
IPC 通信流程
┌─────────────────┐    IPC Events    ┌─────────────────┐
│   Main Process  │ ←――――――――――――→ │ Renderer Process│
├─────────────────┤                  ├─────────────────┤
│ • Window Control│                  │ • User Interface│
│ • System APIs   │                  │ • Event Handling│
│ • Data Storage  │                  │ • UI Updates    │
│ • External APIs │                  │ • User Input    │
└─────────────────┘                  └─────────────────┘
        ▲                                      ▲
        │               Preload Scripts        │
        └─────────────── Security Bridge ──────┘
```

#### 7.2 主要 IPC 事件

```typescript
// 窗口控制事件
'open-todo-window'
'hide-bubble-window'
'take-screenshot'

// 数据操作事件
'get-todos'
'add-todo'
'update-todo'
'delete-todo'

// 消息处理事件
'update-unread-count'
'update-message'
'add-todo-from-chat'

// 系统事件
'ping' / 'pong'
'open-feedback'
```

### 8. 外部服务集成

#### 8.1 WPS 云办公平台集成

```typescript
// 目标服务
const WPS_CHAT_URL = 'https://woa.wps.cn/im/messages#/'
const WPS_LOGIN_URL = 'https://account.wps.cn/'

// 会话配置
session.setUserAgent('Chrome/120.0.0.0 Safari/537.36')
session.setPermissionRequestHandler(callback(true))
session.webRequest.onBeforeRequest(allowAllRequests)
```

#### 8.2 WebSocket 监听

```typescript
// WebSocket 连接监听
session.webRequest.onBeforeRequest((details) => {
  if (details.url.startsWith('wss://woa.wps.cn/sub')) {
    // 提取连接参数
    // 监听消息数据
    // 转发到气泡窗口
  }
})
```

## 构建与部署

### 9. 构建配置

#### 9.1 Electron-vite 配置

```typescript
// electron.vite.config.ts
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: { rollupOptions: { output: { format: 'cjs' } } }
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: 'src/preload/index.ts',
          bubblePreload: 'src/preload/bubblePreload.ts'
        }
      }
    }
  },
  renderer: {
    plugins: [vue()],
    server: { port: 5174 }
  }
})
```

#### 9.2 Electron-builder 配置

```yaml
# electron-builder.yml
appId: com.electron.app
productName: WoaApp
win:
  executableName: WoaApp
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  perMachine: true
```

### 10. 脚本命令

```json
{
  "scripts": {
    "dev": "electron-vite dev --watch",
    "build": "electron-vite build",
    "build:win": "npm run build && electron-builder --win",
    "start": "electron-vite preview"
  }
}
```

## 安全性设计

### 11. 安全策略

#### 11.1 渲染进程安全

```typescript
webPreferences: {
  contextIsolation: false,    // 注意：已禁用隔离
  nodeIntegration: true,      // 注意：已启用Node集成
  webSecurity: false,         // 注意：已禁用Web安全
  sandbox: false             // 注意：已禁用沙盒
}
```

**⚠️ 安全风险提示**：
- 当前配置为了功能便利性，降低了安全级别
- 建议在生产环境中重新评估安全配置
- 考虑启用 contextIsolation 并通过 preload 脚本安全地暴露 API

#### 11.2 网络安全

```typescript
// 允许所有证书（开发用）
session.setCertificateVerifyProc(callback(0))

// 建议：生产环境应该验证证书
session.setCertificateVerifyProc((request, callback) => {
  // 实现证书验证逻辑
})
```

## 性能优化

### 12. 性能考虑

#### 12.1 内存管理

- 及时清理定时器和事件监听器
- 控制消息缓存数量
- 合理管理窗口生命周期

#### 12.2 渲染性能

- Vue.js 组件按需加载
- 气泡窗口使用 `showInactive()` 避免抢焦点
- 背景节流禁用 `backgroundThrottling: false`

## 扩展性设计

### 13. 模块化架构

```
src/main/
├── index.ts          # 主入口，协调各模块
├── todo.ts           # 待办功能模块
├── screenshot.ts     # 截图功能模块
├── getDepartMent.ts  # 用户信息模块
├── report.ts         # 行为上报模块
└── websocket-monitor.ts # WebSocket监听模块
```

### 14. 插件化设计

- 功能模块独立封装
- 通过 IPC 事件系统通信
- 配置驱动的功能开关
- 支持运行时功能加载/卸载

## 总结

WoaApp 采用了经典的 Electron 多进程架构，通过主进程统一管理系统资源和窗口，渲染进程专注于用户界面展示，预加载脚本确保安全的跨进程通信。整体设计遵循了关注点分离的原则，具有良好的模块化程度和扩展性。

### 架构优势

1. **模块化设计**：功能模块独立，便于维护和扩展
2. **多窗口支持**：主窗口、气泡窗口、待办窗口各司其职
3. **数据持久化**：完善的本地存储和会话管理
4. **系统集成**：托盘、快捷键、通知等系统级功能
5. **实时通信**：WebSocket 监听和消息转发机制

### 改进建议

1. **安全加固**：重新评估安全配置，启用适当的安全策略
2. **错误处理**：完善异常处理和错误恢复机制
3. **测试覆盖**：增加单元测试和集成测试
4. **文档完善**：补充 API 文档和开发指南
5. **性能监控**：添加性能指标收集和监控机制

该架构为 WoaApp 提供了稳定可靠的技术基础，支持未来功能的持续演进和扩展。
