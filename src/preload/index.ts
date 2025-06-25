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
  addTodoFromChat: (text: string): void => ipcRenderer.send('add-todo-from-chat', text)
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
