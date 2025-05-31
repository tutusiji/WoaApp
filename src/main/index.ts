import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  Tray,
  nativeImage,
  Menu,
  screen,
  session,
  dialog,
  clipboard,
  Notification
} from 'electron'
const Store = require('electron-store')
import { join } from 'path'
const iconv = require('iconv-lite')
import path from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon1.png?asset'
import { reportUserBehavior } from './report'
import packageJson from '../../package.json'
import { fetchAndCacheUserInfo } from './getDepartMent'

let mainWindow: BrowserWindow | undefined | null
let bubbleWindow: BrowserWindow | null = null
let extensionWindow: BrowserWindow | null = null
let reqId: string | null = null
let tray: Tray | null = null
let isQuitting = false
const currentUserId: string | null = null
let lastMessages: any[] = []
let ses
const store = new (Store as any).default() ? new (Store as any).default() : new (Store as any)()
// 1. 初始化 notificationMode，若无则写入默认值
// let notificationMode = store.get('notificationMode', 'active')
if (!store.has('notificationMode')) {
  store.set('notificationMode', 'active')
}

// 新增：3s自动隐藏计时器
let active3sTimer: NodeJS.Timeout | null = null
const durationStay = 4100
const bubbleHideDuration = 800

// 新增一个延时隐藏的计时器变量
let bubbleHideTimer: NodeJS.Timeout | null = null

console.log('notificationMode:------------------------>', store.get('notificationMode', 'active'))

// 创建托盘
const iconPath = join(__dirname, '../../build/icon.png')
const iconActivePath = join(__dirname, '../../build/logo256_active5.png')
// const iconPath = join(__dirname, '/icon.png')
// const iconPath = path.join(__dirname, 'icon.png')
const trayIcon = nativeImage.createFromPath(iconPath)
const trayIconActive = nativeImage.createFromPath(iconActivePath)

let trayFlashInterval: NodeJS.Timeout | null = null
let trayFlashing = false

let isTrayHover = false
let isBubbleHover = false

const bubbleWidth = 260
const bubbleHeight = 180

// 设置窗口的单例模式
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
  process.exit(0)
} else {
  app.on('second-instance', (event, argv, workingDirectory) => {
    // 已有实例时，尝试让主窗口显示并置顶
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.WoaChat.app')
    app.setAppUserModelId('com.WoaChat.app')
    // ses = session.defaultSession
    ses = session.fromPartition('persist:woachat')
    await createWindow() // 创建主窗口（异步）
    createTray() // 创建托盘
    createBubbleWindow() // 创建气泡窗口

    // 设置应用名称
    // app.setName('WoaChat')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    // IPC test
    ipcMain.on('ping', () => console.log('pong'))

    ipcMain.on('update-unread-count', (event, data) => {
      console.log('Received unread count from renderer:', data)
      if (data.totalUnread === 0) {
        bubbleWindow?.hide()
      }
    })

    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.on('did-finish-load', () => {
          const currentURL = mainWindow?.webContents.getURL()
          logToGBK('did-finish-load =================', currentURL)
          // 检查是否是目标页面
          if (currentURL?.includes('woa.wps.cn/im/messages')) {
            logToGBK('Page loading complete, inject script=================')
            setTimeout(() => {
              // mainWindow?.setTitle('迪墨云')
              injectScript()
              // 此时已经登录进去了
              // 可以在这里执行其他操作，比如获取用户信息等
              fetchAndCacheUserInfo(mainWindow)
            }, 200) // 等待页面加载完成

            // setTimeout(() => {
            //   fetchAndCacheUserInfo()
            // }, 20000) // 等待页面加载完成
          }
        })

        mainWindow.webContents.on('will-redirect', (event, url) => {
          logToGBK('The page is about to redirect.:=========', url)
        })
      }
    } catch (error) {
      console.error('Error while setting up navigation listeners:', error)
    }

    // 主窗口关闭事件
    mainWindow?.on('close', (event) => {
      if (!isQuitting) {
        event.preventDefault()
        mainWindow?.hide()
      }
    })

    // 气泡窗口关闭事件
    bubbleWindow?.on('close', (event) => {
      if (!isQuitting) {
        event.preventDefault()
        bubbleWindow?.hide()
      }
    })

    ipcMain.on('hide-bubble-window', () => {
      if (bubbleWindow) {
        bubbleWindow.hide()
      }
    })

    // bubbleWindow?.on('close', (event) => {
    //   if (!isQuitting) {
    //     event.preventDefault()
    //     if (bubbleWindow && !bubbleWindow.isDestroyed()) {
    //       bubbleWindow.hide()
    //     }
    //   } else {
    //     bubbleWindow = null
    //   }
    // })

    // 添加ESC键隐藏窗口功能（针对主窗口内容）
    // mainWindow?.webContents.on('before-input-event', (event, input) => {
    //   if (input.key === 'Escape') {
    //     mainWindow?.hide()
    //     event.preventDefault()
    //   }
    // })

    app.on('activate', function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

// 检查登录状态函数
async function checkLoginStatus(session: Electron.Session): Promise<boolean> {
  try {
    console.log('Checking existing login status...')

    // 检查是否有相关的登录 cookies
    const cookies = await session.cookies.get({
      domain: '.wps.cn'
    })

    const kdocsCookies = await session.cookies.get({
      domain: '.kdocs.cn'
    })

    const allCookies = [...cookies, ...kdocsCookies]
    const hasLoginCookies = allCookies.some(
      (cookie) =>
        cookie.name.includes('token') ||
        cookie.name.includes('session') ||
        cookie.name.includes('auth') ||
        cookie.name.includes('login')
    )

    if (hasLoginCookies) {
      console.log('Found existing login cookies, user might be logged in')
      console.log('Login cookies found:', allCookies.map((c) => c.name).join(', '))
      return true
    } else {
      console.log('No login cookies found, user needs to login')
      return false
    }
  } catch (error) {
    console.error('Error checking login status:', error)
    return false
  }
}

// 主窗口创建·
async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    title: 'WoaChat',
    width: 1024,
    height: 780,
    show: false, // 先隐藏，加载完成后再显示
    autoHideMenuBar: true,
    // ...(process.platform === 'linux' ? { icon } : {}),
    // icon,
    icon: join(__dirname, '../../build/icon.png'), // 指定自定义图标
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: false, // 禁用上下文隔离
      nodeIntegration: true, // 启用 Node.js 集成
      session: ses,
      webSecurity: false, // 禁用安全策略
      partition: 'persist:woachat', // 使用持久化分区
      allowRunningInsecureContent: true, // 允许不安全内容
      experimentalFeatures: true, // 启用实验性功能
      backgroundThrottling: false, // 禁用后台节流

      nodeIntegrationInWorker: true, // 在 Worker 中启用 Node.js 集成
      nodeIntegrationInSubFrames: true // 在子框架中启用 Node.js 集成
      // webviewTag: true // 启用 webview 标签
    }
  })

  // 配置会话以允许更多的网络访问
  const session = mainWindow.webContents.session

  // 设置用户代理
  session.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  )

  // 启用持久化存储，保持登录状态
  console.log('Configuring persistent session storage...')

  // 不清除任何存储数据，保持登录状态
  // 注释掉清除存储的代码，让 cookies 和 localStorage 持久化
  // await session.clearStorageData()

  // 设置 cookies 持久化策略
  session.cookies.on('changed', (event, cookie, cause, removed) => {
    if (!removed && (cookie.domain?.includes('wps.cn') || cookie.domain?.includes('kdocs.cn'))) {
      console.log('Login cookie saved:', cookie.name, 'for domain:', cookie.domain)
    }
  })

  // 检查是否有已保存的登录状态
  await checkLoginStatus(session)

  // 允许所有权限请求
  session.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log('Permission requested:', permission)
    callback(true) // 允许所有权限
  })

  // 设置证书验证处理器
  session.setCertificateVerifyProc((request, callback) => {
    callback(0) // 接受所有证书
  })

  // 添加更多网络配置 - 完全放开限制
  session.webRequest.onBeforeSendHeaders((details, callback) => {
    // 添加必要的请求头，但不做任何限制
    details.requestHeaders['Accept'] =
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
    details.requestHeaders['Accept-Language'] = 'zh-CN,zh;q=0.9,en;q=0.8'
    details.requestHeaders['Cache-Control'] = 'no-cache'
    details.requestHeaders['Pragma'] = 'no-cache'

    // 允许所有请求通过
    callback({ requestHeaders: details.requestHeaders })
  })

  // 处理重定向 - 允许所有重定向
  session.webRequest.onBeforeRedirect((details) => {
    console.log('Redirect detected:', details.redirectURL)
    // 不阻止任何重定向
  })

  // 允许所有请求
  session.webRequest.onBeforeRequest((details, callback) => {
    console.log('Request to:', details.url)
    // 允许所有请求
    callback({})
  })

  // // 使用 webRequest 拦截 WebSocket 请求，获取 reqId
  // session.webRequest.onBeforeRequest((details, callback) => {
  //   if (
  //     details.url.startsWith('wss://woa.wps.cn/sub') ||
  //     (details.url.includes('woa.wps.cn') && details.url.includes('ws'))
  //   ) {
  //     console.log('Intercepted WebSocket URL:', details.url)
  //     const url = new URL(details.url)
  //     reqId = url.searchParams.get('req_id')
  //     console.log('Extracted req_id:=========================================', reqId)
  //   }
  //   callback({})
  // })

  // // 拦截 WebSocket 数据
  // session.webRequest.onBeforeSendHeaders((details, callback) => {
  //   if (
  //     details.url.startsWith('wss://woa.wps.cn/sub') ||
  //     (details.url.includes('woa.wps.cn') && details.url.includes('ws'))
  //   ) {
  //     console.log('Intercepted WebSocket request headers:', details.requestHeaders)
  //   }
  //   callback({ cancel: false })
  // })

  // ipcMain.handle('get-req-id', () => {
  //   console.log('Main process: Returning reqId:', reqId)
  //   return reqId // 返回当前的 reqId
  // })

  // 每次显示主窗口时上报用户行为
  mainWindow.on('focus', () => {
    console.log('mainWindow show................................')
    reportUserBehavior()
  })

  // 先尝试直接加载聊天页面，如果失败再跳转到登录页面
  const targetURL = 'https://woa.wps.cn/im/messages#/' // 直接尝试聊天页面
  console.log('Loading URL:', targetURL)

  // 添加导航监听器 - 允许所有导航
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    console.log('Will navigate to:', navigationUrl)
    // 允许所有导航，不做任何限制
  })

  // 监听新窗口创建请求 - 允许所有窗口在当前窗口打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.log('Window open requested for:', url)
    // 允许所有链接在当前窗口打开，不做任何限制
    return { action: 'allow' }
  })

  mainWindow.webContents.on('did-start-loading', () => {
    console.log('Started loading page')
  })

  mainWindow.webContents.on('did-stop-loading', () => {
    console.log('Stopped loading page')
  })

  mainWindow
    .loadURL(targetURL)
    .then(() => {
      console.log('URL loaded successfully')
      mainWindow?.show()

      // 添加网络错误监听 - 只处理真正的页面加载失败
      mainWindow?.webContents.on(
        'did-fail-load',
        (event, errorCode, errorDescription, validatedURL) => {
          console.error('Page failed to load:', {
            errorCode,
            errorDescription,
            validatedURL
          })

          // 只有在主页面加载失败时才处理，忽略页面内部的登录重定向失败
          const currentURL = mainWindow?.webContents.getURL()
          if (currentURL && currentURL.includes('woa.wps.cn/im/messages')) {
            console.log('Main chat page is loaded, ignoring internal login redirect failure')
            return // 主页面已经加载成功，忽略内部的登录重定向失败
          }
        }
      )

      // 等待页面加载完成后执行滚动操作
      mainWindow?.webContents.on('did-finish-load', () => {
        const currentURL = mainWindow?.webContents.getURL()
        console.log('Page loaded successfully:', currentURL)

        // 检查是否已经登录成功并跳转到聊天页面
        if (currentURL?.includes('woa.wps.cn/im/messages')) {
          console.log('Chat page loaded, injecting scripts...')

          // 1. 注入 CSS 隐藏滚动条
          mainWindow?.webContents
            .executeJavaScript(
              `
          const style = document.createElement('style');
          style.innerHTML = 'body { overflow: hidden !important; }';
          document.head.appendChild(style);
        `
            )
            .catch((err) => {
              console.error('Failed to inject CSS:', err)
            })

          // 滚动条滚动到最右边
          mainWindow?.webContents
            .executeJavaScript(
              `
      setTimeout(() => {
        window.scrollTo({
          left: document.body.scrollWidth,
          top: 0,
          behavior: 'smooth' // 平滑滚动
        });
      }, 1200);
    `
            )
            .catch((err) => {
              console.error('Failed to execute scroll script:', err)
            })

          // 注入脚本和获取用户信息
          setTimeout(() => {
            injectScript()
            fetchAndCacheUserInfo(mainWindow)
          }, 200)
        } else if (currentURL?.includes('account.wps.cn')) {
          console.log('Login page loaded, waiting for user to login...')

          // 检查是否已经登录成功（在用户中心页面）
          if (currentURL.includes('usercenter')) {
            console.log('User is logged in, redirecting to chat page...')
            // 延迟一下再跳转，确保登录状态已经保存
            setTimeout(() => {
              mainWindow?.loadURL('https://woa.wps.cn/im/messages#/')
            }, 2000)
          } else {
            // 添加一个检查器，定期检查是否已经跳转到用户中心或聊天页面
            const checkLoginInterval = setInterval(() => {
              const url = mainWindow?.webContents.getURL()
              if (url?.includes('usercenter')) {
                console.log('Login successful, detected usercenter page...')
                clearInterval(checkLoginInterval)
                // 延迟一下再跳转到聊天页面
                setTimeout(() => {
                  mainWindow?.loadURL('https://woa.wps.cn/im/messages#/')
                }, 2000)
              } else if (url?.includes('woa.wps.cn/im/messages')) {
                console.log('Already on chat page!')
                clearInterval(checkLoginInterval)
              }
            }, 1000)

            // 10分钟后停止检查
            setTimeout(() => {
              clearInterval(checkLoginInterval)
            }, 600000)
          }
        }
      })
    })
    .catch((err) => {
      logToGBK('Failed to load URL:===========', err)
      console.error('URL loading error details:', err)

      // 检查页面是否已经部分加载（通过检查当前URL）
      const currentURL = mainWindow?.webContents.getURL()
      if (currentURL && currentURL.includes('woa.wps.cn/im/messages')) {
        console.log('Chat page is already loaded, ignoring login redirect failure')
        return // 页面已经加载，忽略登录重定向失败
      }

      // 如果是登录重定向失败，显示提示信息
      if (err.url && err.url.includes('account.kdocs.cn')) {
        console.log('Login redirect failed, showing login instruction page')

        // 创建一个简单的 HTML 内容来显示登录提示
        const loginHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>WoaChat - 登录提示</title>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 50px;
                background: #f5f5f5;
              }
              .container {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                max-width: 500px;
                margin: 0 auto;
              }
              .btn {
                background: #007cba;
                color: white;
                padding: 10px 20px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                margin: 10px;
              }
              .btn:hover { background: #005a87; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>WoaChat 登录提示</h2>
              <p>检测到需要登录才能访问聊天页面。</p>
              <p>请先在浏览器中访问并登录：</p>
              <p><strong>https://woa.wps.cn/im/messages#/</strong></p>
              <p>登录成功后，点击下方按钮重新加载：</p>
              <button class="btn" onclick="window.location.reload()">重新加载</button>
              <button class="btn" onclick="window.electronAPI?.openExternal('https://woa.wps.cn/im/messages#/')">在浏览器中打开</button>
            </div>
          </body>
          </html>
        `

        mainWindow
          ?.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(loginHtml)}`)
          .then(() => mainWindow?.show())
      } else {
        // 如果不是登录问题，尝试备用 URL（内网地址）
        console.log('Trying alternative URL (intranet)...')
        mainWindow
          ?.loadURL('https://woa.wps.cn/im/messages#/')
          .then(() => {
            console.log('Alternative URL (intranet) loaded successfully')
            mainWindow?.show()
          })
          .catch((altErr) => {
            console.error('Alternative URL also failed:', altErr)
            // 显示错误页面或本地页面
            mainWindow
              ?.loadFile(join(__dirname, '../renderer/index.html'))
              .then(() => mainWindow?.show())
          })
      }
    })
}

// 创建气泡窗口
function createBubbleWindow(): void {
  const { workAreaSize } = screen.getPrimaryDisplay()

  // const pos = store.get('bubbleWindowPosition')
  // 创建透明、无边框且总在最前的气泡窗口
  bubbleWindow = new BrowserWindow({
    width: bubbleWidth,
    height: bubbleHeight,
    x: workAreaSize.width - bubbleWidth - 110,
    y: workAreaSize.height - bubbleHeight,
    frame: false,
    show: false,
    transparent: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    movable: true,
    webPreferences: {
      preload: join(__dirname, '../preload/bubblePreload.js'),
      nodeIntegration: true, // 启用 Node.js 集成
      contextIsolation: true, // 上下文隔离
      offscreen: false, // 启用离屏渲染
      backgroundThrottling: false, // 禁用后台节流
      session: ses,
      // additionalArguments: ['--disable-gpu-vsync'], // 降低GPU压力
      // devTools: true // 开启调试工具
      webSecurity: false // 禁用安全策略
    },
    icon: path.join(__dirname, 'icon.ico') // 自定义图标
  })

  // 禁用窗口菜单
  bubbleWindow.setMenu(null)

  console.log('Bubble window created') // 添加日志

  // 计算右下角位置
  // const { width, height } = screen.getPrimaryDisplay().workAreaSize
  // bubbleWindow.setPosition(width - 220, height - 120) // 留出一些边距
  console.log('------------env', is.dev)
  console.log('ELECTRON_RENDERER_URL:', process.env['ELECTRON_RENDERER_URL'])
  const bubbleHtmlPath = is.dev
    ? join(__dirname, '../renderer/bubble.html') // 开发环境
    : join(__dirname, '../../out/renderer/bubble.html') // 生产环境

  // 根据环境加载内容
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    // 开发模式下加载 Vite 开发服务器的 URL
    bubbleWindow
      .loadURL(`${process.env['ELECTRON_RENDERER_URL']}/bubble.html`)
      .then(() => {
        console.log('Bubble window loaded') // 添加日志
        // 设置更高层级确保气泡永远悬浮在最上层
        bubbleWindow?.setAlwaysOnTop(true, 'screen-saver')
        // bubbleWindow?.showInactive()
      })
      .catch((err) => {
        console.error('Failed to load bubble window:', err) // 添加错误日志
      })
    console.log('Loading bubble window from Vite dev server...')
  } else {
    // 生产模式下加载打包后的 HTML 文件
    bubbleWindow
      .loadFile(path.join(__dirname, '../renderer/bubble.html'))
      .then(() => {
        console.log('Bubble window loaded') // 添加日志
        // 设置更高层级确保气泡永远悬浮在最上层
        bubbleWindow?.setAlwaysOnTop(true, 'screen-saver')
        // bubbleWindow?.showInactive()
      })
      .catch((err) => {
        console.error('Failed to load bubble window:', err) // 添加错误日志
      })
    console.log('Loading bubble window from production build...')
  }

  // bubbleWindow
  //   .loadFile(bubbleHtmlPath)
  //   .then(() => {
  //     console.log('Bubble window loaded') // 添加日志
  //     // 设置更高层级确保气泡永远悬浮在最上层
  //     bubbleWindow?.setAlwaysOnTop(true, 'screen-saver')
  //     bubbleWindow?.showInactive()
  //   })
  //   .catch((err) => {
  //     console.error('Failed to load bubble window:', err) // 添加错误日志
  //   })

  // 允许拖动
  bubbleWindow.webContents.executeJavaScript(`
    document.body.style.webkitAppRegion = 'drag'
  `)
  // 可选：调试打开开发者工具
  // bubbleWindow.webContents.openDevTools()

  // 禁用鼠标右键菜单
  bubbleWindow.webContents.on('context-menu', (event) => {
    event.preventDefault()
  })

  // mainWindow?.webContents.on('did-finish-load', () => {
  //   createExtensionWindow() // 创建悬浮窗口
  // })

  // 确保窗口始终置顶
  bubbleWindow.setAlwaysOnTop(true, 'screen-saver')

  // 监听渲染进程异常  , 出错保护，防止崩溃
  bubbleWindow.webContents.on('render-process-gone', (event, details) => {
    console.log('Bubble window render process gone:', details)
    bubbleWindow?.reload()
    const pos = store.get('bubbleWindowPosition')
    if (pos) {
      bubbleWindow?.setPosition(pos.x, pos.y)
    }
  })

  // 可选：每次 did-finish-load 后都推送一次，防止漏消息
  // bubbleWindow?.webContents.on('did-finish-load', () => {
  //   if (lastMessages.length > 0) {
  //     bubbleWindow?.webContents.send('update-message', lastMessages)
  //     bubbleWindow?.showInactive() // 新消息提醒不抢焦点
  //   }
  // })

  bubbleWindow.on('move', () => {
    const [x, y] = bubbleWindow.getPosition()
    store.set('bubbleWindowPosition', { x, y })
    console.log('Bubble window moved:', x, y)
  })
}

// 创建悬浮窗口
function createExtensionWindow(): void {
  extensionWindow = new BrowserWindow({
    width: 60,
    height: 260,
    // x: mainWindow?.getBounds().x,
    // y: mainWindow ? mainWindow.getBounds().y + 100 : 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, '../preload/extensionPreload.js') // 创建一个 preload 脚本
    }
  })

  // 加载本地 HTML 文件
  extensionWindow.loadFile(join(__dirname, '../renderer/extension.html'))
  // 设置初始位置
  if (mainWindow) {
    const { x, y, width, height } = mainWindow.getBounds()
    const extensionWidth = 60
    const extensionHeight = 260
    extensionWindow.setPosition(x, y + height - extensionHeight)
  }

  // 悬浮窗口跟随主窗口移动
  mainWindow?.on('move', () => {
    if (mainWindow && extensionWindow && !extensionWindow.isDestroyed()) {
      const { x, y, width, height } = mainWindow.getBounds()
      const extensionWidth = 60
      const extensionHeight = 260
      extensionWindow.setPosition(x, y + height - extensionHeight)
    }
  })

  // 关闭悬浮窗口
  extensionWindow.on('closed', () => {
    extensionWindow = null
  })
}

// 在主进程中监听 open-feedback 事件
ipcMain.on('open-feedback', () => {
  openFeedback()
})

// 封装常用功能方法
const openUserManual: () => void = () => {
  shell.openExternal('https://www.baidu.com/')
}
const openFeedback: () => void = () => {
  const msg = `使用反馈权限开通请联系12312313213 `
  dialog
    .showMessageBox({
      type: 'info',
      title: 'WoaChat意见反馈',
      message: msg,
      buttons: ['确定', '复制内容']
    })
    .then((result) => {
      if (result.response === 1) {
        // “复制”按钮
        clipboard.writeText(msg.replace(/\n/g, '\r\n'))
      }
    })
  // new Notification({ title: '反馈', body: '请联系 XXXXXX' }).show()
}

function createTray(): void {
  // join(__dirname, '../renderer/index.html')
  // logo256_active5.png
  tray = new Tray(trayIcon)
  tray.setToolTip('迪墨云WoaChat')
  const { workAreaSize } = screen.getPrimaryDisplay()

  const devMenu = [
    {
      label: '主进程调试工具',
      click: (): void => {
        mainWindow?.webContents.openDevTools()
      }
    },
    {
      label: '消息调试工具',
      click: (): void => {
        bubbleWindow?.webContents.openDevTools({ mode: 'detach' })
      }
    }
  ]

  const contextMenuTemplate: (Electron.MenuItemConstructorOptions | Electron.MenuItem)[] = [
    {
      label: `版本${packageJson.version}`,
      click: (): void => {
        shell.openExternal('http://10.8.5.23:8081/woachat/download')
      }
    },
    {
      label: '使用手册',
      click: openUserManual // 使用手册
    },
    {
      label: '意见反馈',
      click: openFeedback // 直接调用反馈链接
    },
    {
      label: '重载WebView',
      click: (): void => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          console.log('Refreshing WebView...')
          mainWindow.webContents.reload() // 刷新 WebView
          const pos = store.get('bubbleWindowPosition')
          if (pos) {
            bubbleWindow?.setPosition(pos.x, pos.y)
          }
        }
      }
    },
    {
      label: '清除登录状态',
      click: async (): Promise<void> => {
        try {
          console.log('Clearing login status...')

          // 清除所有相关域名的 cookies
          const session = mainWindow?.webContents.session
          if (session) {
            // 清除 wps.cn 域名的 cookies
            const wpsCookies = await session.cookies.get({ domain: '.wps.cn' })
            for (const cookie of wpsCookies) {
              await session.cookies.remove(`https://${cookie.domain}`, cookie.name)
            }

            // 清除 kdocs.cn 域名的 cookies
            const kdocsCookies = await session.cookies.get({ domain: '.kdocs.cn' })
            for (const cookie of kdocsCookies) {
              await session.cookies.remove(`https://${cookie.domain}`, cookie.name)
            }

            // 清除所有存储数据
            await session.clearStorageData({
              storages: ['cookies', 'localstorage', 'indexdb', 'websql', 'cachestorage']
            })

            console.log('Login status cleared successfully')

            // 重新加载页面
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.reload()
            }
          }
        } catch (error) {
          console.error('Error clearing login status:', error)
        }
      }
    },
    {
      label: '通知方式',
      submenu: [
        {
          label: '常驻显示', // 活跃式（主动弹出）
          type: 'radio',
          checked: store.get('notificationMode') === 'active',
          click: (): void => {
            store.set('notificationMode', 'active')
            // 可选：通知主窗口刷新通知模式
            bubbleWindow?.webContents.send('update-notification-mode', 'active')
            if (active3sTimer) {
              clearTimeout(active3sTimer)
              active3sTimer = null
            }
            bubbleWindow?.showInactive()
          }
        },
        {
          label: '显示4s后消失',
          type: 'radio',
          checked: store.get('notificationMode') === 'active-3s',
          click: (): void => {
            store.set('notificationMode', 'active-3s')
            bubbleWindow?.webContents.send('update-notification-mode', 'active-3s')
            if (active3sTimer) {
              clearTimeout(active3sTimer)
              active3sTimer = null
            }
            // 不立即 show，交给后续新消息触发
            // 如果已有未读消息，立即 push 并弹窗，然后 3s 后自动消失
            if (bubbleWindow && lastMessages.length > 0) {
              bubbleWindow?.webContents.send('update-message', lastMessages)
              bubbleShowMode() // 内部会调用 showInactive() 并启动 3s 隐藏倒计时
            }
          }
        },
        {
          label: '鼠标悬停显示', // 沉浸式（被动弹出）沉浸式（悬停显示）  悬停轻提醒
          type: 'radio',
          checked: store.get('notificationMode') === 'immersive',
          click: (): void => {
            store.set('notificationMode', 'immersive')
            bubbleWindow?.webContents.send('update-notification-mode', 'immersive')
            if (active3sTimer) {
              clearTimeout(active3sTimer)
              active3sTimer = null
            }
            // 可选：通知主窗口刷新通知模式
            resetPositionBubbleWindow()
          }
        }
      ]
    },
    {
      label: '显示/隐藏气泡',
      click: async (): void => {
        if (bubbleWindow && !bubbleWindow.isDestroyed()) {
          if (bubbleWindow.isVisible()) {
            bubbleWindow.hide() // 如果气泡窗口可见，则隐藏
          } else {
            // bubbleWindow.show() // 如果气泡窗口不可见，则显示
            // showBubbleWindowBody()
            // await syncCookies()
            showBubbleWindow()
          }
        }
      }
    },
    {
      label: '显示/隐藏主界面',
      click: (): void => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (mainWindow.isVisible()) {
            mainWindow.hide() // 如果主窗口可见，则隐藏
          } else {
            mainWindow.show() // 如果主窗口不可见，则显示
          }
        }
      }
    },
    // {
    //   label: '打开气泡',
    //   click: (): void => {
    //     bubbleWindow?.showInactive()
    //   }
    // },
    // {
    //   label: '关闭气泡',
    //   click: (): void => {
    //     bubbleWindow?.hide()
    //   }
    // },
    // {
    //   label: '显示主界面',
    //   click: (): void => {
    //     mainWindow?.show() // 直接调用全局变量
    //   }
    // },
    // {
    //   label: '隐藏主界面',
    //   click: (): void => {
    //     mainWindow?.hide() // 直接调用全局变量
    //   }
    // },

    { type: 'separator' },
    {
      label: '退出',
      click: (): void => {
        console.log('退出菜单点击')
        cleanupAndQuit()
      }
    }
  ]
  if (is.dev) {
    contextMenuTemplate.unshift(...devMenu)
  }
  const contextMenu = Menu.buildFromTemplate(
    contextMenuTemplate as Electron.MenuItemConstructorOptions[]
  )

  tray.setContextMenu(contextMenu)

  // 托盘点击事件
  tray?.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore() // 如果窗口最小化，恢复窗口
      }
      if (!mainWindow.isVisible()) {
        mainWindow.show() // 如果窗口不可见，显示窗口
      }
      mainWindow.focus() // 确保窗口获得焦点
    }
  })

  // 可选：鼠标移入时显示弹窗
  tray.on('mouse-enter', () => {
    console.log('鼠标移入notificationMode==', store.get('notificationMode'))
    isTrayHover = true
    clearHideTimer() // 在托盘鼠标进入事件中也需要清除延时隐藏计时器
    const mode = store.get('notificationMode')
    // active-3s 模式下，hover 托盘时取消倒计时
    if (mode === 'active-3s' && active3sTimer) {
      clearTimeout(active3sTimer)
      active3sTimer = null
    }
    // 原有 hover 显示逻辑
    if (
      bubbleWindow &&
      !bubbleWindow.isVisible() &&
      lastMessages?.length > 0 &&
      (mode === 'immersive' || mode === 'active' || mode === 'active-3s')
    ) {
      // 先更新内容和大小，再显示
      updateBubbleContent(bubbleWindow, lastMessages, true)
      bubbleWindow.showInactive() // 不抢焦点显示
    }
  })

  // 可选：鼠标移出时隐藏弹窗
  tray.on('mouse-leave', () => {
    isTrayHover = false
    const mode = store.get('notificationMode')
    console.log('mouseleave', isTrayHover, isBubbleHover)
    if (mode === 'active' && bubbleWindow?.isVisible()) {
      // active 模式下，一旦显示就一直显示，不因 hover 离开而隐藏
      return
    }
    setTimeout(tryHideBubble, 300) // 延迟防止快速切换
  })
}

function tryHideBubble(): void {
  // 如果已经有一个计时器在运行，不重复创建
  if (bubbleHideTimer) return

  // 只有当鼠标不在托盘和气泡上时才启动隐藏计时器
  if (
    !isTrayHover &&
    !isBubbleHover &&
    bubbleWindow &&
    !bubbleWindow.isDestroyed() &&
    bubbleWindow.isVisible()
    // store.get('notificationMode') === 'immersive'
  ) {
    // 创建 1.5s 延时计时器
    bubbleHideTimer = setTimeout(() => {
      bubbleWindow?.hide()
      bubbleHideTimer = null
    }, bubbleHideDuration) // 1.5 秒延时
  }
}

// 3. 切换托盘图标的函数
function updateTrayIconByMsgCount(totalMsgCount: number): void {
  if (!tray) return
  if (totalMsgCount > 0) {
    // tray.setImage(trayIconActive)
    startTrayFlash()
  } else {
    // tray.setImage(trayIcon)
    stopTrayFlash()
  }
}

function startTrayFlash(): void {
  if (trayFlashing || !tray) return
  trayFlashing = true
  let showActive = false
  trayFlashInterval = setInterval(() => {
    tray?.setImage(showActive ? trayIconActive : trayIcon)
    showActive = !showActive
  }, 500) // 500ms切换一次
}

function stopTrayFlash(): void {
  if (trayFlashInterval) {
    clearInterval(trayFlashInterval)
    trayFlashInterval = null
  }
  trayFlashing = false
  tray?.setImage(trayIcon)
}

// 主进程监听鼠标是否进入了气泡窗口
ipcMain.on('bubble-mouse-enter', () => {
  isBubbleHover = true
  console.log('isBubbleHover----1', isBubbleHover)
  const mode = store.get('notificationMode')

  // 清除可能存在的隐藏计时器
  clearHideTimer()

  // active-3s 模式下，hover 气泡时取消倒计时
  if (mode === 'active-3s' && active3sTimer) {
    clearTimeout(active3sTimer)
    active3sTimer = null
  }
})

ipcMain.on('bubble-mouse-leave', () => {
  isBubbleHover = false
  console.log('isBubbleHover----2', isBubbleHover)
  const mode = store.get('notificationMode')
  // 活跃式常驻模式不触发自动隐藏
  // active 模式下，一旦显示就一直显示，不因 hover 离开而隐藏
  if (mode === 'active' && bubbleWindow?.isVisible()) {
    return
  }
  setTimeout(tryHideBubble, 300)
})

// 清除隐藏计时器的函数（鼠标重新进入托盘或气泡时调用）
function clearHideTimer(): void {
  if (bubbleHideTimer) {
    clearTimeout(bubbleHideTimer)
    bubbleHideTimer = null
  }
}

app.on('before-quit', () => {
  cleanupAndQuit()
})

// 监听清除单条消息事件
ipcMain.on('clear-single-message', (event, msg) => {
  console.log('Clearing single message:-----', msg)
  if (mainWindow && msg) {
    // 注意使用模板字符串传入 msg 的属性时，建议使用双引号包裹插值部分
    mainWindow.webContents.executeJavaScript(`
      try {
        function simulateFullClick(element) {
          if (!element) return;
          ['mousedown', 'mouseup', 'click'].forEach(type => {
            const evt = new MouseEvent(type, {
              bubbles: true,
              cancelable: true,
              view: window
            });
            element.dispatchEvent(evt);
          });
        }

        const wrapper = document.querySelector('.left-wrap .chat-list');
        if (wrapper) {
          wrapper.scrollTop = 0; // 滚动到顶部
        }
        // 等待 DOM 更新
        setTimeout(() => {
          const items = document.querySelectorAll('.vue-recycle-scroller__item-view');
          items.forEach(item => {
            const usernameEl = item.querySelector('.chat-name-text');
            // const timeEl = item.querySelector('.chat-time');
            const contentEl = item.querySelector('.chat-message');
            const contentElText = item.querySelector('.chat-message .content');
            if (
              usernameEl && contentElText &&
              usernameEl.textContent === "${msg.username}" &&
              contentElText.textContent.slice(0, 10) === "${msg.content}"
            ) {
              const chatItem = item.querySelector('.recent-chat-item');
              if (chatItem) {
                simulateFullClick(chatItem);
              } else {
                simulateFullClick(item);
              }
            }
          });
        }, 200); // 延时确保滚动完成后再执行
      } catch (e) {
        console.error('Error in clear-single-message script:', e);
      }
    `)
  }
})

// 清空所有消息
ipcMain.on('clear-all-messages', () => {
  console.log('Clearing all messages...')
  if (mainWindow) {
    mainWindow.webContents
      .executeJavaScript(
        `
      (function() {
        function simulateFullClick(element) {
          if (!element) return;
          ['mousedown', 'mouseup', 'click'].forEach(type => {
            const evt = new MouseEvent(type, {
              bubbles: true,
              cancelable: true,
              view: window
            });
            element.dispatchEvent(evt);
          });
        }

        function clearAll() {
          const wrapper = document.querySelector('.left-wrap .chat-list');
          if (wrapper) {
            wrapper.scrollTop = 0; // 滚动到顶部
          }

          setTimeout(() => {
            const items = document.querySelectorAll('.vue-recycle-scroller__item-view');
            let cleared = false;

            items.forEach(item => {
              const unreadEl = item.querySelector('.unread-number.unread-dot.is-fixed');
              if (unreadEl) {
                const chatItem = item.querySelector('.recent-chat-item');
                if (chatItem) {
                  simulateFullClick(chatItem);
                } else {
                  simulateFullClick(item);
                }
                cleared = true; // 标记清理成功
              }
            });

            // 如果还有未读消息，递归清理
            if (cleared) {
              console.log('Cleared some messages, checking for more...');
              setTimeout(clearAll, 200); // 延时递归调用
            } else {
              console.log('All messages cleared.');
              // 通知主进程消息已清空
              window.electronAPI && window.electronAPI.send('update-messages', []);
            }
          }, 200); // 延时确保滚动完成后再执行
        }

        clearAll();
      })();
    `
      )
      .catch((err) => {
        console.error('Failed to clear all messages:', err)
      })
  }
})
// 打开开发者工具
ipcMain.on('open-bubble-devtools', () => {
  if (bubbleWindow) {
    bubbleWindow.webContents.openDevTools({ mode: 'detach' }) // 打开开发者工具
    console.log('Main process: Opened bubble devtools')
  } else {
    console.error('Main process: Bubble window not found')
  }
})

// 监听气泡点击事件
ipcMain.on('notification-clicked', () => {
  console.log('ipcMain: notification-clicked received123')
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    if (!mainWindow.isVisible()) {
      mainWindow.show()
    }
    mainWindow.focus()
  }
})

// 注入脚本的函数
function injectScript(): void {
  mainWindow?.webContents
    .executeJavaScript(
      `
    (function() {
      const SCROLL_TIMEOUT = 200;
      const INITIAL_DELAY = 500; // 页面完全渲染后的延时
      let lastUnreadCount = 0; // 用于存储上一次的未读消息总数
      let lastPushedMessages = []; // 用于存储上一次推送的消息，避免重复推送

      // 滚动列表到顶部，确保虚拟列表加载完整
      function scrollToTop(callback) {
        const container = document.querySelector('.left-wrap .chat-list');
        if (container) {
          container.scrollTop = 0;
          console.log('Scrolled to top.');
          if (typeof callback === 'function') {
            setTimeout(callback, SCROLL_TIMEOUT); // 延时执行回调，确保滚动完成
          }
        }
      }

      function getClearAvatar(canvasEl, targetSize = 38) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = targetSize;
        tempCanvas.height = targetSize;
        const ctx = tempCanvas.getContext('2d');
        // 先填充白色背景
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, targetSize, targetSize);
        // 按比例放大绘制
        ctx.drawImage(canvasEl, 0, 0, targetSize, targetSize);
        return tempCanvas.toDataURL('image/jpeg', 0.7);
      }

      function customAvatarImgToBase64(imgEl, size = 40) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          // 填充白色背景，避免jpeg黑底
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, size, size);
          ctx.drawImage(imgEl, 0, 0, size, size);
          return canvas.toDataURL('image/jpeg', 0.7);
        } catch (e) {
          return null;
        }
      }

      // 遍历虚拟列表中所有消息节点，提取数据并推送到主进程
      function extractMessages() {
        setTimeout(() => {
          const items = document.querySelectorAll('.vue-recycle-scroller__item-view');
          let results = [];
          items.forEach(item => {
            const unreadEl = item.querySelector('.unread-number.unread-dot.is-fixed');
            const unreadText = unreadEl?.textContent?.trim();
            if (unreadEl && unreadText && !isNaN(Number(unreadText))) {
              // 优先取 img，如果没有则取 canvas 并转为 base64
              let avatar = '';
              const imgEl = item.querySelector('.chat-avatar img');
              const canvasEl = item.querySelector('.chat-avatar canvas');
              const imgUrlArr = ['/custom_avatar/', '/bucket-woa-formal/'];
              if (imgEl) {
                  // 判断是否为自定义头像链接
                if (imgUrlArr.some(urlPart => imgEl.src.includes(urlPart))) {
                  avatar = customAvatarImgToBase64(imgEl, 38);
                } else {
                  avatar = imgEl.src;
                }
              } else if (canvasEl && typeof canvasEl.toDataURL === 'function') {
                avatar = getClearAvatar(canvasEl, 38)
              }
              results.push({
                unread: unreadEl.textContent,
                avatar,
                username: item.querySelector('.chat-name-text')?.textContent || '',
                time: item.querySelector('.chat-time')?.textContent || '',
                content: item.querySelector('.message-detail .chat-message .content')?.textContent || ''
              });
            }
          });

          // 对 results 去重（以 username+content 为唯一标识）
          const seen = new Set();
          results = results.filter(msg => {
            const key = msg.username + '|' + msg.content + '|' + msg.time;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });


          // 检查是否与上次推送的数据相同，避免重复推送
          const resultsString = JSON.stringify(results);
          const lastPushedString = JSON.stringify(lastPushedMessages);
          if (resultsString !== lastPushedString) {
            lastPushedMessages = results; // 更新上次推送的数据
            window.electronAPI && window.electronAPI.send('update-messages', results);
          } else {
            console.log('No changes in messages, skipping push.');
          }
        }, SCROLL_TIMEOUT);
      }

      // 计算 .unread-count 内的数字，并推送给主进程
      function calculateUnreadCount() {
        const unreadNode = document.querySelector('.unread-count');
        let totalUnread = 0;

        if (unreadNode) {
          const count = parseInt(unreadNode.textContent || '0', 10);
          totalUnread = isNaN(count) ? 0 : count;
        } else {
          // 如果 .unread-count 不存在，表示没有新消息
          totalUnread = 0;
        }

        // 推送未读消息总数到主进程
        window.electronAPI && window.electronAPI.send('update-unread-count', { totalUnread });
        return totalUnread;
      }

      // 监听 .unread-count 的存在与数字变化
      function observeUnreadCount() {
        const unreadNode = document.querySelector('.unread-count');
        if (!unreadNode) {
          console.log('.unread-count node not found, setting unread count to 0.');
          window.electronAPI && window.electronAPI.send('update-unread-count', { totalUnread: 0 });
          window.electronAPI && window.electronAPI.send('update-messages', []); // 推送空数组
          return;
        }

        // 监听数字变化
        const observer = new MutationObserver(() => {
          const totalUnread = calculateUnreadCount();
          if (totalUnread !== lastUnreadCount) {
            lastUnreadCount = totalUnread; // 更新未读消息总数
            if (totalUnread > 0) {
              console.log('Unread count changed, scrolling to top and extracting messages.');
              scrollToTop(extractMessages); // 滚动到顶部后再提取消息
            } else {
              console.log('No unread messages, sending empty data.');
              window.electronAPI && window.electronAPI.send('update-messages', []); // 推送空数组
            }
          }
        });
        observer.observe(unreadNode, { childList: true, characterData: true, subtree: true });
        console.log('MutationObserver attached to .unread-count');
      }

      // 动态检测 .unread-count 的存在与重新绑定监听
      function monitorUnreadCount() {
        const parent = document.body; // 或更精确的父节点
        const observer = new MutationObserver(() => {
          const unreadNode = document.querySelector('.unread-count');
          if (unreadNode) {
            console.log('.unread-count node detected, attaching observer.');
            observeUnreadCount(); // 重新绑定监听
            const initialCount = calculateUnreadCount();
            if (initialCount > 0 && initialCount !== lastUnreadCount) {
              console.log('Initial unread count detected, scrolling to top and extracting messages.');
              lastUnreadCount = initialCount; // 更新未读消息总数
              scrollToTop(extractMessages); // 滚动到顶部后再提取消息
            }
          } else {
            // 如果 .unread-count 被移除，推送空数组和 0
            console.log('.unread-count node removed, sending empty data.');
            lastUnreadCount = 0; // 重置未读消息总数
            window.electronAPI && window.electronAPI.send('update-unread-count', { totalUnread: 0 });
            window.electronAPI && window.electronAPI.send('update-messages', []); // 推送空数组
          }
        });
        observer.observe(parent, { childList: true, subtree: true });
        console.log('Monitoring for .unread-count node changes.');
      }

      // 首次执行：等待页面完全渲染后开始监听
      setTimeout(() => {
        monitorUnreadCount();
      }, INITIAL_DELAY);
    })();
  `
    )
    .catch((err) => {
      console.error('Failed to inject script:', err)
    })
}

// 响应模式请求
ipcMain.on('get-current-mode', (event) => {
  const currentMode = store.get('notificationMode')
  console.log('收到模式请求，发送当前模式到气泡:', currentMode)
  event.sender.send('update-notification-mode', currentMode)
})

// 修改现有 bubble-ready 处理，确保同时发送最新模式
ipcMain.on('bubble-ready', (event) => {
  if (bubbleWindow && lastMessages.length > 0) {
    bubbleWindow?.webContents.send('update-message', lastMessages)
    // bubbleWindow?.showInactive() // 新消息提醒不抢焦点
    // 确保也发送当前通知模式
    const currentMode = store.get('notificationMode')
    bubbleWindow.webContents.send('update-notification-mode', currentMode)
    bubbleShowMode()
  }
})

function resetPositionBubbleWindow(): void {
  if (bubbleWindow) {
    // 根据消息数量计算新高度
    const messagesCount = Array.isArray(lastMessages) ? lastMessages.length : 0
    const baseHeight = 56 // 基础高度
    const perMsgHeight = 60 // 每条消息占用的高度
    const newHeight = messagesCount > 0 ? baseHeight + messagesCount * perMsgHeight : baseHeight

    // 重新设置窗口尺寸与位置，保持右下角对齐屏幕
    const { workAreaSize } = screen.getPrimaryDisplay()

    bubbleWindow.setBounds({
      x: workAreaSize.width - bubbleWidth - 110,
      y: workAreaSize.height - newHeight,
      width: bubbleWidth,
      height: newHeight
    })
  }
}

/**
 * 更新气泡窗口的内容和高度
 * @param window 气泡窗口实例
 * @param messages 消息数组
 * @param forceUpdate 是否强制更新（即使窗口不可见）
 */
function updateBubbleContent(
  window: BrowserWindow | null,
  messages: any[],
  forceUpdate: boolean = false
): void {
  if (!window || window.isDestroyed()) return

  // 计算新高度
  const messagesCount = Array.isArray(messages) ? messages.length : 0
  const baseHeight = 56 // 基础高度
  const perMsgHeight = 60 // 每条消息占用的高度
  const newHeight = messagesCount > 0 ? baseHeight + messagesCount * perMsgHeight : baseHeight

  // 更新窗口内容
  if (window.isVisible() || forceUpdate) {
    window.webContents.send('update-message', messages)
  }

  // 更新窗口尺寸和位置
  const [curX, curY] = window.getPosition()
  const { width, height: oldHeight } = window.getBounds()
  const newY = curY + oldHeight - newHeight // 新的 y 坐标 = 当前 y + 当前高度 - 新高度
  window.setBounds({ x: curX, y: newY, width, height: newHeight })
}

// 主进程监听并转发到气泡窗口
ipcMain.on('update-messages', async (event, data) => {
  console.log('Received messages from renderer:----------------', data)
  console.log('notificationMode:------------------------222', store.get('notificationMode'))

  updateTrayIconByMsgCount(data.length) // 更新托盘图标
  if (bubbleWindow) {
    // bubbleWindow.webContents.send('update-message', data) // 传递消息数据到渲染层
    // 判断消息数量是否减少（可能是点击了主窗口中的消息）
    const prevMessageCount = lastMessages.length
    const currentMessageCount = Array.isArray(data) ? data.length : 0

    // 记录最新消息
    lastMessages = data

    // 更新气泡内容和高度
    updateBubbleContent(bubbleWindow, lastMessages, false)

    // 如果有新消息，并且消息数量增加了，才弹出气泡
    if (Array.isArray(data) && data.length > 0) {
      if (currentMessageCount >= prevMessageCount) {
        // 消息数量不减少，显示气泡
        showBubbleWindow()
      } else {
        // 消息数量减少，不弹出新气泡（但如果已显示则更新内容）
        // 内容更新已在上面的 updateBubbleContent 调用中处理
      }
    } else {
      bubbleWindow?.hide()
      if (active3sTimer) {
        clearTimeout(active3sTimer)
        active3sTimer = null
      }
    }
  }
})

function isBubbleWhiteScreen(): Promise<boolean> {
  if (!bubbleWindow) return Promise.resolve(true)
  // 检查关键元素是否存在且可见
  return bubbleWindow.webContents.executeJavaScript(`
    (function() {
      const el = document.querySelector('.bubble');
      if (!el) return true;
      const style = window.getComputedStyle(el);
      // 检查背景色和可见性
      return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0' || style.backgroundColor === 'rgba(0, 0, 0, 0)';
    })()
  `)
}

function bubbleShowMode(): void {
  const mode = store.get('notificationMode')
  // 清除旧计时
  if (active3sTimer) {
    clearTimeout(active3sTimer)
    active3sTimer = null
  }

  if (mode === 'active') {
    bubbleWindow?.showInactive()
  } else if (mode === 'active-3s') {
    bubbleWindow?.showInactive()
    // 3s 后自动隐藏
    active3sTimer = setTimeout(() => {
      if (store.get('notificationMode') === 'active-3s') {
        bubbleWindow?.hide()
      }
      active3sTimer = null
    }, durationStay)
  } else {
    // immersive 模式无需主动弹出
  }
}

function showBubbleWindow(): void {
  if (!bubbleWindow) return

  if (bubbleWindow.isVisible()) {
    // 已经显示，直接更新内容
    updateBubbleContent(bubbleWindow, lastMessages, true)
    bubbleShowMode()
    // return
  } else {
    bubbleWindow?.reload()
    const pos = store.get('bubbleWindowPosition')
    if (pos) {
      bubbleWindow.setPosition(pos.x, pos.y)
    }
    bubbleWindow?.on('ready-to-show', () => {
      console.log('bubbleWindow reloaded and ready to show================reload', lastMessages)
      setTimeout(() => {
        // 已经显示，直接更新内容
        updateBubbleContent(bubbleWindow, lastMessages, true)
        bubbleShowMode()
      }, 300)
    })
  }

  // setTimeout(() => {
  //   if (!bubbleWindow || bubbleWindow.isDestroyed()) {
  //     createBubbleWindow()
  //   }
  //   bubbleWindow?.webContents.capturePage().then((image) => {
  //     const isEmpty = image.isEmpty()

  //     if (isEmpty) {
  //       bubbleWindow?.reload()
  //       // reload后，监听加载完成，再发送新的消息列表
  //       bubbleWindow?.webContents.once('did-finish-load', () => {
  //         bubbleWindow?.webContents.send('update-message', lastMessages)
  //       })
  //     } else {
  //       // 页面正常，就直接推送消息
  //       bubbleWindow?.webContents.send('update-message', lastMessages)
  //     }
  //   })
  // }, 300) // 延迟检测白屏

  // setTimeout(() => {
  //   isBubbleWhiteScreen().then((isWhite) => {
  //     if (isWhite) {
  //       bubbleWindow?.reload()
  //       bubbleWindow?.once('ready-to-show', () => {
  //         bubbleWindow?.showInactive()
  //         bubbleWindow?.webContents.send('update-message', lastMessages)
  //       })
  //     } else {
  //       bubbleWindow?.showInactive()
  //       bubbleWindow?.webContents.send('update-message', lastMessages)
  //     }
  //   })
  // }, 300)
}

// function showBubbleWindow() {
//   if (bubbleWindow) {
//     bubbleWindow.show()
//     bubbleWindow.focus()
//   }
// }
function showBubbleWindowBody() {
  if (bubbleWindow) {
    // 如果窗口处于隐藏状态，先设置透明度为0，再显示，然后淡入
    bubbleWindow.setOpacity(0)
    bubbleWindow.showInactive()
    // 通过定时器快速恢复透明度
    let opacity = 0
    const interval = setInterval(() => {
      opacity += 0.2
      if (opacity >= 1) {
        opacity = 1
        clearInterval(interval)
      }
      bubbleWindow && bubbleWindow.setOpacity(opacity)
    }, 10)
    bubbleWindow.showInactive()
    bubbleWindow.focus()
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    cleanupAndQuit()
  }
})

// mainWindow?.webContents.on('did-navigate', (_, url) => {
//   console.log('Navigated to URL:------------did-navigate=========', url)

//   // 判断是否为目标页面
//   if (url !== 'https://woa.wps.cn/im/messages#/') {
//     createBubbleWindow() // 创建气泡窗口
//   }
// })

function cleanupAndQuit(): void {
  isQuitting = true

  // 清理所有定时器
  if (active3sTimer) {
    clearTimeout(active3sTimer)
    active3sTimer = null
  }
  if (trayFlashInterval) {
    clearInterval(trayFlashInterval)
    trayFlashInterval = null
  }
  if (bubbleHideTimer) {
    clearTimeout(bubbleHideTimer)
    bubbleHideTimer = null
  }

  // 移除关键 IPC 监听 ——
  ipcMain.removeAllListeners('bubble-mouse-enter')
  ipcMain.removeAllListeners('bubble-mouse-leave')
  ipcMain.removeAllListeners('clear-single-message')
  ipcMain.removeAllListeners('clear-all-messages')
  ipcMain.removeAllListeners('update-messages')
  ipcMain.removeAllListeners('update-unread-count')
  // 按需继续 removeAllListeners 其他自定义 ipc 事件…

  // 安全销毁托盘
  try {
    if (tray) {
      // 移除托盘事件监听器
      tray.removeAllListeners()
      console.log('已移除托盘所有事件监听')
      tray.destroy()
      tray = null
      console.log('已销毁托盘图标')
    }
  } catch (err) {
    console.error('托盘清理时出错:', err)
  }

  // 安全移除窗口监听器（先检查对象有效性）
  // 窗口销毁逻辑
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.removeAllListeners()
    mainWindow.close() // 强制关闭窗口
  }
  if (bubbleWindow && !bubbleWindow.isDestroyed()) {
    // bubbleWindow.webContents.send('clear-history') // 通知渲染进程清空历史记录
    bubbleWindow.removeAllListeners()
    bubbleWindow.close()
  }

  // 延迟退出确保所有操作完成
  setTimeout(() => {
    app.quit()
  }, 100)
}

function logToGBK(...args: any[]) {
  const encodedArgs = args.map((arg) => {
    if (typeof arg === 'string') {
      return iconv.encode(arg, 'gbk').toString()
    } else if (typeof arg === 'object') {
      return iconv.encode(JSON.stringify(arg), 'utf-8').toString()
    }
    return arg
  })
  console.log(...encodedArgs)
}
