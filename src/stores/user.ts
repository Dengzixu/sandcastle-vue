import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type { UserInfo } from '@/types'

const TOKEN_KEY = '__user_token__'
const USERINFO_KEY = '__user_info__'

// localStorage 在隐私模式、禁用 Cookie 等场景下可能直接抛异常，读写都要兜住
const readStorage = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

const writeStorage = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // 写入失败（隐私模式 / 配额不足）只影响持久化，当前会话仍然可用
  }
}

const removeStorage = (key: string) => {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // 同上
  }
}

const clearStorage = () => {
  removeStorage(TOKEN_KEY)
  removeStorage(USERINFO_KEY)
}

// 本地数据可能被手动改动或来自旧版本，解析后必须校验结构
const isUserInfo = (value: unknown): value is UserInfo => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const info = value as Partial<UserInfo>

  return (
    typeof info.id === 'number' &&
    typeof info.uuid === 'string' &&
    typeof info.username === 'string' &&
    typeof info.email === 'string'
  )
}

export const useUserStore = defineStore('user', () => {
  const token = ref('')
  const userInfo = ref<UserInfo | undefined>()

  const isLogin = computed(() => token.value !== '')

  function $reset() {
    token.value = ''
    userInfo.value = undefined

    clearStorage()
  }

  function persistence() {
    if (token.value !== '') {
      writeStorage(TOKEN_KEY, token.value)
    }

    if (userInfo.value) {
      writeStorage(USERINFO_KEY, JSON.stringify(userInfo.value))
    }
  }

  function recover() {
    const storedToken = readStorage(TOKEN_KEY)
    const storedUserInfo = readStorage(USERINFO_KEY)

    if (!storedToken || !storedUserInfo) {
      clearStorage()
      return
    }

    let info: unknown

    try {
      info = JSON.parse(storedUserInfo)
    } catch {
      // 数据损坏：清空后按未登录处理，避免启动阶段抛错导致白屏
      clearStorage()
      return
    }

    if (!isUserInfo(info)) {
      clearStorage()
      return
    }

    token.value = storedToken
    userInfo.value = info
  }

  return { token, userInfo, isLogin, $reset, persistence, recover }
})
