import { BrowserWindow } from 'electron'
const Store = require('electron-store')

const store = new Store()

export function fetchAndCacheUserInfo(mainWindow: BrowserWindow | null | undefined) {
  if (!mainWindow) {
    console.warn('mainWindow is not available for fetchAndCacheUserInfo')
    return
  }

  // 从页面中获取用户信息
  mainWindow.webContents
    .executeJavaScript(
      `
    (function() {
      try {
        const userNameEl = document.querySelector('.user-name');
        const userAvatarEl = document.querySelector('.user-avatar img');

        if (!userNameEl || !userAvatarEl) {
          return null;
        }

        const userInfo = {
          name: userNameEl.textContent.trim(),
          avatar: userAvatarEl.src
        };
        return userInfo;
      } catch (error) {
        console.error('Error extracting user info:', error);
        return null;
      }
    })();
  `
    )
    .then((userInfo) => {
      if (userInfo) {
        // 缓存用户信息
        store.set('userInfo', userInfo)
        console.log('User info cached:', userInfo)
      } else {
        console.warn('Failed to extract user info from page')
      }
    })
    .catch((error) => {
      console.error('Error executing JavaScript for user info:', error)
    })
}
