<script setup lang="ts">
import { computed, onBeforeMount, onBeforeUnmount, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ElAlert,
  ElButton,
  ElCard,
  ElCheckbox,
  ElCheckboxGroup,
  ElDivider,
  ElForm,
  ElMessage,
  ElOption,
  ElProgress,
  ElSelect,
} from 'element-plus'
import { useUserStore } from '@/stores/user'
import { FakeProgress } from '@/utils/FakeProgress'
import FileApi from '@/api/FileApi'
import { errorMessage } from '@/utils/message'
import { formatBytes } from '@/utils/formatBytes'

const siteTitle = import.meta.env.VITE_SITE_TITLE

const router = useRouter()
const userStore = useUserStore()
const fileApi = new FileApi(import.meta.env.VITE_SANDCASTLE_API as string)

const fake = reactive(new FakeProgress({ timeConstant: 10000 }))

const file = ref<File | undefined>(undefined)
const fileInput = ref<HTMLInputElement | null>(null)

/** 发布流程：空闲 / 上传中 / 成功（等待跳转）/ 失败 */
type UploadState = 'idle' | 'uploading' | 'success' | 'error'

const uploadState = ref<UploadState>('idle')
const uploadError = ref('')

const isUploading = computed(() => uploadState.value === 'uploading')
// 上传中与成功后的等待跳转期间都不允许再次操作
const isBusy = computed(() => uploadState.value === 'uploading' || uploadState.value === 'success')

// 成功前最多显示 99%，避免服务端还没确认就"完成"
const progressPercentage = computed(() => {
  if (uploadState.value === 'success') {
    return 100
  }

  return Math.min(99, Math.floor(fake.progress * 100))
})

const progressStatus = computed<'success' | 'exception' | undefined>(() => {
  if (uploadState.value === 'error') {
    return 'exception'
  }

  if (uploadState.value === 'success') {
    return 'success'
  }

  return undefined
})

const publishButtonText = computed(() => {
  switch (uploadState.value) {
    case 'uploading':
      return '正在发布...'
    case 'success':
      return '发布成功'
    case 'error':
      return '重新发布'
    default:
      return '发布文件'
  }
})

const formValue = reactive({
  flags: [] as number[],
  validityPeriod: 1,
  password: '',
})

const handleChooseFile = () => {
  if (isBusy.value) return

  fileInput.value?.click()
}

// 文件选择与拖拽共用同一套校验
const applyFile = (picked: File): boolean => {
  if (isBusy.value) {
    return false
  }

  if (!picked.type.startsWith('image')) {
    errorMessage('目前只支持图片文件')
    file.value = undefined
    return false
  }

  file.value = picked

  // 换了文件就清掉上一次的失败结果
  if (uploadState.value === 'error') {
    uploadState.value = 'idle'
    uploadError.value = ''
  }

  return true
}

const handleChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const picked = input.files?.[0]

  // 取到引用后立刻清空，允许失败后重新选择同一个文件
  input.value = ''

  if (picked) {
    applyFile(picked)
  }
}

// dragenter / dragleave 会随着鼠标划过卡片内的子元素反复触发，用计数判断是否真正离开
let dragDepth = 0
const isDragging = ref(false)

const handleDragEnter = (event: DragEvent) => {
  event.preventDefault()

  if (isBusy.value) return

  dragDepth++
  isDragging.value = true
}

const handleDragOver = (event: DragEvent) => {
  // 必须阻止默认行为，否则 drop 事件不会触发
  event.preventDefault()

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = isBusy.value ? 'none' : 'copy'
  }
}

const handleDragLeave = () => {
  dragDepth = Math.max(0, dragDepth - 1)

  if (dragDepth === 0) {
    isDragging.value = false
  }
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()

  dragDepth = 0
  isDragging.value = false

  const picked = event.dataTransfer?.files?.[0]

  if (picked) {
    applyFile(picked)
  }
}

// 拖到卡片外面时阻止浏览器直接打开文件
const preventBrowserOpen = (event: DragEvent) => event.preventDefault()

onBeforeMount(() => {
  document.addEventListener('dragover', preventBrowserOpen)
  document.addEventListener('drop', preventBrowserOpen)
})

onBeforeUnmount(() => {
  document.removeEventListener('dragover', preventBrowserOpen)
  document.removeEventListener('drop', preventBrowserOpen)
})

const handlePublish = async () => {
  if (isBusy.value) {
    return
  }

  if (!userStore.isLogin) {
    errorMessage('尚未登录，请登录后再试。')
    return
  }

  if (!file.value) {
    errorMessage('未选择文件，请先选择文件。')
    return
  }

  let flag = 0

  formValue.flags.forEach((i) => {
    flag |= i
  })

  uploadState.value = 'uploading'
  uploadError.value = ''

  // start() 只重置计时，不清零进度，先手动归零避免上次的残值
  fake.stop()
  fake.setProgress(0)
  fake.start()

  try {
    const uploadResponse = await fileApi.upload(file.value, userStore.token)
    const uploadBody = await uploadResponse.json().catch(() => null)

    // 401 已由 Api 层的统一钩子处理（清除登录态并跳转），这里只中断流程
    if (uploadResponse.status === 401) {
      throw new Error('登录已过期')
    }

    if (!uploadResponse.ok) {
      throw new Error(uploadBody?.detail ?? '文件上传失败')
    }

    const publishResponse = await fileApi.publish(
      {
        file_uuid: uploadBody?.file_uuid,
        flag: flag,
        password: formValue.password,
        validity_period: formValue.validityPeriod,
      },
      userStore.token,
    )

    const publishBody = await publishResponse.json().catch(() => null)

    if (publishResponse.status === 401) {
      throw new Error('登录已过期')
    }

    if (!publishResponse.ok) {
      throw new Error(publishBody?.detail ?? '文件发布失败')
    }

    // 只有服务端确认成功才把进度条补满
    fake.end()
    uploadState.value = 'success'

    ElMessage({
      message: '文件上传成功，5秒后跳转至详情页',
      type: 'success',
      duration: 5 * 1000,
      onClose: () => {
        router.push({ name: 'file', params: { id: publishBody?.file_uuid } })
      },
    })
  } catch (e) {
    // 冻结在当前进度，避免失败时反而显示成 100%
    fake.stop()

    // 登录失效已由统一钩子处理并跳转，这里不重复提示，也不留失败态
    if (!userStore.isLogin) {
      uploadState.value = 'idle'
      return
    }

    uploadState.value = 'error'
    uploadError.value = e instanceof Error ? e.message : String(e)

    errorMessage(uploadError.value)
  }
}
</script>

<template>
  <main>
    <div class="container mx-auto">
      <p
        class="mt-[5vh] mb-8 text-center text-3xl font-semibold tracking-tight sm:mt-[10vh] sm:text-4xl"
      >
        {{ siteTitle }} 临时文件分享
      </p>
      <el-card
        class="mx-auto w-full max-w-3xl rounded-xl transition-shadow"
        :class="isDragging ? 'ring-2 ring-blue-400 ring-offset-2' : ''"
        shadow="hover"
        @dragenter="handleDragEnter"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
      >
        <div class="py-6 text-center">
          <p class="mb-4 text-base text-gray-700 sm:text-lg">
            <template v-if="isDragging">松开鼠标即可上传</template>
            <template v-else>
              将文件拖入区域，或选择要
              <el-button class="font-bold" :disabled="isBusy" @click="handleChooseFile">
                <span class="icon-[material-symbols--upload] mr-1"></span>
                上传
              </el-button>
              的文件
            </template>
          </p>

          <el-alert
            v-if="file"
            class="mt-4"
            type="success"
            :closable="false"
            show-icon
            :title="`${file.name} · ${formatBytes(file.size)}`"
          />

          <input
            ref="fileInput"
            class="hidden"
            type="file"
            accept="image/*"
            @change="handleChange"
          />

          <el-divider border-style="dashed" />
        </div>

        <el-form :model="formValue" :disabled="isBusy">
          <div class="space-y-4 sm:space-y-6">
            <div>
              <label class="mb-2 block text-sm font-medium text-gray-700">安全设置</label>
              <el-checkbox-group v-model="formValue.flags" class="flex flex-wrap gap-3">
                <el-checkbox :value="1"> 色情 </el-checkbox>
                <el-checkbox :value="2"> 敏感 </el-checkbox>
                <el-checkbox :value="4"> 血腥 </el-checkbox>
                <el-checkbox :value="8"> 暴力 </el-checkbox>
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
            <!--            <el-form-item label="密码" v-if="false">-->
            <!--              <el-input type="password" v-model="formValue.password" />-->
            <!--            </el-form-item>-->

            <div class="mt-2 flex">
              <el-button
                type="primary"
                :disabled="isBusy"
                :loading="isUploading"
                class="ml-auto w-full sm:w-auto"
                @click="handlePublish"
              >
                {{ publishButtonText }}
              </el-button>
            </div>
          </div>
        </el-form>

        <!-- 上传进度：成功前最多到 99%，失败时冻结并标红 -->
        <el-progress
          v-if="uploadState !== 'idle'"
          class="mt-4 max-w-full"
          :percentage="progressPercentage"
          :status="progressStatus"
        />

        <el-alert
          v-if="uploadState === 'error'"
          class="mt-2"
          type="error"
          :closable="false"
          show-icon
          title="发布失败"
          :description="uploadError"
        />
      </el-card>
    </div>
  </main>
</template>
