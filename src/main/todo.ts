import { BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import Store from 'electron-store'

// 定义待办事项的数据结构
export interface TodoItem {
  id: string
  title: string
  details: string
  timestamp: number
  source: string
  processed: boolean
}

/**
 * TodoManager 类
 * 管理待办事项的功能，包括窗口、数据和IPC通信
 */
export class TodoManager {
  private todoWindow: BrowserWindow | null = null
  private store: any

  constructor() {
    // 初始化 electron-store，用于持久化存储待办事项数据
    this.store = new Store({
      name: 'todo-data',
      defaults: {
        todos: []
      }
    })
    this.registerIpcHandlers()
  }

  /**
   * 创建或显示待办事项窗口
   */
  private createTodoWindow(): void {
    if (this.todoWindow && !this.todoWindow.isDestroyed()) {
      this.todoWindow.focus()
      return
    }

    this.todoWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      autoHideMenuBar: true,
      title: '待办事项',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        contextIsolation: false, // 根据项目设置调整
        nodeIntegration: true // 允许在渲染进程中使用Node.js API
      }
    })

    this.todoWindow.on('ready-to-show', () => {
      this.todoWindow?.show()
    })

    this.todoWindow.on('closed', () => {
      this.todoWindow = null
    })

    // 根据开发环境或生产环境加载对应的HTML文件
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.todoWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/todo.html`)
    } else {
      this.todoWindow.loadFile(join(__dirname, '../renderer/todo.html'))
    }
  }

  /**
   * 注册所有与待办事项相关的IPC事件监听器
   */
  private registerIpcHandlers(): void {
    // 打开待办事项窗口
    ipcMain.on('open-todo-window', () => this.createTodoWindow())

    // 获取所有待办事项
    ipcMain.handle('get-todos', () => {
      return this.store.get('todos') || []
    })

    // 添加一个新的待办事项
    ipcMain.handle('add-todo', (_, todoData: Omit<TodoItem, 'id' | 'timestamp' | 'processed'>) => {
      const todos = this.store.get('todos') || []
      const newTodo: TodoItem = {
        ...todoData,
        id: `todo-${Date.now()}`,
        timestamp: Date.now(),
        processed: false
      }
      const updatedTodos = [newTodo, ...todos]
      this.store.set('todos', updatedTodos)
      this.broadcastTodoCountUpdate()
      return newTodo
    })

    // 更新一个已存在的待办事项
    ipcMain.handle('update-todo', (_, updatedTodo: TodoItem) => {
      let todos: TodoItem[] = this.store.get('todos') || []
      todos = todos.map((todo) => (todo.id === updatedTodo.id ? updatedTodo : todo))
      this.store.set('todos', todos)
      this.broadcastTodoCountUpdate()
      return updatedTodo
    })

    // 删除一个待办事项
    ipcMain.handle('delete-todo', (_, todoId: string) => {
      let todos: TodoItem[] = this.store.get('todos') || []
      todos = todos.filter((todo) => todo.id !== todoId)
      this.store.set('todos', todos)
      this.broadcastTodoCountUpdate()
      return true
    })

    // 获取未处理的待办事项数量
    ipcMain.handle('get-unprocessed-todo-count', () => {
      return this.getUnprocessedTodoCount()
    })

    // 从聊天内容创建待办事项的请求
    ipcMain.on('add-todo-from-chat', (_, text: string) => {
      this.createTodoWindow() // 确保窗口存在
      const sendEvent = () => {
        this.todoWindow?.webContents.send('show-add-todo-modal', text)
      }
      if (this.todoWindow?.webContents.isLoading()) {
        this.todoWindow.webContents.once('did-finish-load', sendEvent)
      } else {
        sendEvent()
      }
    })
  }

  /**
   * 获取未处理的待办事项数量
   */
  private getUnprocessedTodoCount(): number {
    const todos: TodoItem[] = this.store.get('todos') || []
    return todos.filter((todo) => !todo.processed).length
  }

  /**
   * 广播待办事项数量的更新到所有窗口
   */
  private broadcastTodoCountUpdate(): void {
    const count = this.getUnprocessedTodoCount()
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('update-todo-count', count)
    })
  }

  /**
   * 生成需要注入到主窗口渲染进程的脚本
   * @returns {string} - JavaScript 脚本字符串
   */
  public getInjectScript(): string {
    return `
      (function() {
        if (window.todoFeatureInitialized) return;
        window.todoFeatureInitialized = true;

        let lastRightClickedElement = null;

        // 1. 插入待办事项图标到侧边栏
        function insertTodoIcon() {
          const tabNav = document.querySelector('.tab-nav, .tab-nav-frame');
          if (tabNav && !document.getElementById('todo-icon-btn')) {
            const todoBtn = document.createElement('div');
            todoBtn.id = 'todo-icon-btn';
            todoBtn.className = 'tab-nav-item';
            todoBtn.title = '待办事项';
            todoBtn.innerHTML = \`
              <div class="tab-nav-icon" style="position: relative;">
                <span style="font-size: 20px;">📋</span>
                <div id="todo-badge" style="position: absolute; top: -2px; right: -4px; background: red; color: white; border-radius: 50%; min-width: 16px; height: 16px; font-size: 10px; display: none; justify-content: center; align-items: center; padding: 1px; box-sizing: border-box;"></div>
              </div>
              <div class="tab-nav-text">待办</div>
            \`;
            todoBtn.style.cursor = 'pointer';
            
            todoBtn.addEventListener('click', () => {
              window.api.openTodoWindow();
            });

            tabNav.appendChild(todoBtn);
            console.log('待办事项图标已插入');
            
            window.api.getUnprocessedTodoCount().then(updateTodoBadge);
          }
        }

        // 2. 更新角标数量
        function updateTodoBadge(count) {
          const badge = document.getElementById('todo-badge');
          if (badge) {
            if (count > 0) {
              badge.innerText = count;
              badge.style.display = 'flex';
            } else {
              badge.style.display = 'none';
            }
          }
        }
        
        // 监听主进程的更新通知
        window.electron.ipcRenderer.on('update-todo-count', (event, count) => {
          updateTodoBadge(count);
        });

        // 3. 处理右键菜单
        function setupContextMenuObserver() {
          const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
              for (const node of mutation.addedNodes) {
                if (node.nodeType === 1 && node.classList.contains('context-menu-wrapper')) {
                  if (lastRightClickedElement && lastRightClickedElement.closest('.message-content')) {
                    addTodoContextMenuItem(node);
                  }
                }
              }
            }
          });

          observer.observe(document.body, { childList: true, subtree: true });
        }
        
        document.addEventListener('mousedown', (e) => {
          if (e.button === 2) { // 右键
            lastRightClickedElement = e.target;
          }
        }, true);

        function addTodoContextMenuItem(menu) {
          const ul = menu.querySelector('ul');
          if (ul && !ul.querySelector('[data-type="add-to-todo"]')) {
            const li = document.createElement('li');
            li.innerHTML = \`<a href="javascript:;" draggable="false" data-type="add-to-todo" role="menuitem" tabindex="-1">添加到待办</a>\`;
            
            li.addEventListener('click', (e) => {
              e.stopPropagation();
              const messageBubble = lastRightClickedElement.closest('.message-content');
              if (messageBubble) {
                const messageText = messageBubble.querySelector('pre')?.innerText || '新的待办';
                window.api.addTodoFromChat(messageText);
              }
              menu.style.display = 'none';
            });

            ul.appendChild(li);
          }
        }

        // 延迟执行，等待主应用UI渲染完成
        setTimeout(() => {
          insertTodoIcon();
          setupContextMenuObserver();
        }, 3000);
      })();
    `;
  }
}
