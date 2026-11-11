import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { ElLoading, ElMessage } from 'element-plus'

import App from './App.vue'
import router from './router'
import { useUserStore } from './stores/user.ts'
import Api from './api/Api.ts'

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

// 登录态失效的统一出口：任何接口返回 401，都清空本地登录信息并回到登录页
Api.onUnauthorized = () => {
  // 并发请求可能同时收到 401，第一个处理完之后 isLogin 已经是 false，避免重复提示/跳转
  if (!userStore.isLogin) return

  const current = router.currentRoute.value

  userStore.$reset()
  ElMessage.error('登录已过期，请重新登录')

  if (current.name !== 'login' && current.name !== 'register') {
    router.push({ name: 'login', query: { redirect: current.fullPath } })
  }
}

const rootContainerID = `#${import.meta.env.VITE_SITE_TITLE}-app`

app.mount(rootContainerID)
