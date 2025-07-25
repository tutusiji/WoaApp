import { ElectronAPI } from '@electron-toolkit/preload'
import type { TodoItem } from '../main/todo'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      openBubbleDevtools: () => void
      takeScreenshot: () => void
      openTodoWindow: () => void
      getTodos: () => Promise<TodoItem[]>
      addTodo: (todo: Omit<TodoItem, 'id' | 'timestamp' | 'processed'>) => Promise<TodoItem>
      updateTodo: (todo: TodoItem) => Promise<TodoItem>
      deleteTodo: (todoId: string) => Promise<boolean>
      getUnprocessedTodoCount: () => Promise<number>
      addTodoFromChat: (text: string) => void
      getEmotionBlurState: () => Promise<boolean>
      setEmotionBlurState: (state: boolean) => Promise<void>
      // 自动更新相关API
      checkForUpdates: () => void
      startUpdateDownload: (versionInfo: any) => void
      restartAndInstallUpdate: () => void
      getCurrentVersion: () => Promise<string>
    }
    electronAPI: {
      send: (channel: string, ...args: any[]) => void
      on: (channel: string, listener: (...args: any[]) => void) => void
      off: (channel: string, listener: (...args: any[]) => void) => void
    }
  }
}
