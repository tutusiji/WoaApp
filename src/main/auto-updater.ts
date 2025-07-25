import { autoUpdater } from 'electron-updater'
import { BrowserWindow, dialog, shell } from 'electron'
import { EventEmitter } from 'events'
import packageJson from '../../package.json'

// 更新策略类型
export type UpdateStrategy = 'forced' | 'active' | 'passive'

// 版本信息接口
export interface VersionInfo {
  version: string
  downloadUrl: string
  updateStrategy: UpdateStrategy
  releaseNotes?: string
  publishDate?: string
}

// 更新状态事件
export interface UpdateEvents {
  'checking-for-update': () => void
  'update-available': (info: VersionInfo) => void
  'update-not-available': () => void
  'update-downloaded': () => void
  'error': (error: Error) => void
  'download-progress': (progress: { percent: number, bytesPerSecond: number, total: number, transferred: number }) => void
}

export class AutoUpdaterService extends EventEmitter {
  private mainWindow: BrowserWindow | null = null
  private backendApiUrl: string
  private isUpdating = false
  private updateCheckInterval: NodeJS.Timeout | null = null

  constructor(backendApiUrl: string = 'https://api.example.com/check-update') {
    super()
    this.backendApiUrl = backendApiUrl
    this.setupAutoUpdater()
  }

  // 设置主窗口引用
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  // 设置后端API地址
  setBackendApiUrl(url: string): void {
    this.backendApiUrl = url
  }

  // 初始化自动更新器
  private setupAutoUpdater(): void {
    // 配置更新器选项
    autoUpdater.autoDownload = false // 不自动下载，让用户选择
    autoUpdater.autoInstallOnAppQuit = true // 退出时自动安装

    // 监听更新事件
    autoUpdater.on('checking-for-update', () => {
      console.log('正在检查更新...')
      this.emit('checking-for-update')
    })

    autoUpdater.on('update-available', (info) => {
      console.log('发现可用更新:', info)
      this.handleUpdateAvailable(info)
    })

    autoUpdater.on('update-not-available', () => {
      console.log('当前已是最新版本')
      this.emit('update-not-available')
    })

    autoUpdater.on('error', (error) => {
      console.error('自动更新错误:', error)
      this.emit('error', error)
      this.isUpdating = false
    })

    autoUpdater.on('download-progress', (progress) => {
      console.log(`下载进度: ${Math.round(progress.percent)}%`)
      this.emit('download-progress', progress)
      
      // 向渲染进程发送进度更新
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('update-download-progress', progress)
      }
    })

    autoUpdater.on('update-downloaded', () => {
      console.log('更新下载完成')
      this.emit('update-downloaded')
      this.isUpdating = false
      this.handleUpdateDownloaded()
    })
  }

  // 从后端API检查更新
  async checkForUpdatesFromBackend(): Promise<VersionInfo | null> {
    try {
      console.log('从后端API检查更新:', this.backendApiUrl)
      
      const response = await fetch(this.backendApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentVersion: packageJson.version,
          platform: process.platform,
          arch: process.arch,
        }),
      })

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`)
      }

      const versionInfo: VersionInfo = await response.json()
      
      // 检查是否有新版本
      if (this.isNewerVersion(versionInfo.version, packageJson.version)) {
        console.log('发现新版本:', versionInfo)
        this.emit('update-available', versionInfo)
        return versionInfo
      } else {
        console.log('当前已是最新版本')
        this.emit('update-not-available')
        return null
      }
    } catch (error) {
      console.error('检查更新失败:', error)
      this.emit('error', error as Error)
      return null
    }
  }

  // 检查标准更新（使用electron-updater）
  async checkForUpdates(): Promise<void> {
    if (this.isUpdating) {
      console.log('更新检查正在进行中...')
      return
    }

    this.isUpdating = true
    
    try {
      // 首先尝试从后端API检查
      const versionInfo = await this.checkForUpdatesFromBackend()
      
      if (versionInfo) {
        // 如果后端有更新信息，处理更新策略
        await this.handleUpdateStrategy(versionInfo)
      } else {
        // 如果后端没有更新，尝试标准的electron-updater检查
        await autoUpdater.checkForUpdates()
      }
    } catch (error) {
      console.error('检查更新失败:', error)
      this.emit('error', error as Error)
    } finally {
      this.isUpdating = false
    }
  }

  // 处理更新策略
  private async handleUpdateStrategy(versionInfo: VersionInfo): Promise<void> {
    console.log('处理更新策略:', versionInfo.updateStrategy)

    switch (versionInfo.updateStrategy) {
      case 'forced':
        await this.handleForcedUpdate(versionInfo)
        break
      case 'active':
        await this.handleActiveUpdate(versionInfo)
        break
      case 'passive':
        await this.handlePassiveUpdate(versionInfo)
        break
      default:
        console.warn('未知的更新策略:', versionInfo.updateStrategy)
    }
  }

  // 强制更新
  private async handleForcedUpdate(versionInfo: VersionInfo): Promise<void> {
    const result = await dialog.showMessageBox(this.mainWindow || ({} as BrowserWindow), {
      type: 'warning',
      title: '强制更新',
      message: `发现新版本 ${versionInfo.version}，必须更新才能继续使用`,
      detail: versionInfo.releaseNotes || '请立即更新到最新版本',
      buttons: ['立即更新', '退出应用'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    })

    if (result.response === 0) {
      // 立即更新
      await this.downloadAndInstallUpdatePrivate(versionInfo)
    } else {
      // 退出应用
      process.exit(0)
    }
  }

  // 主动提示更新
  private async handleActiveUpdate(versionInfo: VersionInfo): Promise<void> {
    const result = await dialog.showMessageBox(this.mainWindow || ({} as BrowserWindow), {
      type: 'info',
      title: '发现新版本',
      message: `发现新版本 ${versionInfo.version}`,
      detail: versionInfo.releaseNotes || '建议您更新到最新版本以获得更好的体验',
      buttons: ['立即更新', '稍后提醒', '忽略此版本'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    })

    switch (result.response) {
      case 0:
        // 立即更新
        await this.downloadAndInstallUpdatePrivate(versionInfo)
        break
      case 1:
        // 稍后提醒（1小时后再次检查）
        setTimeout(() => {
          this.checkForUpdates()
        }, 60 * 60 * 1000)
        break
      case 2:
        // 忽略此版本
        console.log('用户选择忽略版本:', versionInfo.version)
        break
    }
  }

  // 被动提示更新（系统托盘通知）
  private async handlePassiveUpdate(versionInfo: VersionInfo): Promise<void> {
    // 发送到渲染进程显示被动通知
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('show-passive-update-notification', versionInfo)
    }
    
    console.log('被动更新通知已发送:', versionInfo.version)
  }

  // 下载并安装更新（公开方法）
  async downloadAndInstallUpdate(versionInfo?: VersionInfo): Promise<void> {
    try {
      console.log('开始下载更新...')
      
      // 显示下载进度对话框
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('show-update-progress', {
          version: versionInfo?.version || 'unknown',
          downloading: true,
        })
      }

      // 如果有自定义下载URL，使用shell打开下载页面  
      if (versionInfo?.downloadUrl && versionInfo.downloadUrl !== 'auto') {
        const result = await dialog.showMessageBox(this.mainWindow || ({} as BrowserWindow), {
          type: 'question',
          title: '下载更新',
          message: '将打开下载页面，请手动下载并安装更新包',
          buttons: ['打开下载页面', '取消'],
          defaultId: 0,
          cancelId: 1,
        })

        if (result.response === 0) {
          shell.openExternal(versionInfo.downloadUrl)
        }
        return
      }

      // 使用electron-updater下载
      await autoUpdater.downloadUpdate()
      
    } catch (error) {
      console.error('下载更新失败:', error)
      
      await dialog.showErrorBox('更新失败', `下载更新时发生错误: ${error}`)
      
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('hide-update-progress')
      }
    }
  }

  // 下载并安装更新（私有方法，保持向后兼容）
  private async downloadAndInstallUpdatePrivate(versionInfo: VersionInfo): Promise<void> {
    return this.downloadAndInstallUpdate(versionInfo)
  }

  // 处理更新可用事件
  private handleUpdateAvailable(info: any): void {
    console.log('收到更新可用事件:', info)
    this.emit('update-available', {
      version: info.version,
      downloadUrl: 'auto', // 使用electron-updater自动下载
      updateStrategy: 'active', // 默认为主动提示
      releaseNotes: info.releaseNotes,
      publishDate: info.releaseDate,
    } as VersionInfo)
  }

  // 处理更新下载完成
  private async handleUpdateDownloaded(): Promise<void> {
    const result = await dialog.showMessageBox(this.mainWindow || ({} as BrowserWindow), {
      type: 'info',
      title: '更新已下载',
      message: '更新已下载完成，需要重启应用来完成安装',
      buttons: ['立即重启', '稍后重启'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    })

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('hide-update-progress')
    }

    if (result.response === 0) {
      // 立即重启并安装
      autoUpdater.quitAndInstall()
    }
  }

  // 版本比较工具
  private isNewerVersion(newVersion: string, currentVersion: string): boolean {
    const parseVersion = (version: string): number[] => {
      return version.replace(/[^\d.]/g, '').split('.').map(Number)
    }

    const newV = parseVersion(newVersion)
    const currentV = parseVersion(currentVersion)

    for (let i = 0; i < Math.max(newV.length, currentV.length); i++) {
      const n = newV[i] || 0
      const c = currentV[i] || 0
      if (n > c) return true
      if (n < c) return false
    }
    return false
  }

  // 启动定期检查更新
  startPeriodicCheck(intervalMs: number = 4 * 60 * 60 * 1000): void { // 默认4小时
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval)
    }

    this.updateCheckInterval = setInterval(() => {
      console.log('定期检查更新...')
      this.checkForUpdates()
    }, intervalMs)

    console.log(`已启动定期更新检查，间隔: ${intervalMs / 1000 / 60} 分钟`)
  }

  // 停止定期检查
  stopPeriodicCheck(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval)
      this.updateCheckInterval = null
    }
  }

  // 手动触发更新检查
  async manualCheckForUpdates(): Promise<void> {
    console.log('手动检查更新...')
    await this.checkForUpdates()
  }

  // 获取当前版本
  getCurrentVersion(): string {
    return packageJson.version
  }

  // 清理资源
  cleanup(): void {
    this.stopPeriodicCheck()
    this.removeAllListeners()
  }
}