import { contextBridge, ipcRenderer } from 'electron'
import type { TodoItem } from '../main/todo'

// Create electronAPI object manually
const electronAPI = {
  ipcRenderer: {
    send: ipcRenderer.send.bind(ipcRenderer),
    invoke: ipcRenderer.invoke.bind(ipcRenderer),
    on: ipcRenderer.on.bind(ipcRenderer),
    off: ipcRenderer.off.bind(ipcRenderer),
    once: ipcRenderer.once.bind(ipcRenderer),
    removeAllListeners: ipcRenderer.removeAllListeners.bind(ipcRenderer)
  }
}

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

  // 自动更新
  showUpdateDialog: (): void => ipcRenderer.invoke('show-update-dialog'),
  startUpdate: (): Promise<void> => ipcRenderer.invoke('start-update'),
  restartAndInstall: (): Promise<void> => ipcRenderer.invoke('restart-and-install')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
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
}
