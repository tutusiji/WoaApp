import { BrowserWindow, ipcMain, globalShortcut, clipboard, dialog, nativeImage } from 'electron'
import screenshots from 'electron-screenshots'
import fs from 'fs'

let screenshotsInstance: any = null
let isCapturing = false

/**
 * 初始化截图功能
 * @param mainWindow 主窗口
 */
export function initScreenshot(mainWindow: BrowserWindow) {
  screenshotsInstance = new screenshots()

  // 注册截图快捷键
  globalShortcut.register('Alt+Shift+A', () => {
    startScreenshot()
  })

  // 监听截图完成事件
  screenshotsInstance.on('ok', (e, buffer, bounds) => {
    // 将截图复制到剪贴板
    clipboard.writeImage(nativeImage.createFromBuffer(buffer))
    console.log('截图成功，已复制到剪贴板', bounds)
    screenshotsInstance.endCapture()
    isCapturing = false
    globalShortcut.unregister('Escape')
  })

  // 监听截图取消事件
  screenshotsInstance.on('cancel', () => {
    console.log('截图已取消')
    // The user clicked the cancel button, not pressed ESC
    isCapturing = false
    globalShortcut.unregister('Escape')
  })

  let isSaving = false
  // 监听截图保存事件
  screenshotsInstance.on('save', (e, buffer, bounds) => {
    if (isSaving) {
      return
    }
    isSaving = true
    dialog
      .showSaveDialog({
        defaultPath: `screenshot-${Date.now()}.png`,
        filters: [
          { name: 'PNG Images', extensions: ['png'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })
      .then((result) => {
        if (!result.canceled && result.filePath) {
          fs.writeFileSync(result.filePath, buffer)
          clipboard.writeImage(nativeImage.createFromBuffer(buffer))
          console.log('截图已保存并复制到剪贴板', result.filePath)
        }
      })
      .finally(() => {
        screenshotsInstance.endCapture()
        isSaving = false
        isCapturing = false
        globalShortcut.unregister('Escape')
      })
  })

  // 注入截图按钮
  injectScreenshotButton(mainWindow)
}

/**
 * 开始截图
 */
export function startScreenshot() {
  if (screenshotsInstance && !isCapturing) {
    isCapturing = true
    screenshotsInstance.startCapture()
    globalShortcut.register('Escape', () => {
      if (isCapturing) {
        console.log('Escape pressed, cancelling screenshot.')
        screenshotsInstance.endCapture()
        isCapturing = false
        globalShortcut.unregister('Escape')
      }
    })
  }
}

/**
 * 注入截图按钮到页面
 * @param mainWindow 主窗口
 */
export function injectScreenshotButton(mainWindow: BrowserWindow) {
  const script = `
    const injectButton = () => {
      const targetElement = document.querySelector('.tab-nav.tab-nav-frame');
      if (targetElement && !document.querySelector('#screenshot-button')) {
        const screenshotButton = document.createElement('div');
        screenshotButton.id = 'screenshot-button';
        screenshotButton.innerHTML = '📷';
        screenshotButton.style.cssText = 'font-size: 24px; cursor: pointer; padding: 5px; order: 999;';
        screenshotButton.title = '截图 (Alt+Shift+A)';
        screenshotButton.onclick = () => {
          window.ipcRenderer.send('start-screenshot');
        };
        targetElement.style.display = 'flex'; // 确保flex布局生效
        targetElement.appendChild(screenshotButton);
        return true;
      }
      return false;
    };

    const observer = new MutationObserver((mutations, obs) => {
      if (injectButton()) {
        obs.disconnect(); // 注入成功后停止观察
      }
    });

    // 尝试直接注入，如果失败则启动观察器
    if (!injectButton()) {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
  `;

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(script).catch(console.error);
  });
}



/**
 * 清理截图功能
 */
export function cleanupScreenshot() {
  globalShortcut.unregister('Alt+Shift+A')
  if (screenshotsInstance) {
    // screenshotsInstance.destroy() // electron-screenshots 插件没有 destroy 方法
    screenshotsInstance = null
  }
}

// 监听渲染进程的截图请求
ipcMain.on('start-screenshot', () => {
  startScreenshot()
})