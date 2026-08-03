<script setup lang="ts">
import { h, onBeforeMount, onBeforeUnmount, ref, type VNode } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  ElButton,
  ElDescriptions,
  ElDescriptionsItem,
  ElDivider,
  ElImage,
  ElMessage,
  ElMessageBox,
  ElSkeleton,
  ElSkeletonItem,
  ElTag,
} from 'element-plus'

// 工具与 API
import FileApi from '@/api/FileApi'
import { decryptFile, fetchFile, splitBuffer } from '@/utils/loadFile'
import { formatBytes } from '@/utils/formatBytes'
import { useUserStore } from '@/stores/user'

const blobUrl = ref('')
const status = ref({
  loading: true,
  hidden: false,
  error: false,
  errorMsg: '',
})
const fileInfo = ref({
  fileId: 0,
  fileUuid: '',
  userUuid: '',
  flag: 0,
  title: '',
  contentType: '',
  createTime: '',
  objectUuid: '',
  url: '',
  size: 0,
  encryptKey: '',
})

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const fileApi = new FileApi(import.meta.env.VITE_SANDCASTLE_API as string)

const paramsFileId: string = route.params.id as string

const _errorMessage = (message: string) => {
  ElMessage({
    message: message,
    type: 'error',
    duration: 15 * 1000,
    showClose: true,
  })
}

const _loadFileInfo = async () => {
  let response

  if (paramsFileId.length === 36) {
    response = await fileApi.get(paramsFileId, userStore.token)
  } else {
    response = await fileApi.getById(Number(paramsFileId), userStore.token)
  }

  const body = await response.json()

  if (!response.ok) {
    switch (response.status) {
      case 400:
        throw new Error('文件资源不存在')
      default:
        throw new Error(body.message)
    }
  }

  if (!body || !body.file || !body.object) {
    throw new Error('数据格式错误')
  }

  fileInfo.value = {
    fileId: body.file.id,
    fileUuid: body.file.file_uuid,
    userUuid: body.file.user_uuid,
    flag: body.file.flag,
    title: body.file.title,
    contentType: body.file.content_type,
    createTime: body.file.create_time,
    objectUuid: body.object.uuid,
    url: body.object.object_url,
    size: body.object.size,
    encryptKey: body.object.encrypt_key,
  }
}

const _downloadFile = async (
  url: string,
  fileName: string,
  contentType?: string,
): Promise<string> => {
  const response = await fetchFile(url)

  const encryptedBuffer = await response.arrayBuffer()

  const [ivBuffer, payloadBuffer] = splitBuffer(encryptedBuffer)

  const decryptedBuffer = await decryptFile(fileInfo.value.encryptKey, ivBuffer!, payloadBuffer!)

  return URL.createObjectURL(new File([decryptedBuffer], fileName, { type: contentType }))
}

const handleDownload = () => {
  const tempAElement = document.createElement('a')

  tempAElement.href = blobUrl.value
  tempAElement.download = fileInfo.value.title;
  tempAElement.click()
}

onBeforeMount(() => {
  _loadFileInfo()
    .then(() => {
      status.value.hidden = !(fileInfo.value.flag === 0)

      if (status.value.hidden) {
        const tags: VNode[] = [
          h('p', () => '文件上传者已声明文件可能存在以下内容：'),
          ...[
            { bit: 1, label: '色情' },
            { bit: 2, label: '敏感' },
            { bit: 4, label: '血腥' },
            { bit: 8, label: '暴力' },
          ].flatMap(({ bit, label }) => {
            return (fileInfo.value.flag & bit) === bit
              ? h(ElTag, { class: 'mr-2', type: 'danger', effect: 'dark' }, () => label)
              : []
          }),
        ]

        ElMessageBox({
          title: '敏感内容警告',
          message: h('div', tags),
          type: 'warning',
          showCancelButton: true,
          closeOnClickModal: false,
          confirmButtonText: '继续',
          confirmButtonType: 'danger',
        })
          .then(() => {
            _downloadFile(
              fileInfo.value.url,
              fileInfo.value.title,
              fileInfo.value.contentType,
            ).then((url) => {
              blobUrl.value = url
              status.value.loading = false
            })
          })
          .catch(() => {
            router.push({ name: 'home' })
          })
      } else {
        _downloadFile(fileInfo.value.url, fileInfo.value.title, fileInfo.value.contentType).then(
          (url) => {
            blobUrl.value = url
            status.value.loading = false
          },
        )
      }
    })
    .catch((e) => {
      status.value.loading = false
      status.value.error = true
      status.value.errorMsg = e.message
      _errorMessage(e.message)
    })
})

onBeforeUnmount(() => {
  URL.revokeObjectURL(blobUrl.value)
})
</script>

<template>
  <div class="container mx-auto">
    <div class="flex items-center">
      <el-descriptions class="min-w-1/2">
        <template #title>
          <p class="text-3xl">{{ fileInfo.title }}</p>
        </template>
        <el-descriptions-item label="文件大小">{{
          formatBytes(fileInfo.size)
        }}</el-descriptions-item>
        <el-descriptions-item label="上传用户">不告诉你</el-descriptions-item>
        <el-descriptions-item label="上传时间">{{ fileInfo.createTime }}</el-descriptions-item>
      </el-descriptions>

      <el-button class="ml-auto" type="primary" :loading="status.loading" @click="handleDownload"
        >下载文件</el-button
      >
    </div>

    <el-divider />

    <div class="flex justify-center">
      <el-skeleton class="flex justify-center" animated :loading="status.loading">
        <template #template>
          <el-skeleton-item class="min-h-48 min-w-48" variant="image" />
        </template>

        <el-image
          class="min-h-48 min-w-48"
          :src="blobUrl"
          fit="scale-down"
          :preview-src-list="[blobUrl]"
        >
          <template #error>
            <div class="h-full max-h-full max-w-full text-center">
              <p class="text-red-600" v-if="status.error">图片加载失败,{{ status.errorMsg }}</p>
            </div>
          </template>
        </el-image>
      </el-skeleton>
    </div>
  </div>
</template>
