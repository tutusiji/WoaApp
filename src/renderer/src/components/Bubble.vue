<template>
  <div class="bubble-container" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
    <!-- 气泡头部 -->
    <div class="bubble-header">
      <div class="bubble-title">新消息</div>
      <div class="bubble-actions">
        <button class="action-btn clear-all-btn" @click="clearAllMessages" title="清除所有消息">
          ✕
        </button>
      </div>
    </div>

    <!-- 消息列表 -->
    <div class="message-list" v-if="messages.length > 0">
      <div
        v-for="(message, index) in messages"
        :key="index"
        class="message-item"
        @click="handleMessageClick(message)"
      >
        <!-- 用户头像 -->
        <div class="message-avatar">
          <img
            v-if="message.avatar && !message.avatar.startsWith('data:image')"
            :src="message.avatar"
            :alt="message.username"
            class="avatar-img"
            @error="handleAvatarError"
          />
          <img
            v-else-if="message.avatar && message.avatar.startsWith('data:image')"
            :src="message.avatar"
            :alt="message.username"
            class="avatar-img"
          />
          <div v-else class="avatar-placeholder">
            {{ getAvatarText(message.username) }}
          </div>
        </div>

        <!-- 消息内容 -->
        <div class="message-content">
          <div class="message-header">
            <span class="username">{{ message.username }}</span>
            <span class="message-time">{{ formatTime(message.timestamp) }}</span>
          </div>
          <div class="message-text">{{ message.content }}</div>
        </div>

        <!-- 未读消息数量红点 -->
        <div class="unread-badge" v-if="message.unreadCount > 0">
          {{ message.unreadCount > 99 ? '99+' : message.unreadCount }}
        </div>

        <!-- 清除单条消息按钮 -->
        <button
          class="clear-single-btn"
          @click.stop="clearSingleMessage(message)"
          title="清除此消息"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- 空状态 -->
    <div class="empty-state" v-else>
      <div class="empty-icon">📭</div>
      <div class="empty-text">暂无新消息</div>
    </div>

    <!-- 调试按钮（开发模式） -->
    <div class="debug-actions" v-if="isDev">
      <button @click="openDevtools" class="debug-btn">调试</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// 响应式数据
const messages = ref<any[]>([])
const notificationMode = ref<string>('active')
const isDev = ref(process.env.NODE_ENV === 'development')

// 处理鼠标进入
const handleMouseEnter = () => {
  if (window.bubbleAPI) {
    window.bubbleAPI.bubbleMouseEnter()
  }
}

// 处理鼠标离开
const handleMouseLeave = () => {
  if (window.bubbleAPI) {
    window.bubbleAPI.bubbleMouseLeave()
  }
}

// 处理消息点击
const handleMessageClick = (message: any) => {
  console.log('Message clicked:', message)
  if (window.bubbleAPI) {
    window.bubbleAPI.notificationClicked()
  }
}

// 清除单条消息
const clearSingleMessage = (message: any) => {
  console.log('Clear single message:', message)
  if (window.bubbleAPI) {
    window.bubbleAPI.clearSingleMessage(message)
  }
}

// 清除所有消息
const clearAllMessages = () => {
  console.log('Clear all messages')
  if (window.bubbleAPI) {
    window.bubbleAPI.clearAllMessages()
  }
}

// 打开开发者工具
const openDevtools = () => {
  if (window.bubbleAPI) {
    window.bubbleAPI.openBubbleDevtools()
  }
}

// 获取头像文字（用户名首字符）
const getAvatarText = (username: string) => {
  return username ? username.charAt(0).toUpperCase() : '?'
}

// 处理头像加载错误
const handleAvatarError = (event: Event) => {
  const target = event.target as HTMLImageElement
  target.style.display = 'none'
}

// 格式化时间
const formatTime = (timestamp: number) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) {
    // 1分钟内
    return '刚刚'
  } else if (diff < 3600000) {
    // 1小时内
    return `${Math.floor(diff / 60000)}分钟前`
  } else if (diff < 86400000) {
    // 24小时内
    return `${Math.floor(diff / 3600000)}小时前`
  } else {
    return date.toLocaleDateString()
  }
}

// 组件挂载
onMounted(() => {
  console.log('Bubble component mounted')
  console.log('window:', window)
  console.log('window.bubbleAPI:', window.bubbleAPI)
  console.log('typeof window.bubbleAPI:', typeof window.bubbleAPI)
  console.log('Object.keys(window):', Object.keys(window))

  // 组件挂载后，等待通过 bubbleAPI 接收真实消息
  console.log('Bubble component mounted, awaiting real messages via bubbleAPI.')

  let retryCount = 0
  const maxRetries = 50

  // 等待 bubbleAPI 加载
  const waitForBubbleAPI = () => {
    retryCount++
    console.log(`Waiting for bubbleAPI... attempt ${retryCount}/${maxRetries}`)

    if (window.bubbleAPI) {
      console.log('bubbleAPI found, setting up listeners...')
      console.log('bubbleAPI methods:', Object.keys(window.bubbleAPI))

      // 监听消息更新
      if (window.bubbleAPI.onUpdateMessage) {
        console.log('Setting up onUpdateMessage listener...')
        window.bubbleAPI.onUpdateMessage((newMessages: any[]) => {
          console.log('Received messages update:', newMessages)
          messages.value = newMessages || []
        })
      }

      // 监听通知模式更新
      if (window.bubbleAPI.onUpdateNotificationMode) {
        console.log('Setting up onUpdateNotificationMode listener...')
        window.bubbleAPI.onUpdateNotificationMode((mode: string) => {
          console.log('Received notification mode update:', mode)
          notificationMode.value = mode
        })
      }

      // 通知主进程气泡已准备就绪
      console.log('Calling bubbleReady()...')
      try {
        window.bubbleAPI.bubbleReady()
        console.log('bubbleReady() called successfully')
      } catch (error) {
        console.error('Error calling bubbleReady():', error)
      }
    } else {
      if (retryCount < maxRetries) {
        console.log(
          `bubbleAPI not available yet, retrying in 100ms... (${retryCount}/${maxRetries})`
        )
        setTimeout(waitForBubbleAPI, 100)
      } else {
        console.error('bubbleAPI not available after maximum retries')
        console.log('Available window properties:', Object.getOwnPropertyNames(window))
      }
    }
  }

  // 开始等待
  waitForBubbleAPI()
})

// 组件卸载
onUnmounted(() => {
  if (window.bubbleAPI) {
    window.bubbleAPI.removeAllListeners()
  }
})
</script>

<style scoped>
.bubble-container {
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.bubble-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.bubble-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.bubble-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #666;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(255, 0, 0, 0.1);
  color: #ff4444;
}

.message-list {
  max-height: calc(100% - 56px);
  overflow-y: auto;
}

.message-item {
  display: flex;
  align-items: flex-start;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
}

.message-item:hover {
  background: rgba(0, 0, 0, 0.02);
}

.message-item:hover .clear-single-btn {
  opacity: 1;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 12px;
  flex-shrink: 0;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.username {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  truncate: true;
}

.message-time {
  font-size: 11px;
  color: #999;
}

.message-text {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.unread-badge {
  position: absolute;
  top: 8px;
  right: 32px;
  background: #ff4444;
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 600;
  min-width: 16px;
  text-align: center;
}

.clear-single-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 16px;
  height: 16px;
  border: none;
  background: rgba(255, 0, 0, 0.1);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #ff4444;
  opacity: 0;
  transition: all 0.2s;
}

.clear-single-btn:hover {
  background: rgba(255, 0, 0, 0.2);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 120px;
  color: #999;
}

.empty-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.empty-text {
  font-size: 14px;
}

.debug-actions {
  position: absolute;
  bottom: 8px;
  right: 8px;
}

.debug-btn {
  padding: 4px 8px;
  font-size: 10px;
  background: rgba(0, 0, 0, 0.1);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: #666;
}

.debug-btn:hover {
  background: rgba(0, 0, 0, 0.2);
}

/* 滚动条样式 */
.message-list::-webkit-scrollbar {
  width: 4px;
}

.message-list::-webkit-scrollbar-track {
  background: transparent;
}

.message-list::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
}

.message-list::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}
</style>
