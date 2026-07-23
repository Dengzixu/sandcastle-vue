import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type { UserInfo } from '@/types'

const TOKEN_KEY = '__user_token__'
const USERINFO_KEY = '__user_info__'

export const useUserStore = defineStore('user', () => {
  const token = ref('')
  const userInfo = ref<UserInfo | undefined>()

  const isLogin = computed(() => token.value !== '')

  function $reset() {
    token.value = ''
    userInfo.value = undefined

    window.localStorage.removeItem(TOKEN_KEY)
    window.localStorage.removeItem(USERINFO_KEY)
  }

  function persistence() {
    if (!window.localStorage) {
      console.log('浏览器不支持 LocalStorage')
      return
    }

    if ('' !== token.value) {
      window.localStorage.setItem(TOKEN_KEY, token.value)
    }

    if (userInfo.value) {
      window.localStorage.setItem(USERINFO_KEY, JSON.stringify(userInfo.value))
    }
  }

  function recover() {
    if (!window.localStorage) {
      console.log('浏览器不支持 LocalStorage')
      return
    }

    const storedToken = window.localStorage.getItem(TOKEN_KEY)
    const storedUserInfo = window.localStorage.getItem(USERINFO_KEY)

    if (storedToken && storedUserInfo) {
      token.value = storedToken
      userInfo.value = JSON.parse(storedUserInfo) as UserInfo
    } else {
      // 数据如果损坏就清空
      window.localStorage.removeItem(TOKEN_KEY)
      window.localStorage.removeItem(USERINFO_KEY)
    }
  }

  return { token, userInfo, isLogin, $reset, persistence, recover }
})
