/**
 * 表情模糊功能模块
 * 在第三方网页中插入表情按钮，点击后可以模糊/显示聊天内容
 */

import { BrowserWindow } from 'electron'

export function getEmotionBlurScript(): string {
  return `
    (function() {
      console.log('🎭 Emotion blur script loaded');

      let isBlurred = false;
      let emotionButton = null;

      // SVG 图标定义
      const FACE_B_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="none"/>' +
        '<circle cx="8.5" cy="9.5" r="1.5" fill="currentColor"/>' +
        '<circle cx="15.5" cy="9.5" r="1.5" fill="currentColor"/>' +
        '<path d="M8 15c1.5 2 3.5 2 4 2s2.5 0 4-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '</svg>';

      const FACE_C_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="none"/>' +
        '<path d="M8.5 9.5h2M13.5 9.5h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<path d="M8 15c1.5-1 3.5-1 4-1s2.5 0 4 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '</svg>';

      // 创建表情按钮
      function createEmotionButton() {
        const button = document.createElement('div');
        button.className = 'emotion-blur-button';
        button.innerHTML = FACE_B_SVG;
        button.title = '模糊/显示聊天内容';

        // 设置按钮样式
        Object.assign(button.style, {
          width: '24px',
          height: '24px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
          transition: 'all 0.2s ease',
          color: '#666',
          marginLeft: '8px'
        });

        // 悬停效果
        button.addEventListener('mouseenter', () => {
          button.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
          button.style.color = '#333';
        });

        button.addEventListener('mouseleave', () => {
          button.style.backgroundColor = 'transparent';
          button.style.color = '#666';
        });

        // 点击事件
        button.addEventListener('click', toggleBlur);

        return button;
      }

      // 切换模糊效果
      function toggleBlur() {
        console.log('🎭 Toggling blur effect, current state:', isBlurred);

        const chatMessages = document.querySelectorAll('.chat-content .chat-message');
        console.log('🎭 Found chat messages:', chatMessages.length);

        if (!isBlurred) {
          // 添加模糊效果
          chatMessages.forEach(message => {
            message.style.filter = 'blur(3px)';
            message.style.transition = 'filter 0.3s ease';
          });

          // 更换图标为 FACE_C
          if (emotionButton) {
            emotionButton.innerHTML = FACE_C_SVG;
            emotionButton.title = '显示聊天内容';
          }

          isBlurred = true;
          console.log('🎭 Applied blur effect');
        } else {
          // 移除模糊效果
          chatMessages.forEach(message => {
            message.style.filter = '';
            message.style.transition = 'filter 0.3s ease';
          });

          // 更换图标为 FACE_B
          if (emotionButton) {
            emotionButton.innerHTML = FACE_B_SVG;
            emotionButton.title = '模糊聊天内容';
          }

          isBlurred = false;
          console.log('🎭 Removed blur effect');
        }
      }

      // 插入按钮到侧边栏
      function insertEmotionButton() {
        const sidebarBottom = document.querySelector('.sidebar-bottom');

        if (!sidebarBottom) {
          console.log('🎭 Sidebar bottom not found, retrying...');
          return false;
        }

        // 检查是否已经插入过按钮
        if (document.querySelector('.emotion-blur-button')) {
          console.log('🎭 Emotion button already exists');
          return true;
        }

        emotionButton = createEmotionButton();
        sidebarBottom.appendChild(emotionButton);

        console.log('🎭 Emotion button inserted successfully');
        return true;
      }

      // 监听动态内容变化，确保新的聊天消息也能被模糊处理
      function observeChatMessages() {
        const chatContainer = document.querySelector('.chat-content');
        if (!chatContainer) {
          console.log('🎭 Chat container not found for observation');
          return;
        }

        const observer = new MutationObserver((mutations) => {
          if (isBlurred) {
            // 如果当前是模糊状态，对新添加的消息也应用模糊效果
            mutations.forEach((mutation) => {
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  const newMessages = node.querySelectorAll ? node.querySelectorAll('.chat-message') : [];
                  newMessages.forEach(message => {
                    message.style.filter = 'blur(3px)';
                    message.style.transition = 'filter 0.3s ease';
                  });

                  // 如果添加的节点本身就是 chat-message
                  if (node.classList && node.classList.contains('chat-message')) {
                    node.style.filter = 'blur(3px)';
                    node.style.transition = 'filter 0.3s ease';
                  }
                }
              });
            });
          }
        });

        observer.observe(chatContainer, {
          childList: true,
          subtree: true
        });

        console.log('🎭 Chat messages observer started');
      }

      // 初始化函数
      function init() {
        console.log('🎭 Initializing emotion blur functionality');

        // 尝试插入按钮
        if (insertEmotionButton()) {
          // 开始监听聊天消息变化
          observeChatMessages();

          console.log('🎭 Emotion blur functionality initialized successfully');
        } else {
          // 如果侧边栏还没加载完成，等待一段时间后重试
          setTimeout(init, 1000);
        }
      }

      // 等待页面加载完成后初始化
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        // 如果页面已经加载完成，延迟一下执行以确保目标元素已存在
        setTimeout(init, 500);
      }

      // 暴露全局函数供调试使用
      window.emotionBlurToggle = toggleBlur;

    })()
  `
}

/**
 * 初始化表情模糊功能
 * @param mainWindow 主窗口实例
 */
export function initEmotionBlur(mainWindow: BrowserWindow) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    console.warn('MainWindow is not available for emotion blur initialization')
    return
  }

  console.log('🎭 Initializing emotion blur functionality...')

  // 注入脚本到页面
  mainWindow.webContents
    .executeJavaScript(getEmotionBlurScript())
    .then(() => {
      console.log('🎭 Emotion blur script injected successfully')
    })
    .catch((error: Error) => {
      console.error('🎭 Failed to inject emotion blur script:', error)
    })
}
