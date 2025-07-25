<template>
  <div v-if="showNotification" class="update-notification" :class="notificationClass">
    <div class="notification-content">
      <div class="notification-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </div>
      <div class="notification-text">
        <div class="notification-title">{{ notificationTitle }}</div>
        <div class="notification-message">{{ notificationMessage }}</div>
      </div>
      <div class="notification-actions">
        <button 
          v-if="showUpdateButton" 
          @click="handleUpdate" 
          class="btn-update"
        >
          立即更新
        </button>
        <button 
          v-if="showLaterButton" 
          @click="handleLater" 
          class="btn-later"
        >
          稍后提醒
        </button>
        <button @click="handleClose" class="btn-close">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 6.586L13.657.929a1 1 0 111.414 1.414L9.414 8l5.657 5.657a1 1 0 01-1.414 1.414L8 9.414l-5.657 5.657a1 1 0 01-1.414-1.414L6.586 8 .929 2.343A1 1 0 012.343.929L8 6.586z"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface VersionInfo {
  version: string
  downloadUrl: string
  updateStrategy: 'forced' | 'active' | 'passive'
  releaseNotes?: string
  publishDate?: string
}

const showNotification = ref(false)
const versionInfo = ref<VersionInfo | null>(null)
const notificationType = ref<'passive' | 'progress' | 'success'>('passive')
const downloadProgress = ref(0)
const isDownloading = ref(false)

const notificationClass = computed(() => ({
  'notification-passive': notificationType.value === 'passive',
  'notification-progress': notificationType.value === 'progress',
  'notification-success': notificationType.value === 'success',
}))

const notificationTitle = computed(() => {
  if (notificationType.value === 'progress') {
    return isDownloading.value ? '正在下载更新...' : '准备更新'
  }
  if (notificationType.value === 'success') {
    return '更新下载完成'
  }
  return versionInfo.value ? `发现新版本 ${versionInfo.value.version}` : '有可用更新'
})

const notificationMessage = computed(() => {
  if (notificationType.value === 'progress') {
    return isDownloading.value ? `下载进度: ${Math.round(downloadProgress.value)}%` : '正在准备下载...'
  }
  if (notificationType.value === 'success') {
    return '更新已下载完成，重启应用即可安装'
  }
  return versionInfo.value?.releaseNotes || '建议您更新以获得更好的体验'
})

const showUpdateButton = computed(() => {
  return notificationType.value === 'passive' || notificationType.value === 'success'
})

const showLaterButton = computed(() => {
  return notificationType.value === 'passive'
})

// 处理更新按钮点击
const handleUpdate = () => {
  if (notificationType.value === 'success') {
    // 重启并安装
    window.electronAPI?.send('restart-and-install-update')
  } else {
    // 开始下载更新
    window.electronAPI?.send('start-update-download', versionInfo.value)
  }
}

// 处理稍后提醒
const handleLater = () => {
  showNotification.value = false
  // 1小时后再次提醒
  setTimeout(() => {
    window.electronAPI?.send('check-for-updates')
  }, 60 * 60 * 1000)
}

// 关闭通知
const handleClose = () => {
  showNotification.value = false
}

// 显示被动更新通知
const showPassiveUpdateNotification = (info: VersionInfo) => {
  console.log('显示被动更新通知:', info)
  versionInfo.value = info
  notificationType.value = 'passive'
  showNotification.value = true
  
  // 如果是被动提示，10秒后自动隐藏
  if (info.updateStrategy === 'passive') {
    setTimeout(() => {
      if (notificationType.value === 'passive') {
        showNotification.value = false
      }
    }, 10000)
  }
}

// 显示更新进度
const showUpdateProgress = (data: { version: string; downloading: boolean }) => {
  console.log('显示更新进度:', data)
  notificationType.value = 'progress'
  isDownloading.value = data.downloading
  showNotification.value = true
}

// 更新下载进度
const updateDownloadProgress = (progress: { percent: number }) => {
  console.log('更新下载进度:', progress)
  downloadProgress.value = progress.percent
  isDownloading.value = true
}

// 隐藏更新进度
const hideUpdateProgress = () => {
  console.log('隐藏更新进度')
  showNotification.value = false
  isDownloading.value = false
  downloadProgress.value = 0
}

// 显示更新完成通知
const showUpdateComplete = () => {
  console.log('显示更新完成通知')
  notificationType.value = 'success'
  showNotification.value = true
  isDownloading.value = false
}

onMounted(() => {
  // 监听来自主进程的更新事件
  window.electronAPI?.on('show-passive-update-notification', showPassiveUpdateNotification)
  window.electronAPI?.on('show-update-progress', showUpdateProgress)
  window.electronAPI?.on('update-download-progress', updateDownloadProgress)
  window.electronAPI?.on('hide-update-progress', hideUpdateProgress)
  window.electronAPI?.on('update-download-complete', showUpdateComplete)
})

onUnmounted(() => {
  // 清理监听器
  window.electronAPI?.off('show-passive-update-notification', showPassiveUpdateNotification)
  window.electronAPI?.off('show-update-progress', showUpdateProgress)
  window.electronAPI?.off('update-download-progress', updateDownloadProgress)
  window.electronAPI?.off('hide-update-progress', hideUpdateProgress)
  window.electronAPI?.off('update-download-complete', showUpdateComplete)
})

// 暴露方法供外部调用
defineExpose({
  showPassiveUpdateNotification,
  showUpdateProgress,
  updateDownloadProgress,
  hideUpdateProgress,
  showUpdateComplete,
})
</script>

<style scoped>
.update-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  max-width: 400px;
  min-width: 300px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border-left: 4px solid #007bff;
  animation: slideInRight 0.3s ease-out;
}

.update-notification.notification-progress {
  border-left-color: #ffc107;
}

.update-notification.notification-success {
  border-left-color: #28a745;
}

.notification-content {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  gap: 12px;
}

.notification-icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  color: #007bff;
}

.notification-progress .notification-icon {
  color: #ffc107;
}

.notification-success .notification-icon {
  color: #28a745;
}

.notification-text {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-weight: 600;
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
  line-height: 1.4;
}

.notification-message {
  font-size: 13px;
  color: #666;
  line-height: 1.4;
  word-wrap: break-word;
}

.notification-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.btn-update, .btn-later {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-update {
  background: #007bff;
  color: white;
}

.btn-update:hover {
  background: #0056b3;
  transform: translateY(-1px);
}

.btn-later {
  background: #f8f9fa;
  color: #6c757d;
  border: 1px solid #dee2e6;
}

.btn-later:hover {
  background: #e9ecef;
}

.btn-close {
  padding: 4px;
  border: none;
  background: transparent;
  color: #adb5bd;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-close:hover {
  background: #f8f9fa;
  color: #6c757d;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 响应式设计 */
@media (max-width: 480px) {
  .update-notification {
    left: 20px;
    right: 20px;
    max-width: none;
  }
  
  .notification-content {
    padding: 12px;
  }
  
  .notification-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }
  
  .btn-update, .btn-later {
    width: 100%;
    text-align: center;
  }
}
</style>