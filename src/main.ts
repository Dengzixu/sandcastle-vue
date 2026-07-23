import 'element-plus/dist/index.css'
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useUserStore } from './stores/user.ts'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// 处理 token
const userStore = useUserStore()
userStore.recover()

userStore.$subscribe(() => {
  userStore.persistence()
})

app.mount('#sandcastle-app')
