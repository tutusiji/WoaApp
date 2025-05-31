import { contextBridge, ipcRenderer } from 'electron'

// 由于禁用了contextIsolation，直接在window对象上暴露API
if (typeof window !== 'undefined') {
  (window as any).bubbleAPI = {
    // 监听主进程发送的消息更新
    onUpdateMessage: (callback: any) => {
      ipcRenderer.on('update-message', (event, messages) => {
        callback(messages)
      })
    },

    // 监听通知模式更新
    onUpdateNotificationMode: (callback: unknown) => {
      ipcRenderer.on('update-notification-mode', (event, mode) => {
        callback(mode)
      })
    },

    // 通知主进程气泡窗口已准备就绪
    bubbleReady: () => {
      ipcRenderer.send('bubble-ready')
    },

    // 通知主进程鼠标进入气泡
    bubbleMouseEnter: () => {
      ipcRenderer.send('bubble-mouse-enter')
    },

    // 通知主进程鼠标离开气泡
    bubbleMouseLeave: () => {
      ipcRenderer.send('bubble-mouse-leave')
    },

    // 通知主进程气泡被点击
    notificationClicked: () => {
      ipcRenderer.send('notification-clicked')
    },

    // 清除单条消息
    clearSingleMessage: (message: unknown) => {
      ipcRenderer.send('clear-single-message', message)
    },

    // 清除所有消息
    clearAllMessages: () => {
      ipcRenderer.send('clear-all-messages')
    },

    // 打开气泡窗口开发者工具
    openBubbleDevtools: () => {
      ipcRenderer.send('open-bubble-devtools')
    },

    // 移除所有监听器
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('update-message')
      ipcRenderer.removeAllListeners('update-notification-mode')
    }
  }
}

// contextIsolation 已禁用，不使用 contextBridge
// 所有 API 已通过 window 对象暴露

// 在窗口加载完成后通知主进程
window.addEventListener('DOMContentLoaded', () => {
  console.log('Bubble window DOM loaded')
})
