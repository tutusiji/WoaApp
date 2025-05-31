console.log('🚀 bubble.ts loaded')

// 使用静态导入
import './assets/main.css'
import { createApp } from 'vue'
import Bubble from './components/Bubble.vue'

createApp(Bubble).mount('#app')