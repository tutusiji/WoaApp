<template>
  <div class="update-controls">
    <h3>自动更新控制面板</h3>
    <div class="controls-grid">
      <div class="control-item">
        <label>当前版本:</label>
        <span class="version">{{ currentVersion }}</span>
      </div>
      
      <div class="control-item">
        <button @click="checkForUpdates" :disabled="isChecking" class="btn-primary">
          {{ isChecking ? '检查中...' : '检查更新' }}
        </button>
      </div>
      
      <div class="control-item">
        <label>更新状态:</label>
        <span class="status" :class="statusClass">{{ updateStatus }}</span>
      </div>
      
      <div class="control-item" v-if="lastCheckTime">
        <label>上次检查:</label>
        <span class="time">{{ formatTime(lastCheckTime) }}</span>
      </div>
    </div>
    
    <!-- 模拟后端API测试按钮 -->
    <div class="test-section">
      <h4>测试不同更新策略</h4>
      <div class="test-buttons">
        <button @click="simulateUpdate('forced')" class="btn-danger">
          模拟强制更新
        </button>
        <button @click="simulateUpdate('active')" class="btn-warning">
          模拟主动提示更新
        </button>
        <button @click="simulateUpdate('passive')" class="btn-info">
          模拟被动提示更新
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const currentVersion = ref('1.0.5')
const isChecking = ref(false)
const updateStatus = ref('未检查')
const lastCheckTime = ref<Date | null>(null)

const statusClass = ref('status-idle')

// 检查更新
const checkForUpdates = async () => {
  isChecking.value = true
  updateStatus.value = '检查中...'
  statusClass.value = 'status-checking'
  lastCheckTime.value = new Date()
  
  try {
    // 调用主进程的检查更新方法
    window.api?.checkForUpdates()
    
    // 模拟检查过程
    setTimeout(() => {
      isChecking.value = false
      updateStatus.value = '检查完成'
      statusClass.value = 'status-completed'
    }, 2000)
  } catch (error) {
    console.error('检查更新失败:', error)
    isChecking.value = false
    updateStatus.value = '检查失败'
    statusClass.value = 'status-error'
  }
}

// 模拟不同的更新策略
const simulateUpdate = (strategy: 'forced' | 'active' | 'passive') => {
  const mockVersionInfo = {
    version: '1.0.6',
    downloadUrl: 'https://github.com/tutusiji/WoaApp/releases/download/v1.0.6/WoaApp-1.0.6-setup.exe',
    updateStrategy: strategy,
    releaseNotes: `这是一个${strategy === 'forced' ? '强制' : strategy === 'active' ? '主动提示' : '被动提示'}更新的测试版本。\n\n更新内容：\n- 修复了一些已知问题\n- 提升了应用性能\n- 增加了新功能`,
    publishDate: new Date().toISOString()
  }
  
  console.log(`模拟${strategy}更新:`, mockVersionInfo)
  
  // 直接触发更新通知
  window.electronAPI?.send('show-passive-update-notification', mockVersionInfo)
}

// 格式化时间
const formatTime = (date: Date) => {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 获取当前版本
onMounted(async () => {
  try {
    const version = await window.api?.getCurrentVersion()
    if (version) {
      currentVersion.value = version
    }
  } catch (error) {
    console.error('获取版本信息失败:', error)
  }
})

// 监听更新事件
onMounted(() => {
  // 这里可以监听来自主进程的更新状态变化
  console.log('Update Controls mounted')
})
</script>

<style scoped>
.update-controls {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.update-controls h3 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
}

.controls-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.control-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.control-item label {
  font-size: 12px;
  font-weight: 500;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.version {
  font-size: 16px;
  font-weight: 600;
  color: #007bff;
  font-family: 'Monaco', 'Menlo', monospace;
}

.status {
  font-size: 14px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
}

.status-idle {
  background: #e9ecef;
  color: #6c757d;
}

.status-checking {
  background: #fff3cd;
  color: #856404;
}

.status-completed {
  background: #d4edda;
  color: #155724;
}

.status-error {
  background: #f8d7da;
  color: #721c24;
}

.time {
  font-size: 12px;
  color: #6c757d;
  font-family: 'Monaco', 'Menlo', monospace;
}

.btn-primary, .btn-danger, .btn-warning, .btn-info {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  background: #6c757d;
  cursor: not-allowed;
  transform: none;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
  transform: translateY(-1px);
}

.btn-warning {
  background: #ffc107;
  color: #212529;
}

.btn-warning:hover {
  background: #e0a800;
  transform: translateY(-1px);
}

.btn-info {
  background: #17a2b8;
  color: white;
}

.btn-info:hover {
  background: #138496;
  transform: translateY(-1px);
}

.test-section {
  border-top: 1px solid #dee2e6;
  padding-top: 16px;
  margin-top: 16px;
}

.test-section h4 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 14px;
  font-weight: 600;
}

.test-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .controls-grid {
    grid-template-columns: 1fr;
  }
  
  .test-buttons {
    flex-direction: column;
  }
  
  .btn-danger, .btn-warning, .btn-info {
    width: 100%;
  }
}
</style>