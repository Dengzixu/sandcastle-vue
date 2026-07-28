<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElButton, ElForm, ElFormItem, ElInput, ElMessage } from 'element-plus'
import VueTurnstile from 'vue-turnstile'

import { useUserStore } from '@/stores/user'
import UserApi from '@/api/UserApi'
import { errorMessage, warningMessage } from '@/utils/message'

const siteKey = import.meta.env.VITE_CF_TURNSTILE_SITE_KEY as string

const router = useRouter()
const userStore = useUserStore()
const userApi = new UserApi(import.meta.env.VITE_SANDCASTLE_API as string)

const turnstileToken = ref('')
const requestInteractive = ref(false)
const formValue = reactive({
  email: '',
  password: '',
})
const formError = reactive({
  email: '',
  password: '',
})

const status = ref({
  loading: false,
})

const onSubmit = () => {
  status.value.loading = true

  formError.email = ''
  formError.password = ''

  if ('' === turnstileToken.value) {
    warningMessage('请完成人机验证')
    status.value.loading = false
    return
  }

  userApi
    .login(
      {
        email: formValue.email,
        password: formValue.password,
      },
      turnstileToken.value,
    )
    .then(async (response) => {
      const body = await response.json()

      if (!response.ok) {
        switch (body?.error_code) {
          case -1800_0001:
            formError.email = body.error_fields?.email
            formError.password = body.error_fields?.password
            throw new Error('输入的数据不正确')
          default:
            throw new Error(body.detail ? body.detail : '未知错误')
        }
      }

      return body
    })
    .then((body) => {
      userStore.token = body?.token

      userStore.$patch({
        userInfo: {
          id: body?.user?.id,
          uuid: body?.user?.uuid,
          username: body?.user?.username,
          email: body?.user?.email,
        },
      })

      userStore.persistence()

      ElMessage({
        message: '登录成功',
        type: 'success',
        onClose: () => {
          router.push({ name: 'home' })
        },
      })
    })
    .catch((e) => {
      status.value.loading = false
      errorMessage(`登录失败，${e.message}`)
    })
}
</script>

<template>
  <div class="login-form flex justify-center pt-[5%]">
    <el-form class="min-w-lg" label-position="top" :model="formValue">
      <div class="px-6">
        <h1 class="text-center text-2xl">登录</h1>
      </div>

      <el-form-item label="邮箱" :error="formError.email" prop="email">
        <el-input type="email" v-model="formValue.email" />
      </el-form-item>

      <el-form-item label="密码" :error="formError.password" prop="password">
        <el-input show-password type="password" v-model="formValue.password" />
      </el-form-item>

      <el-form-item label="人机验证" v-show="requestInteractive">
        <vue-turnstile
          :site-key="siteKey"
          size="flexible"
          v-model="turnstileToken"
          @before-interactive="requestInteractive = true"
        />
      </el-form-item>

      <el-form-item>
        <el-button
          type="primary"
          @click="onSubmit"
          :disabled="status.loading"
          :loading="status.loading"
          >登录</el-button
        >
      </el-form-item>
    </el-form>
  </div>
</template>
