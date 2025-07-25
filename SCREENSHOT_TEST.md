# 截图功能测试指南

## 测试步骤

### 1. 启动应用
```bash
npm run dev
```

### 2. 等待应用加载
- 应用窗口打开后，等待页面完全加载
- 如果需要登录WOA系统，请先完成登录

### 3. 测试截图功能

#### 测试A：快捷键截图
1. 确保应用窗口有焦点
2. 按下 `Alt+Shift+A`
3. 查看是否出现"截图成功"通知
4. 打开任意支持图片的应用（如画图、Word等）
5. 按 `Ctrl+V` 测试是否能成功粘贴截图

#### 测试B：浮动按钮截图
1. 查看页面右上角是否有绿色的"📸 截图"按钮
2. 点击该按钮
3. 验证截图功能是否正常

#### 测试C：Tab导航栏按钮截图
1. 等待页面加载完成，查找tab-nav导航栏
2. 在导航栏底部应该会出现截图按钮
3. 点击测试截图功能

### 4. 验证截图质量
- 截图应该包含整个窗口内容
- 图片清晰度应该良好
- 截图自动保存到剪贴板

### 5. 错误处理测试
- 在应用未完全加载时尝试截图
- 验证错误通知是否正常显示

## 预期结果

### 成功情况
- ✅ 快捷键 `Alt+Shift+A` 可以正常截图
- ✅ 页面中出现截图按钮（浮动按钮和导航栏按钮）
- ✅ 点击按钮可以正常截图
- ✅ 截图后显示"截图成功"通知
- ✅ 截图内容自动保存到剪贴板
- ✅ 可以在其他应用中粘贴截图

### 可能的问题
- ❌ 快捷键被其他应用占用
- ❌ 页面加载未完成，按钮未出现
- ❌ 截图API调用失败
- ❌ 剪贴板写入失败

## 调试信息

如果遇到问题，可以：

1. **检查控制台输出**
   - 查看终端中的日志信息
   - 注意任何错误信息

2. **打开开发者工具**
   - 在应用中按 `F12`
   - 查看浏览器控制台的日志

3. **验证快捷键注册**
   - 控制台应该显示 "Screenshot shortcut Alt+Shift+A registered successfully"

4. **检查截图管理器初始化**
   - 控制台应该显示截图相关的初始化信息

## 故障排除

### 快捷键不工作
```
- 检查全局快捷键是否注册成功
- 确认没有其他应用占用该快捷键
- 重启应用重新注册快捷键
```

### 按钮不显示
```
- 等待页面完全加载
- 检查tab-nav容器是否存在
- 查看浏览器控制台的错误信息
```

### 截图失败
```
- 检查mainWindow是否有效
- 验证IPC通信是否正常
- 查看错误通知的具体信息
```

---

**测试完成后请报告结果，包括成功的功能和遇到的任何问题。**
