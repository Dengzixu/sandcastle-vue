<script setup lang="ts">
import { h, reactive, ref, render } from 'vue'
import { useRouter } from 'vue-router'
import {
  ElAlert,
  ElButton,
  ElCard,
  ElCheckbox,
  ElCheckboxGroup,
  ElDivider,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElOption,
  ElProgress,
  ElSelect,
} from 'element-plus'
import { useUserStore } from '@/stores/user'
import { FakeProgress } from '@/utils/FakeProgress'
import FileApi from '@/api/FileApi'
import { errorMessage } from '@/utils/message'

const siteTitle = import.meta.env.VITE_SITE_TITLE

const router = useRouter()
const userStore = useUserStore()
const fileApi = new FileApi(import.meta.env.VITE_SANDCASTLE_API as string)

const fake = reactive(new FakeProgress({ timeConstant: 10000 }))

const file = ref<File | undefined>(undefined)
const onUpload = ref(false)
const formValue = reactive({
  flags: [],
  validityPeriod: 1,
  password: '',
})

const handleChooseFile = () => {
  const input = document.querySelector('#choose-file') as HTMLInputElement
  input?.click()
}

const handleChange = (event: Event) => {
  const input = event.target as HTMLInputElement

  if (!input.files) {
    return
  } else if (!input.files[0]?.type?.startsWith('image')) {
    errorMessage('目前只支持图片文件')
    return
  }

  file.value = input.files[0]

  render(
    h(ElAlert, { type: 'success', closable: false }, () => file.value!.name),
    document.querySelector('#FHfcfas')!,
  )
}

const handlePublish = () => {
  if (!userStore.isLogin) {
    errorMessage('尚未登录，请登录后再试。')
    return
  } else if (!file.value) {
    errorMessage('未选择文件，请先选择文件。')
    return
  }

  // 计算 flag
  let flag = 0

  formValue.flags.forEach((i) => {
    flag |= i
  })

  // 开始处理上传过程
  onUpload.value = true
  fake.start()

  fileApi
    .upload(file.value!, userStore.token)
    // 上传文件
    .then(async (response) => {
      const body = await response.json()
      if (!response.ok) {
        switch (body?.code) {
          case -1000_1000:
            userStore.$reset()
          default:
            throw new Error(body?.detail)
        }
      }
      return body
    })
    .then((body) => {
      const fileUuid = body?.file_uuid

      return fileApi.publish(
        {
          file_uuid: fileUuid,
          flag: flag,
          password: formValue.password,
          validity_period: formValue.validityPeriod,
        },
        userStore.token,
      )
    })
    .then(async (response) => {
      const body = await response.json()
      if (!response.ok) {
        switch (body?.code) {
          case -1000_1000:
            userStore.$reset()
          default:
            throw new Error(body?.detail)
        }
      }

      return body
    })
    .then((body) => {
      ElMessage({
        message: '文件上传成功，5秒后跳转至详情页',
        type: 'success',
        duration: 5 * 1000,
        onClose: () => {
          router.push({ name: 'file', params: { id: body?.file_uuid } })
        },
      })
    })
    .catch((e) => {
      errorMessage(`文件上传失败, ${e}`)
      onUpload.value = false
    })
    .finally(() => {
      fake.end()
    })
}
</script>

<template>
  <main>
    <div class="container mx-auto">
      <p class="mt-[10vh] mb-8 text-center text-3xl font-semibold tracking-tight sm:text-4xl">
        {{ siteTitle }} 临时文件分享
      </p>
      <el-card class="mx-auto w-full max-w-3xl rounded-xl" shadow="hover">
        <div class="py-6 text-center">
          <p class="mb-4 text-base text-gray-700 sm:text-lg">
            将文件拖入区域，或选择要
            <el-button @click="handleChooseFile" class="font-bold">
              <span class="icon-[material-symbols--upload] mr-1"></span>
              上传
            </el-button>
            的文件
          </p>

          <div id="FHfcfas"></div>

          <input id="choose-file" class="hidden" type="file" @change="handleChange" />

          <el-divider border-style="dashed" />
        </div>

        <el-form :model="formValue" :disabled="onUpload">
          <div class="space-y-4 sm:space-y-6">
            <div>
              <label class="mb-2 block text-sm font-medium text-gray-700">安全设置</label>
              <el-checkbox-group v-model="formValue.flags" class="flex flex-wrap gap-3">
                <el-checkbox label="1"> 色情 </el-checkbox>
                <el-checkbox label="2"> 敏感 </el-checkbox>
                <el-checkbox label="4"> 血腥 </el-checkbox>
                <el-checkbox label="8"> 暴力 </el-checkbox>
              </el-checkbox-group>
            </div>

            <!-- 有效期 -->
            <div>
              <label class="mb-2 block text-sm font-medium text-gray-700">有效期</label>
              <el-select
                v-model="formValue.validityPeriod"
                placeholder="选择有效期"
                class="w-full sm:w-48"
              >
                <el-option label="1 天" :value="1" />
                <el-option label="3 天" :value="3" />
                <el-option label="7 天" :value="7" />
              </el-select>
            </div>

            <!--            密码暂时不可用-->
            <el-form-item label="密码" v-if="false">
              <el-input type="password" v-model="formValue.password" />
            </el-form-item>

            <div class="mt-2 flex">
              <el-button
                type="primary"
                @click="handlePublish"
                :disabled="onUpload"
                :loading="onUpload"
                class="ml-auto w-full sm:w-auto"
              >
                {{ onUpload ? '正在发布...' : '发布文件' }}
              </el-button>
            </div>
          </div>
        </el-form>

        <!-- 上传进度条：限制最大宽度 -->
        <el-progress
          v-if="onUpload"
          :percentage="Math.floor(fake.progress * 100)"
          class="mt-4 max-w-full"
        />
      </el-card>
    </div>
  </main>
</template>
