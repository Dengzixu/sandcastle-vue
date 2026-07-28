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
  ElSpace,
} from 'element-plus'
import { useUserStore } from '@/stores/user'
import { FakeProgress } from '@/utils/FakeProgress'
import FileApi from '@/api/FileApi'
import { errorMessage } from '@/utils/message'

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

const haldleChooseFile = () => {
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
    .then(async (response) => {
      const body = await response.json()
      if (!response.ok) {
        switch (body?.code) {
          case -1000_1000:
            userStore.$reset()
          default:
            throw new Error(`文件上传失败, ${body?.message}`)
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
            throw new Error(`文件上传失败, ${body?.message}`)
        }
      }

      return body
    })
    .then((body) => {
      fake.end()

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
    .finally(() => {})
}
</script>

<template>
  <main>
    <div class="container mx-auto">
      <p class="mt-[10%] py-10 text-center text-4xl">Sandcastle 临时文件分享</p>

      <el-card class="mx-auto w-[80%]" shadow="hover" dsiable>
        <p class="py-6 text-center text-lg">
          将文件拖入，或者选择要
          <el-button @click="haldleChooseFile">
            <span class="icon-[material-symbols--upload]"></span> 上传</el-button
          >
          的文件
        </p>

        <div id="FHfcfas"></div>

        <input id="choose-file" class="hidden" type="file" @change="handleChange" />

        <el-divider border-style="dashed" />

        <el-form :model="formValue" :disabled="onUpload">
          <el-space size="large" wrap>
            <el-form-item label="特殊标记" prop="flag">
              <el-checkbox-group v-model="formValue.flags">
                <el-checkbox label="色情" :value="1" />
                <el-checkbox label="敏感" :value="2" />
                <el-checkbox label="血腥" :value="4" />
                <el-checkbox label="暴力" :value="8" />
              </el-checkbox-group>
            </el-form-item>

            <el-form-item label="有效期">
              <el-select class="min-w-48" placeholder="1" v-model="formValue.validityPeriod">
                <el-option label="1 天" :value="1" />
                <el-option label="3 天" :value="3" />
                <el-option label="7 天" :value="7" />
              </el-select>
            </el-form-item>

            <el-form-item label="密码" v-if="false">
              <el-input type="password" v-model="formValue.password" />
            </el-form-item>

            <el-form-item class="ml-auto">
              <el-button
                type="primary"
                @click="handlePublish"
                :disabled="onUpload"
                :loading="onUpload"
                >发布</el-button
              >
            </el-form-item>
          </el-space>
        </el-form>

        <el-progress :percentage="Math.floor(fake.progress * 100)" v-if="onUpload" />
      </el-card>
    </div>
  </main>
</template>
