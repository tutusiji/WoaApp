import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import { join } from 'path'
import packageJson from '../../package.json'
import fs from 'fs'
import https from 'https'
import http from 'http'
import path from 'path'

// 更新类型定义
export type UpdateType = 'force' | 'active' | 'passive'

// 版本信息接口
interface VersionInfo {
  _id: string
  versionNumber: string
  description: string
  projectId: string
  timestamp: string
  status: string
  downloadUrl: string
  originalFileName: string
  fileExt: string
  fileSize: number
  publishedBy: string
  updateType: UpdateType
  descriptionFileUrl: string
  descriptionFileName: string
  createdAt: string
  updatedAt: string
  __v: number
}

// API响应接口
interface ApiResponse {
  success: boolean
  data: VersionInfo
}

class AutoUpdaterManager {
  private updateWindow: BrowserWindow | null = null
  private mainWindow: BrowserWindow | null = null
  private tray: Electron.Tray | null = null
  private checkInterval: NodeJS.Timeout | null = null
  private latestVersion: VersionInfo | null = null
  private readonly API_URL = app.isPackaged 
    ? 'http://localhost:3600/api/version/latest/682039fd3de31640a7cb01bc' // 生产环境暂时使用本地API地址进行测试
    : 'http://localhost:3600/api/version/latest/682039fd3de31640a7cb01bc' // 开发环境API地址
  private readonly CHECK_INTERVAL = 5 * 1000 // 5秒（调试用）
  public updateTrayMenu: (() => void) | null = null

  constructor(mainWindow: BrowserWindow, tray: Electron.Tray) {
    this.mainWindow = mainWindow
    this.tray = tray
    this.setupIpcHandlers()
    this.setupAutoUpdater()
  }

  // 初始化自动更新
  public init(): void {
    // 立即检查一次
    this.checkForUpdates()
    
    // 设置定时检查
    this.checkInterval = setInterval(() => {
      this.checkForUpdates()
    }, this.CHECK_INTERVAL)
  }

  // 停止自动更新检查
  public destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    if (this.updateWindow && !this.updateWindow.isDestroyed()) {
      this.updateWindow.destroy()
    }
  }

  // 设置IPC处理器
  private setupIpcHandlers(): void {
    ipcMain.handle('check-for-updates', async () => {
      return await this.checkForUpdates()
    })

    ipcMain.handle('get-current-version', () => {
      return packageJson.version
    })

    ipcMain.handle('get-latest-version-info', () => {
      return this.latestVersion
    })

    ipcMain.handle('start-update', async () => {
      return await this.startUpdate()
    })

    ipcMain.handle('show-update-dialog', (_, versionInfo?: VersionInfo) => {
      const version = versionInfo || this.latestVersion
      if (version) {
        this.showUpdateDialog(version)
      } else {
        // 如果没有版本信息，创建一个调试用的版本信息
        const debugVersionInfo: VersionInfo = {
          _id: 'debug-version',
          versionNumber: '1.1.2',
          description: '这是一个调试版本，用于测试更新功能。包含以下改进：\n\n• 修复了更新弹窗显示问题\n• 优化了用户界面\n• 提升了性能',
          projectId: 'debug-project',
          timestamp: new Date().toISOString(),
          status: 'published',
          downloadUrl: 'http://localhost:3001/uploads/debug-app.exe',
          originalFileName: 'debug-app.exe',
          fileExt: '.exe',
          fileSize: 50000000,
          publishedBy: 'Debug Team',
          updateType: 'active' as const,
          descriptionFileUrl: 'http://localhost:3001/uploads/latest.yml',
          descriptionFileName: 'latest.yml',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          __v: 0
        }
        this.showUpdateDialog(debugVersionInfo)
      }
    })

    ipcMain.handle('restart-and-install', async () => {
      autoUpdater.quitAndInstall()
    })
  }

  // 设置electron-updater
  private setupAutoUpdater(): void {
    // 配置更新服务器
    if (app.isPackaged) {
      // 生产环境：暂时使用本地更新服务器进行测试
      autoUpdater.setFeedURL({
        provider: 'generic',
        url: 'http://localhost:3001/uploads/' // 生产环境暂时使用本地更新服务器进行测试
      })
    } else {
      // 开发环境：使用本地服务器
      autoUpdater.setFeedURL({
        provider: 'generic',
        url: 'http://localhost:3001/uploads/'
      })
    }

    // 自动下载更新
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true

    // 监听更新事件
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for update...')
    })

    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info)
    })

    autoUpdater.on('update-not-available', (info) => {
      console.log('Update not available:', info)
    })

    autoUpdater.on('error', (err) => {
      console.error('Update error:', err)
    })

    autoUpdater.on('download-progress', (progressObj) => {
      console.log('Download progress:', progressObj)
      // 发送进度到更新窗口
      if (this.updateWindow && !this.updateWindow.isDestroyed()) {
        this.updateWindow.webContents.send('download-progress', progressObj)
      }
    })

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info)
      // 发送下载完成事件到更新窗口
      if (this.updateWindow && !this.updateWindow.isDestroyed()) {
        this.updateWindow.webContents.send('update-downloaded', info)
      }
    })
  }

  // 检查更新
  private async checkForUpdates(): Promise<boolean> {
    try {
      console.log('Checking for updates...')
      console.log('API URL:', this.API_URL)
      console.log('App is packaged:', app.isPackaged)
      
      const response = await this.fetchVersionInfo()
      
      if (response.success && response.data) {
        this.latestVersion = response.data
        const hasUpdate = this.compareVersions(packageJson.version, response.data.versionNumber)
        
        console.log('Current version:', packageJson.version)
        console.log('Latest version:', response.data.versionNumber)
        console.log('Has update:', hasUpdate)
        
        if (hasUpdate) {
          console.log(`New version available: ${response.data.versionNumber}`)
          await this.handleUpdateAvailable(response.data)
          return true
        } else {
          console.log('No updates available')
          return false
        }
      } else {
        console.log('API response invalid:', response)
      }
    } catch (error) {
      console.error('Error checking for updates:', error)
      console.error('Error details:', error.message)
    }
    return false
  }

  // 获取版本信息
  private async fetchVersionInfo(): Promise<ApiResponse> {
    return new Promise((resolve, reject) => {
      // 根据URL协议选择http或https模块
      const isHttps = this.API_URL.startsWith('https:')
      const httpModule = isHttps ? https : http
      
      httpModule.get(this.API_URL, (res) => {
        console.log('res===================',res?.response?.data)
        console.log('res.statusCode===================',res.statusCode)
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          try {
            console.log('API response data:', data)
            const response = JSON.parse(data) as ApiResponse
            console.log('Parsed response:', response)
            resolve(response)
          } catch (error) {
            console.error('Parse error:', error)
            reject(error)
          }
        })
      }).on('error', (error) => {
        reject(error)
      })
    })
  }

  // 比较版本号
  private compareVersions(current: string, latest: string): boolean {
    const currentParts = current.split('.').map(Number)
    const latestParts = latest.split('.').map(Number)
    
    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
      const currentPart = currentParts[i] || 0
      const latestPart = latestParts[i] || 0
      
      if (latestPart > currentPart) {
        return true
      } else if (latestPart < currentPart) {
        return false
      }
    }
    return false
  }

  // 处理有更新可用
  private async handleUpdateAvailable(versionInfo: VersionInfo): Promise<void> {
    console.log('handleUpdateAvailable called with updateType:', versionInfo.updateType)
    const updateType = versionInfo.updateType
    
    switch (updateType) {
      case 'force':
        // 强制更新：立即显示更新弹窗
        this.showUpdateDialog(versionInfo)
        break
        
      case 'active':
        // 主动提醒：显示更新弹窗 + 在网页中插入动画图标 + 托盘菜单添加更新提示
        this.showUpdateDialog(versionInfo)
        this.injectUpdateIcon()
        this.updateTrayMenu?.()
        break
        
      case 'passive':
        // 被动提醒：只在托盘菜单添加更新提示
        this.updateTrayMenu?.()
        break
    }
  }

  // 显示更新弹窗
  public showUpdateDialog(versionInfo: VersionInfo): void {
    console.log('showUpdateDialog called with:', versionInfo)
    if (this.updateWindow && !this.updateWindow.isDestroyed()) {
      console.log('Update window already exists, focusing existing window')
      if (this.updateWindow.isMinimized()) {
        this.updateWindow.restore()
      }
      this.updateWindow.show()
      this.updateWindow.focus()
      return
    }
    console.log('Creating new update window')

    this.updateWindow = new BrowserWindow({
      frame:false,
      width: 480,
      height: 500,
      resizable: false,
      minimizable: true,
      maximizable: false,
      autoHideMenuBar: true,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, '../preload/index.js')
      }
    })

    // 加载更新弹窗页面
    if (app.isPackaged) {
      console.log('Loading update.html from file')
      this.updateWindow.loadFile(join(__dirname, '../renderer/update.html'))
    } else {
      console.log('Loading update.html from URL: http://localhost:5174/update.html')
      this.updateWindow.loadURL('http://localhost:5174/update.html')
    }

    // 发送版本信息到渲染进程
    this.updateWindow.webContents.once('did-finish-load', () => {
      this.updateWindow?.webContents.send('version-info', {
        current: packageJson.version,
        latest: versionInfo,
        updateType: versionInfo.updateType
      })
    })

    this.updateWindow.on('closed', () => {
      this.updateWindow = null
    })

    // 开发环境下自动打开开发者工具
    if (!app.isPackaged) {
      this.updateWindow.webContents.openDevTools({ mode: 'detach' })
    }
  }

  // 在网页中注入更新图标
  private injectUpdateIcon(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return
    
    const script = `
      (function() {
        // 移除已存在的更新图标
        const existingIcon = document.querySelector('#update-notification-icon');
        if (existingIcon) {
          existingIcon.remove();
        }
        
        // 查找sidebar-bottom元素
        const sidebarBottom = document.querySelector('.sidebar-bottom');
        if (sidebarBottom) {
          // 创建更新图标
          const updateIcon = document.createElement('div');
          updateIcon.id = 'update-notification-icon';
          updateIcon.innerHTML = '🔄';
          updateIcon.style.cssText = \`
            position: relative;
            display: inline-block;
            width: 24px;
            height: 24px;
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            border-radius: 50%;
            cursor: pointer;
            margin: 5px;
            animation: pulse 2s infinite;
            font-size: 12px;
            line-height: 24px;
            text-align: center;
            color: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          \`;
          
          // 添加动画样式
          if (!document.querySelector('#update-icon-styles')) {
            const style = document.createElement('style');
            style.id = 'update-icon-styles';
            style.textContent = \`
              @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
              }
            \`;
            document.head.appendChild(style);
          }
          
          // 点击事件
           updateIcon.addEventListener('click', function() {
             if (window.api && window.api.showUpdateDialog) {
               window.api.showUpdateDialog();
             }
           });
          
          // 插入到第一个位置
          sidebarBottom.insertBefore(updateIcon, sidebarBottom.firstChild);
          console.log('更新图标已注入到网页');
        } else {
          console.log('未找到.sidebar-bottom元素，稍后重试');
          // 5秒后重试
          setTimeout(() => {
            const retryBottom = document.querySelector('.sidebar-bottom');
            if (retryBottom && !document.querySelector('#update-notification-icon')) {
              arguments.callee();
            }
          }, 5000);
        }
      })();
    `;
    
    this.mainWindow.webContents.executeJavaScript(script).catch(err => {
      console.error('注入更新图标失败:', err)
    })
  }

  // updateTrayMenu 方法已在类属性中定义，这里不需要重复定义

  // 开始更新
  private async startUpdate(): Promise<void> {
    if (!this.latestVersion) {
      throw new Error('No update information available')
    }

    try {
      // 在开发环境中模拟下载进度
      if (!app.isPackaged) {
        console.log('Development mode: simulating download progress')
        this.simulateDownloadProgress()
        return
      }
      
      console.log('Production mode: starting real update download')
      console.log('Update server URL:', autoUpdater.getFeedURL())
      console.log('Latest version info:', this.latestVersion)
      
      // 发送开始下载状态到更新窗口
      if (this.updateWindow && !this.updateWindow.isDestroyed()) {
        this.updateWindow.webContents.send('download-started')
      }
      
      // 下载 latest.yml 文件
      await this.downloadLatestYml()
      
      // 开始下载更新
      console.log('Calling autoUpdater.downloadUpdate()')
      autoUpdater.downloadUpdate()
      
    } catch (error) {
      console.error('Error starting update:', error)
      // 发送错误信息到更新窗口
      if (this.updateWindow && !this.updateWindow.isDestroyed()) {
        this.updateWindow.webContents.send('download-error', error.message)
      }
      throw error
    }
  }

  // 模拟下载进度（开发环境使用）
  private simulateDownloadProgress(): void {
    if (!this.latestVersion || !this.updateWindow) return
    
    const fileSize = this.latestVersion.fileSize
    let transferred = 0
    const chunkSize = fileSize / 100 // 分成100步
    
    const interval = setInterval(() => {
      transferred += chunkSize + Math.random() * chunkSize * 0.5 // 随机增加一些变化
      
      if (transferred >= fileSize) {
        transferred = fileSize
        clearInterval(interval)
        
        // 发送下载完成事件
        if (this.updateWindow && !this.updateWindow.isDestroyed()) {
          this.updateWindow.webContents.send('update-downloaded', {
            version: this.latestVersion.versionNumber,
            files: [{ url: this.latestVersion.downloadUrl, size: fileSize }]
          })
        }
        console.log('Simulated download completed')
        return
      }
      
      // 发送进度事件
      const progressObj = {
        bytesPerSecond: Math.random() * 1000000 + 500000, // 随机速度
        percent: (transferred / fileSize) * 100,
        transferred: transferred,
        total: fileSize
      }
      
      console.log('Simulated download progress:', progressObj)
      
      if (this.updateWindow && !this.updateWindow.isDestroyed()) {
        this.updateWindow.webContents.send('download-progress', progressObj)
      }
    }, 200) // 每200ms更新一次进度
  }

  // 下载 latest.yml 文件
  private async downloadLatestYml(): Promise<void> {
    if (!this.latestVersion) return

    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(path.join(app.getPath('temp'), 'latest.yml'))
      const url = new URL(this.latestVersion.descriptionFileUrl)
      const httpModule = url.protocol === 'https:' ? https : http
      
      httpModule.get(this.latestVersion.descriptionFileUrl, (response) => {
        response.pipe(file)
        
        file.on('finish', () => {
          file.close()
          console.log('latest.yml downloaded successfully')
          resolve()
        })
        
        file.on('error', (err) => {
          fs.unlink(path.join(app.getPath('temp'), 'latest.yml'), () => {})
          reject(err)
        })
      }).on('error', (err) => {
        reject(err)
      })
    })
  }

  // 获取更新徽章颜色
  public getUpdateBadgeColor(updateType: UpdateType): string {
    switch (updateType) {
      case 'force':
        return '#ff4444' // 红色
      case 'active':
        return '#ffa500' // 黄色
      case 'passive':
        return '#888888' // 灰色
      default:
        return '#888888'
    }
  }

  // 手动检查更新
  public async manualCheckUpdate(): Promise<boolean> {
    return await this.checkForUpdates()
  }
}

export default AutoUpdaterManager