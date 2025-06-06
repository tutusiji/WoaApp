/// <reference types="vite/client" />

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

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>
  export default component
}
