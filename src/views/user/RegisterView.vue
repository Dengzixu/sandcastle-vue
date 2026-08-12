<script setup lang="ts">
import { ref } from 'vue'
import type { ComponentInstance } from 'vue'
import { useRouter } from 'vue-router'
import { ElButton, ElForm, ElFormItem, ElInput } from 'element-plus'
import VueTurnstile from 'vue-turnstile'

import UserApi from '@/api/UserApi'
import type { Register } from '@/api/UserApi'
import { errorMessage, successMessage, warningMessage } from '@/utils/message'

const TURNSTILE_SITE_KEY = import.meta.env.VITE_CF_TURNSTILE_SITE_KEY as string

const router = useRouter()
const userApi = new UserApi(import.meta.env.VITE_SANDCASTLE_API as string)

const turnstileToken = ref('')
const requestInteractive = ref(false)
const turnstileRef = ref<ComponentInstance<typeof VueTurnstile> | null>(null)

const formValue = ref<Register>({
  username: '',
  email: '',
  password: '',
  active_code: '',
})

const formError = ref({
  username: '',
  email: '',
  password: '',
  active_code: '',
})

const status = ref({
  loading: false,
})

const onSubmit = () => {
  status.value.loading = true

  formError.value.email = ''
  formError.value.password = ''

  if ('' === turnstileToken.value) {
    warningMessage('请完成人机验证')
    status.value.loading = false
    return
  }

  userApi
    .register(formValue.value, turnstileToken.value)
    .then(async (response) => {
      if (!response.ok) {
        const body = await response.json()
        switch (body?.error_code) {
          case -1800_0001:
            formError.value.email = body.error_fields?.email
            formError.value.password = body.error_fields?.password
            throw new Error('输入的数据不正确')
          case -1700_0001:
            throw new Error('人机校验失败，请刷新页面后再试')
          default:
            throw new Error(body.detail ? body.detail : '未知错误')
        }
      } else if (response.status === 204) {
        successMessage('注册成功，即将跳转至登录页面', () => {
          router.push('/login')
        })
      }
    })
    .catch((e) => {
      status.value.loading = false
      turnstileRef.value?.reset()
      errorMessage(`注册失败，${e.message}`)
    })
}
</script>

<template>
  <div class="login-form flex justify-center pt-[5%]">
    <el-form class="min-w-xs sm:min-w-lg" label-position="top" :model="formValue">
      <div class="px-6">
        <h1 class="text-center text-2xl">注册</h1>
      </div>

      <el-form-item label="用户名" :error="formError.username" prop="username">
        <el-input v-model="formValue.username" />
      </el-form-item>

      <el-form-item label="邮箱" :error="formError.email" prop="email">
        <el-input type="email" v-model="formValue.email" />
      </el-form-item>

      <el-form-item label="密码" :error="formError.password" prop="password">
        <el-input show-password type="password" v-model="formValue.password" />
      </el-form-item>

      <el-form-item label="邀请码" :error="formError.active_code" prop="active_code">
        <el-input v-model="formValue.active_code" />
      </el-form-item>

      <el-form-item label="人机验证" v-show="requestInteractive">
        <vue-turnstile
          class="w-full"
          ref="turnstileRef"
          :site-key="TURNSTILE_SITE_KEY"
          size="flexible"
          v-model="turnstileToken"
          @before-interactive="requestInteractive = true"
        />
      </el-form-item>

      <el-form-item>
        <el-button
          class="w-full"
          type="primary"
          @click="onSubmit"
          :disabled="status.loading || turnstileToken === ''"
          :loading="status.loading"
        >
          立即注册
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>
