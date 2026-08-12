import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { ElLoading } from 'element-plus'

import App from './App.vue'
import router from './router'
import { useUserStore } from './stores/user.ts'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElLoading)

// 处理 token
const userStore = useUserStore()
userStore.recover()

userStore.$subscribe(() => {
  userStore.persistence()
})

const rootContainerID = `#${import.meta.env.VITE_SITE_TITLE}-app`

app.mount(rootContainerID)
