// 全局类型声明
declare global {
  interface Window {
    bubbleAPI: {
      onUpdateMessage: (callback: (messages: any[]) => void) => void
      onUpdateNotificationMode: (callback: (mode: string) => void) => void
      bubbleReady: () => void
      bubbleMouseEnter: () => void
      bubbleMouseLeave: () => void
      notificationClicked: () => void
      clearSingleMessage: (message: any) => void
      clearAllMessages: () => void
      openBubbleDevtools: () => void
      removeAllListeners: () => void
    }
  }
}

export {}
