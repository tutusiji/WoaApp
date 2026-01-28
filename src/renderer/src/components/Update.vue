<template>
  <div class="update-container">

    
    <div class="update-header">
      <div :class="`update-badge badge-${versionInfo?.updateType || 'passive'}`">
        {{ getBadgeText() }}
      </div>
      <div class="update-icon">
        <svg width="32" height="32" fill="white" viewBox="0 0 16 16">
          <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
          <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
        </svg>
      </div>
      <h1 class="update-title">发现新版本</h1>
      <div class="version-info">
        <div class="version-item">
          <div class="version-label">当前版本</div>
          <div class="version-number">{{ versionInfo?.current || '-' }}</div>
        </div>
        <div class="version-arrow">→</div>
        <div class="version-item">
          <div class="version-label">最新版本</div>
          <div class="version-number">{{ versionInfo?.latest?.versionNumber || '-' }}</div>
        </div>
      </div>
    </div>

    <div class="update-content">
      <div v-if="versionInfo?.updateType === 'force'" class="force-update-notice show">
        <div class="notice-text">
          ⚠️ 这是一个重要的安全更新，必须更新后才能继续使用应用
        </div>
      </div>

      <div class="description-title">更新内容</div>
      <div class="update-description">
        <div class="description-text">
          {{ versionInfo?.latest?.description || '正在加载更新信息...' }}
        </div>
      </div>

      <div v-if="showProgress" class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${downloadProgress.percent}%` }"></div>
        </div>
        <div class="progress-text">{{ getProgressText() }}</div>
      </div>
    </div>

    <div class="update-actions">
      <button 
        v-if="versionInfo?.updateType !== 'force'"
        class="btn btn-secondary" 
        @click="handleCancel"
        :disabled="isUpdating"
      >
        取消
      </button>
      <button 
        class="btn btn-primary" 
        @click="handleUpdate"
        :disabled="(isUpdating && !isDownloadComplete) || isCountingDown"
      >
        <span v-if="(isUpdating && !isDownloadComplete) || isCountingDown" class="loading"></span>
        {{ getUpdateButtonText() }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// 响应式数据
const versionInfo = ref<any>(null)
const downloadProgress = ref({ percent: 0, transferred: 0, total: 0 })
const isUpdating = ref(false)
const isDownloadComplete = ref(false)
const showProgress = ref(false)
const countdown = ref(0)
const isCountingDown = ref(false)


// 获取徽章文本
const getBadgeText = () => {
  switch (versionInfo.value?.updateType) {
    case 'force':
      return '强制更新'
    case 'active':
      return '重要更新'
    case 'passive':
      return '可选更新'
    default:
      return '更新'
  }
}

// 获取进度文本
const getProgressText = () => {
  if (isCountingDown.value) {
    return `下载完成，即将开始自动更新 (${countdown.value}s)`
  }
  
  if (isDownloadComplete.value) {
    return '下载完成，点击重启并安装'
  }
  
  if (!downloadProgress.value || !downloadProgress.value.transferred || !downloadProgress.value.total) {
    return '准备下载...'
  }
  
  const transferred = (downloadProgress.value.transferred / 1024 / 1024).toFixed(1)
  const total = (downloadProgress.value.total / 1024 / 1024).toFixed(1)
  const percent = downloadProgress.value.percent || Math.round((downloadProgress.value.transferred / downloadProgress.value.total) * 100)
  return `下载中... ${transferred}MB / ${total}MB (${percent}%)`
}

// 获取更新按钮文本
const getUpdateButtonText = () => {
  if (isCountingDown.value) {
    return '自动安装中...'
  }
  if (isDownloadComplete.value) {
    return '重启并安装'
  }
  if (isUpdating.value) {
    return '开始下载'
  }
  return '立即更新'
}

// 处理取消
const handleCancel = () => {
  if (!isUpdating.value) {
    window.close()
  }
}

// 处理更新
const handleUpdate = async () => {
  console.log('handleUpdate called, isDownloadComplete:', isDownloadComplete.value)
  console.log('window.api available:', !!window.api)
  
  if (isDownloadComplete.value) {
    // 重启并安装
    if (window.api && window.api.restartAndInstall) {
      await window.api.restartAndInstall()
    } else {
      console.error('restartAndInstall API not available')
    }
    return
  }
  
  if (isUpdating.value) return
  
  isUpdating.value = true
  showProgress.value = true
  
  try {
    if (window.api && window.api.startUpdate) {
      await window.api.startUpdate()
    } else {
      console.error('startUpdate API not available, window.api:', window.api)
      // 如果 API 不可用，模拟下载进度
      simulateDownloadProgress()
    }
  } catch (error) {
    console.error('Update failed:', error)
    isUpdating.value = false
    showProgress.value = false
  }
}

// 模拟下载进度（用于调试）
const simulateDownloadProgress = () => {
  console.log('Simulating download progress...')
  let progress = 0
  const total = versionInfo.value?.latest?.fileSize || 83965427
  
  const interval = setInterval(() => {
    progress += Math.random() * 10
    if (progress > 100) progress = 100
    
    const transferred = Math.floor((progress / 100) * total)
    handleDownloadProgress(null, {
      percent: Math.floor(progress),
      transferred: transferred,
      total: total
    })
    
    if (progress >= 100) {
      clearInterval(interval)
      setTimeout(() => {
        handleUpdateDownloaded(null, {})
      }, 500)
    }
  }, 200)
}

// 监听版本信息
const handleVersionInfo = (event: any, data: any) => {
  versionInfo.value = data
}

// 监听下载进度
const handleDownloadProgress = (event: any, progress: any) => {
  console.log('Download progress received:', progress)
  
  // 如果有版本信息中的 fileSize，使用它来计算更准确的进度
  if (versionInfo.value?.latest?.fileSize && progress.transferred && progress.total) {
    const percentage = Math.round((progress.transferred / progress.total) * 100)
    downloadProgress.value = {
      ...progress,
      percent: percentage,
      transferred: progress.transferred,
      total: progress.total || versionInfo.value.latest.fileSize
    }
  } else {
    // 如果没有准确的文件大小信息，使用原始进度数据
    downloadProgress.value = progress
  }
  
  console.log('Processed download progress:', downloadProgress.value)
}

// 开始倒计时
const startCountdown = () => {
  isCountingDown.value = true
  countdown.value = 4
  
  const timer = setInterval(() => {
    countdown.value--
    
    if (countdown.value <= 0) {
      clearInterval(timer)
      isCountingDown.value = false
      // 自动启动安装程序
      handleAutoInstall()
    }
  }, 1000)
}

// 自动安装
const handleAutoInstall = async () => {
  console.log('Auto installing update...')
  if (window.api && window.api.restartAndInstall) {
    await window.api.restartAndInstall()
  } else {
    console.error('restartAndInstall API not available')
  }
}

// 监听下载开始
const handleDownloadStarted = (event: any) => {
  console.log('Download started')
  isUpdating.value = true
}

// 监听下载错误
const handleDownloadError = (event: any, errorMessage: string) => {
  console.error('Download error:', errorMessage)
  isUpdating.value = false
  // 可以在这里显示错误提示给用户
  alert(`下载失败: ${errorMessage}`)
}

// 监听下载完成
const handleUpdateDownloaded = (event: any, info: any) => {
  isDownloadComplete.value = true
  // 延迟1秒后开始倒计时，让用户看到下载完成的状态
  setTimeout(() => {
    startCountdown()
  }, 1000)
}

// 阻止强制更新时关闭窗口
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (versionInfo.value && versionInfo.value.updateType === 'force' && !isUpdating.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}



// 组件挂载
onMounted(() => {
  console.log('Update component mounted')
  console.log('window.electron available:', !!window.electron)
  console.log('window.api available:', !!window.api)
  
  // 设置IPC监听器（如果可用）
  if (window.electron && window.electron.ipcRenderer) {
    console.log('Setting up IPC listeners')
    window.electron.ipcRenderer.on('version-info', handleVersionInfo)
    window.electron.ipcRenderer.on('download-progress', handleDownloadProgress)
    window.electron.ipcRenderer.on('download-started', handleDownloadStarted)
    window.electron.ipcRenderer.on('download-error', handleDownloadError)
    window.electron.ipcRenderer.on('update-downloaded', handleUpdateDownloaded)
  } else {
    console.warn('window.electron.ipcRenderer not available, using fallback mode')
  }
  
  // 阻止强制更新时关闭窗口
  window.addEventListener('beforeunload', handleBeforeUnload)
  
  // 模拟版本信息（用于调试）
  if (!versionInfo.value) {
    versionInfo.value = {
      current: '1.0.0',
      latest: {
        versionNumber: '1.1.3',
        description: '这是一个测试更新\n\n新功能：\n- 修复了更新弹窗显示问题\n- 添加了调试工具\n- 优化了用户体验\n- 修复了 API 暴露问题',
        fileSize: 83965427
      },
      updateType: 'active'
    }
    console.log('Using fallback version info:', versionInfo.value)
  }
})

// 组件卸载
onUnmounted(() => {
  // 移除IPC监听器（如果可用）
  if (window.electron && window.electron.ipcRenderer) {
    console.log('Removing IPC listeners')
    window.electron.ipcRenderer.removeListener('version-info', handleVersionInfo)
    window.electron.ipcRenderer.removeListener('download-progress', handleDownloadProgress)
    window.electron.ipcRenderer.removeListener('download-started', handleDownloadStarted)
    window.electron.ipcRenderer.removeListener('download-error', handleDownloadError)
    window.electron.ipcRenderer.removeListener('update-downloaded', handleUpdateDownloaded)
  }
  
  // 移除事件监听器
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
/* :root{
  background-color: transparent !important;
} */
.update-container {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex;
  flex-direction: column;
}

.update-header {
  padding: 24px 24px 16px;
  text-align: center;
  position: relative;
  -webkit-app-region: drag;
}

.update-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  text-transform: uppercase;
}

.badge-force {
  background: #ff4444;
  animation: pulse 2s infinite;
}

.badge-active {
  background: #ffa500;
}

.badge-passive {
  background: #888888;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.update-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  background: linear-gradient(45deg, #667eea, #764ba2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: rotate 3s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.update-title {
  font-size: 24px;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 8px;
}

.version-info {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.version-item {
  text-align: center;
}

.version-label {
  font-size: 12px;
  color: #718096;
  margin-bottom: 4px;
}

.version-number {
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
}

.version-arrow {
  color: #667eea;
  font-size: 20px;
}

.update-content {
  padding: 0 24px 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.update-description {
  background: #f7fafc;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  border-left: 4px solid #667eea;
  max-height: 130px;
  overflow-y: auto;
}

.description-title {
  font-size: 14px;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 8px;
}

.description-text {
  font-size: 14px;
  line-height: 1.5;
  color: #4a5568;
  white-space: pre-line;
}

.progress-container {
  margin: 16px 0;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  width: 0%;
  transition: width 0.3s ease;
}

.progress-text {
  text-align: center;
  font-size: 12px;
  color: #718096;
  margin-top: 8px;
}

.update-actions {
  padding: 0 24px 24px;
  display: flex;
  gap: 12px;
  margin-top: auto;
}

.btn {
  flex: 1;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}

.btn-primary {
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  background: #e2e8f0;
  color: #4a5568;
}

.btn-secondary:hover {
  background: #cbd5e0;
}

.force-update-notice {
  background: #fed7d7;
  border: 1px solid #fc8181;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
}

.notice-text {
  font-size: 13px;
  color: #c53030;
  text-align: center;
  font-weight: 500;
}

.loading {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s ease-in-out infinite;
  margin-right: 8px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 整体滚动条样式 */
::-webkit-scrollbar {
  width: 12px; /* 滚动条的宽度 */
  height: 12px; /* 横向滚动条的高度 */
}

/* 滚动条轨道 */
::-webkit-scrollbar-track {
  background: #f4f4f4; /* 滚动条轨道的背景颜色 */
  border-radius: 6px; /* 圆角 */
}

/* 滚动条滑块 */
::-webkit-scrollbar-thumb {
  background: #888; /* 滑块的颜色 */
  border-radius: 6px; /* 圆角 */
  border: 2px solid #f4f4f4; /* 外边框，使滑块看起来有间距 */
}

/* 滑块在悬停时的样式 */
::-webkit-scrollbar-thumb:hover {
  background: #555; /* 滑块悬停时的颜色 */
}

/* 横向滚动条样式 */
::-webkit-scrollbar-horizontal {
  height: 8px; /* 横向滚动条的高度 */
}

/* 纵向滚动条样式 */
::-webkit-scrollbar-vertical {
  width: 8px; /* 纵向滚动条的宽度 */
}
</style>