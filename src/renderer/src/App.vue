<script setup lang="ts">
import Versions from './components/Versions.vue'
import UpdateNotification from './components/UpdateNotification.vue'
import UpdateControls from './components/UpdateControls.vue'

const ipcHandle = () => window.electron.ipcRenderer.send('ping')
</script>

<template>
  <img alt="logo" class="logo" src="./assets/logo.png" />
  <div class="creator">Powered by electron-vite123</div>
  <div class="text">
    Build an Electron app with
    <span class="vue">Vue</span>
    and
    <span class="ts">TypeScript</span>
  </div>
  <p class="tip">Please try pressing <code>F12</code> to open the devTool</p>
  <div class="actions">
    <div class="action">
      <a href="https://electron-vite.org/" target="_blank" rel="noreferrer">Documentation</a>
    </div>
    <div class="action">
      <a target="_blank" rel="noreferrer" @click="ipcHandle">Send IPC131515</a>
    </div>
  </div>
  <Versions />
  
  <!-- 自动更新测试控制面板 -->
  <UpdateControls />
  
  <!-- 自动更新通知组件 -->
  <UpdateNotification />
</template>
