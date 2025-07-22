# 表情模糊功能使用说明

## 功能概述

表情模糊功能为 WoaApp 增加了一个隐私保护功能，允许用户快速模糊聊天内容，保护敏感信息。

## 功能特性

### 1. 表情按钮
- **位置**: 插入到第三方网页的 `.sidebar-bottom` 区域
- **尺寸**: 24x24 像素
- **图标**: 
  - 正常状态：😊 笑脸图标 (FACE_B_SVG)
  - 模糊状态：😑 面无表情图标 (FACE_C_SVG)

### 2. 交互效果
- **悬停效果**: 鼠标悬停时背景变灰，图标颜色加深
- **点击切换**: 点击按钮可在模糊/正常状态间切换
- **状态提示**: 按钮 title 属性会根据当前状态显示对应提示

### 3. 模糊功能
- **目标元素**: 页面中所有 `.chat-content .chat-message` 元素
- **效果**: `filter: blur(3px)` CSS 样式
- **动画**: 0.3秒平滑过渡效果
- **动态支持**: 自动监听新增的聊天消息，应用相同的模糊效果

## 技术实现

### 1. 脚本注入
```typescript
function initEmotionBlurFeature(mainWindow: BrowserWindow): void {
  // 通过 executeJavaScript 注入客户端脚本
  mainWindow.webContents.executeJavaScript(...)
}
```

### 2. DOM 操作
- 创建按钮元素并设置样式
- 查找目标容器 `.sidebar-bottom`
- 添加事件监听器和悬停效果

### 3. 状态管理
- `isBlurred`: 布尔值记录当前模糊状态
- `emotionButton`: 保存按钮元素引用
- 动态切换图标和提示文本

### 4. MutationObserver
```javascript
const observer = new MutationObserver((mutations) => {
  if (isBlurred) {
    // 对新添加的聊天消息应用模糊效果
  }
});
```

## 使用流程

### 1. 自动初始化
- 应用启动后，脚本会自动注入到第三方网页
- 等待页面加载完成后自动初始化功能
- 如果侧边栏未找到，会每秒重试直到成功

### 2. 用户操作
1. 在聊天界面的侧边栏底部找到表情按钮
2. 点击按钮激活模糊效果
3. 所有聊天消息会应用 3px 模糊效果
4. 再次点击按钮可取消模糊效果

### 3. 调试支持
- 控制台输出详细日志信息
- 全局函数 `window.emotionBlurToggle()` 可手动切换状态
- 开发模式下会自动打开开发者工具

## 故障排除

### 1. 按钮未出现
- 检查控制台是否有 "🎭 Sidebar bottom not found" 日志
- 确认目标页面是否有 `.sidebar-bottom` 元素
- 脚本会自动重试，耐心等待页面完全加载

### 2. 模糊效果无效
- 检查控制台日志中聊天消息数量
- 确认页面中是否存在 `.chat-content .chat-message` 元素
- 检查 CSS 样式是否被其他规则覆盖

### 3. 新消息未模糊
- MutationObserver 会自动处理新增消息
- 检查 "🎭 Chat messages observer started" 日志
- 确认 `.chat-content` 容器存在

## 代码位置

- **主文件**: `src/main/index.ts` 第 1342-1549 行
- **调用位置**: `src/main/index.ts` 第 156 行
- **函数名称**: `initEmotionBlurFeature()`

## 更新历史

- **v1.0.0**: 初始版本，基本模糊功能
- **v1.0.1**: 添加动态消息监听
- **v1.0.2**: 优化按钮样式和交互效果

## 注意事项

1. **兼容性**: 依赖现代浏览器的 CSS filter 支持
2. **性能**: MutationObserver 可能对性能有轻微影响
3. **隐私**: 模糊效果仅在视觉层面，不影响数据传输
4. **样式**: 可能需要根据目标网站的样式进行调整

## 扩展建议

1. **快捷键**: 添加键盘快捷键支持（如 Ctrl+H）
2. **自定义**: 允许用户自定义模糊程度
3. **白名单**: 支持特定联系人消息不模糊
4. **记忆状态**: 保存用户的模糊偏好设置
