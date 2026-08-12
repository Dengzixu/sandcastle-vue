<script setup lang="ts">
import { onBeforeMount, ref } from 'vue'
import {
  ElDivider,
  ElPageHeader,
  ElTable,
  ElTableColumn,
  ElTag,
  ElSpace,
  ElLink,
} from 'element-plus'

import { useUserStore } from '@/stores/user.ts'
import { errorMessage } from '@/utils/message.ts'
import type { File } from '@/types.ts'
import FileApi from '@/api/FileApi.ts'

const userStore = useUserStore()
const fileApi = new FileApi(import.meta.env.VITE_SANDCASTLE_API as string)

const fileListRef = ref<
  {
    id: number
    file_uuid: string
    status: number
    flag: number
    title: string
    create_time: string
  }[]
>([])

const status = ref({
  loading: true,
})

const _loadFileList = async () => {
  const response = await fileApi.list(userStore.token)

  const body = await response.json()

  if (!body.file_list) {
    throw new Error('数据格式不正确')
  }

  body.file_list.forEach((file: File) => {
    fileListRef.value.push({
      id: file.id,
      file_uuid: file.file_uuid,
      status: file.status,
      flag: file.flag,
      title: file.title,
      create_time: file.create_time,
    })
  })
}

const handleBack = () => {
  history.back()
}

onBeforeMount(() => {
  _loadFileList()
    .catch((e) => {
      errorMessage(e.message)
    })
    .finally(() => {
      status.value.loading = false
    })
})
</script>

<template>
  <div class="container mx-auto">
    <el-page-header @back="handleBack">
      <template #content>
        <span>我的文件</span>
      </template>
    </el-page-header>

    <el-divider />

    <el-table v-loading="status.loading" :data="fileListRef">
      <el-table-column type="index" label="#" width="50" />
      <el-table-column prop="file_uuid" label="ID" min-width="150">
        <template #default="scope">
          <el-link
            underline="always"
            target="_blank"
            :href="`/file/${scope.row.file_uuid}`"
            class="block truncate"
          >
            {{ scope.row.file_uuid }}
          </el-link>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="文件名" min-width="150" show-overflow-tooltip />
      <el-table-column prop="create_time" label="上传时间" min-width="200" />
      <el-table-column label="特殊标记" min-width="240">
        <template #default="scope">
          <el-space>
            <el-tag type="danger" v-if="(scope.row.flag & 1) === 1"> 色情 </el-tag>
            <el-tag type="danger" v-if="(scope.row.flag & 2) === 2"> 敏感 </el-tag>
            <el-tag type="danger" v-if="(scope.row.flag & 4) === 4"> 血腥 </el-tag>
            <el-tag type="danger" v-if="(scope.row.flag & 8) === 8"> 暴力 </el-tag>
            <el-tag type="success" v-if="scope.row.flag === 0"> 无标记 </el-tag>
          </el-space>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped></style>
