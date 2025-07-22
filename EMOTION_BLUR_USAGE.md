# 表情模糊功能使用指南

## 功能概述

表情模糊功能为WoaApp提供了聊天内容隐私保护能力，通过一键模糊/显示切换来保护用户的聊天隐私。**现在支持状态持久化，即使页面刷新状态也会保留！**

## 新版本特性 🚀

### v2.1 更新 - 状态持久化 ✨
- ✅ **状态持久化**: 模糊状态自动保存到 electron-store
- ✅ **刷新保持**: 第三方页面刷新后模糊状态自动恢复
- ✅ **手动控制**: 只有用户手动点击按钮才会改变状态
- ✅ **按钮位置优化**: 表情按钮现在插入到侧边栏的第一个位置

### v2.0 架构优化
- ✅ **模块化设计**: 表情模糊功能已提取为独立模块 (`emotion-blur-script.ts`)
- ✅ **高效CSS方案**: 使用父容器类 `.vue-recycle-scroller__item-wrapper` 实现更高效的模糊控制
- ✅ **高质量图标**: 采用face_g.svg和face_c.svg提供更精美的用户体验

### 性能改进
- **CSS类控制**: 相比直接操作DOM样式，CSS类控制更高效
- **批量处理**: 一次性处理所有消息容器，减少DOM操作
- **动态监听**: 自动处理新增消息，无需手动刷新

## 功能特性

### 🎭 表情按钮
- **位置**: 位于应用侧边栏底部的**第一个位置**
- **图标切换**:
  - 😀 显示状态: 使用`face_g.svg` (绿色笑脸)
  - 😐 模糊状态: 使用`face_c.svg` (严肃表情)

### 🔒 模糊效果
- **触发方式**: 点击表情按钮
- **效果强度**: 3px 高斯模糊
- **动画过渡**: 0.3秒平滑过渡
- **范围控制**: 精确控制聊天消息内容

### � 状态持久化
- **自动保存**: 每次切换状态自动保存到 electron-store
- **自动恢复**: 页面刷新或重启应用时自动恢复上次状态
- **手动控制**: 只有手动点击按钮才会改变保存的状态
- **容错处理**: 如果读取失败则默认为非模糊状态

### �🚀 智能适配
- **动态内容**: 自动检测并处理新加载的聊天消息
- **状态保持**: 新消息自动继承当前模糊状态
- **内存友好**: 使用高效的MutationObserver监听DOM变化

## 使用方法

1. **启动应用**: 运行WoaApp，表情按钮会自动出现在侧边栏第一个位置
2. **激活模糊**: 点击😀按钮，所有聊天内容变模糊，按钮变为😐，状态自动保存
3. **取消模糊**: 再次点击😐按钮，恢复正常显示，按钮变为😀，状态自动保存
4. **状态保持**: 刷新页面或重启应用，模糊状态会自动恢复到上次设置
5. **调试模式**: 控制台提供详细日志，支持`window.emotionBlurDebug`调试接口

## 技术细节

### 状态持久化机制
```javascript
// 存储状态
await window.api.setEmotionBlurState(true);

// 读取状态
const storedState = await window.api.getEmotionBlurState();

// 在electron-store中的key
store.get('emotionBlurState', false)
```

### IPC 通信接口
```typescript
// 主进程中的处理器
ipcMain.handle('get-emotion-blur-state', () => {
  return store.get('emotionBlurState', false)
})

ipcMain.handle('set-emotion-blur-state', (event, state: boolean) => {
  store.set('emotionBlurState', state)
})
```

### CSS类控制策略
```css
.chat-messages-blurred .chat-message {
  filter: blur(3px) !important;
  transition: filter 0.3s ease !important;
}
```

### 目标选择器优化
```javascript
// 优化后：使用父容器控制
document.querySelectorAll('.vue-recycle-scroller__item-wrapper')

// 每个容器添加/移除 'chat-messages-blurred' 类
wrapper.classList.add('chat-messages-blurred')
wrapper.classList.remove('chat-messages-blurred')
```

### 调试接口
```javascript
// 调试功能状态
window.emotionBlurDebug.isBlurred()

// 检查消息容器
window.emotionBlurDebug.getWrappers()

// 检查已模糊的容器
window.emotionBlurDebug.getBlurredWrappers()

// 手动切换
window.emotionBlurToggle()
```

## 文件结构

```
src/main/
├── emotion-blur-script.ts    # 独立的模糊功能脚本(含状态持久化)
├── index.ts                  # 主进程文件(IPC处理器)
src/preload/
├── index.ts                  # preload脚本(API暴露)
├── index.d.ts                # 类型定义
build/
├── face_g.svg               # 显示状态图标
├── face_c.svg               # 模糊状态图标
└── face_b.svg               # 备用图标
```

## 开发说明

### 脚本注入与状态恢复
表情模糊脚本通过主进程的`initEmotionBlurFeature`函数注入到渲染进程，并在初始化时自动恢复状态:

```typescript
async function initBlurState() {
  const storedState = await getStoredBlurState();
  if (storedState) {
    setTimeout(() => {
      toggleBlur(); // 恢复模糊状态
    }, 100);
  }
}
```

### 按钮位置优化
```javascript
// 插入到第一个子节点位置
if (sidebarBottom.firstChild) {
  sidebarBottom.insertBefore(emotionButton, sidebarBottom.firstChild);
} else {
  sidebarBottom.appendChild(emotionButton);
}
```

### 模块导入
```typescript
import { getEmotionBlurInjectScript } from './emotion-blur-script'
```

## 故障排除

### 常见问题

1. **按钮不显示**
   - 检查`.sidebar-bottom`元素是否存在
   - 查看控制台是否有重试信息

2. **模糊效果无效**
   - 确认`.vue-recycle-scroller__item-wrapper`选择器正确
   - 检查CSS样式是否被其他规则覆盖

3. **状态不持久化**
   - 检查IPC通信是否正常：`window.api.getEmotionBlurState()`
   - 查看控制台是否有存储相关错误
   - 确认electron-store是否正常工作

4. **新消息不模糊**
   - 查看MutationObserver是否正常工作
   - 检查聊天容器选择器是否正确

### 调试步骤

1. 打开开发者工具控制台
2. 查看🎭相关的日志输出
3. 使用调试接口检查状态：
   ```javascript
   // 检查存储的状态
   await window.api.getEmotionBlurState()
   
   // 检查当前状态
   window.emotionBlurDebug.isBlurred()
   
   // 测试状态保存
   await window.api.setEmotionBlurState(true)
   ```
4. 检查DOM结构和CSS类

## 更新日志

### v2.1 (当前版本) - 状态持久化
- ✅ 新增状态持久化功能
- ✅ 按钮位置优化至第一个位置
- ✅ IPC通信接口完善
- ✅ 错误处理和容错机制

### v2.0 - 架构重构
- ✅ 架构重构：提取为独立模块
- ✅ 性能优化：使用CSS类控制方案
- ✅ 图标升级：使用高质量SVG图标
- ✅ 选择器优化：改用父容器类控制

### v1.0 - 初始版本
- ✅ 基础模糊功能
- ✅ 表情按钮切换
- ✅ 动态内容监听

## 技术支持

如需技术支持或反馈问题，请通过以下方式：

- 控制台日志: 查看🎭标识的相关日志
- 调试接口: 使用`window.emotionBlurDebug`进行状态检查
- 状态调试: 使用`window.api.getEmotionBlurState()`检查存储状态
- 开发工具: 检查DOM结构和CSS样式应用情况
