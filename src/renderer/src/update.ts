console.log('🚀 update.ts loaded')

// 使用静态导入
import './assets/main.css'
import { createApp } from 'vue'
import Update from './components/Update.vue'

createApp(Update).mount('#app')