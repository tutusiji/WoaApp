import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { TodoItem } from '../main/todo'

// Custom APIs for renderer
const api = {
  // 打开气泡窗口开发者工具
  openBubbleDevtools: (): void => {
    ipcRenderer.send('open-bubble-devtools')
  },
  // 截图
  takeScreenshot: (): void => ipcRenderer.send('take-screenshot'),

  // 待办事项
  openTodoWindow: (): void => ipcRenderer.send('open-todo-window'),
  getTodos: (): Promise<TodoItem[]> => ipcRenderer.invoke('get-todos'),
  addTodo: (todo: Omit<TodoItem, 'id' | 'timestamp' | 'processed'>): Promise<TodoItem> =>
    ipcRenderer.invoke('add-todo', todo),
  updateTodo: (todo: TodoItem): Promise<TodoItem> => ipcRenderer.invoke('update-todo', todo),
  deleteTodo: (todoId: string): Promise<boolean> => ipcRenderer.invoke('delete-todo', todoId),
  getUnprocessedTodoCount: (): Promise<number> => ipcRenderer.invoke('get-unprocessed-todo-count'),
  addTodoFromChat: (text: string): void => ipcRenderer.send('add-todo-from-chat', text),

  // 表情模糊状态管理
  getEmotionBlurState: (): Promise<boolean> => ipcRenderer.invoke('get-emotion-blur-state'),
  setEmotionBlurState: (state: boolean): Promise<void> => ipcRenderer.invoke('set-emotion-blur-state', state),

  // 自动更新相关API
  checkForUpdates: (): void => ipcRenderer.send('check-for-updates'),
  startUpdateDownload: (versionInfo: any): void => ipcRenderer.send('start-update-download', versionInfo),
  restartAndInstallUpdate: (): void => ipcRenderer.send('restart-and-install-update'),
  getCurrentVersion: (): Promise<string> => ipcRenderer.invoke('get-current-version')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    
    // 为更新通知组件暴露需要的API
    contextBridge.exposeInMainWorld('electronAPI', {
      send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
      on: (channel: string, listener: (...args: any[]) => void) => {
        ipcRenderer.on(channel, (event, ...args) => listener(...args))
      },
      off: (channel: string, listener: (...args: any[]) => void) => {
        ipcRenderer.off(channel, listener)
      }
    })
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window.ipcRenderer = ipcRenderer
  // @ts-ignore (define in dts)
  window.electronAPI = {
    send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
    on: (channel: string, listener: (...args: any[]) => void) => {
      ipcRenderer.on(channel, (event, ...args) => listener(...args))
    },
    off: (channel: string, listener: (...args: any[]) => void) => {
      ipcRenderer.off(channel, listener)
    }
  }
}
