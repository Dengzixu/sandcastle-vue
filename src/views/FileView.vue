<script setup lang="ts">
import { computed, h, onBeforeMount, onBeforeUnmount, ref, type VNode } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  ElButton,
  ElButtonGroup,
  ElImage,
  ElMessageBox,
  ElResult,
  ElSkeleton,
  ElSkeletonItem,
  ElTag,
} from 'element-plus'

// 工具与 API
import FileApi from '@/api/FileApi'
import { decryptFile, fetchFile, splitBuffer } from '@/utils/loadFile'
import { formatBytes } from '@/utils/formatBytes'
import { useUserStore } from '@/stores/user'
import { errorMessage, successMessage } from '@/utils/message.ts'

const blobUrl = ref('')
// 元信息的状态：加载中 / 加载失败（整页错误态）/ 已就绪
const status = ref({
  loading: true,
  error: false,
  errorMsg: '',
})
// 文件内容（下载 / 解密）失败，只影响预览区域，元信息依然可用
const previewError = ref('')
// 元信息是否已就绪：未就绪时只渲染骨架，避免先闪一版空标题和 0 B 再被替换
const infoReady = ref(false)

/**
 * 携带 HTTP 状态码的加载错误。
 * 用状态码而不是"当前是否登录"来判断 401，避免把 404 等其他失败也一起静默掉。
 */
class FileLoadError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'FileLoadError'
    this.status = status
  }
}

const isUnauthorized = (e: unknown) => e instanceof FileLoadError && e.status === 401

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

// 从文件名取扩展名，作为元信息里的格式标签；没有扩展名时不显示
const fileExtension = computed(() => {
  const dotIndex = fileInfo.value.title.lastIndexOf('.')
  return dotIndex > 0 ? fileInfo.value.title.slice(dotIndex + 1).toUpperCase() : ''
})

// 时间只展示到分钟，避免一行元信息过长
const toMinute = (time: string) => (time ? time.slice(0, 16) : '')

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const fileApi = new FileApi(import.meta.env.VITE_SANDCASTLE_API as string)

const paramsFileId: string = route.params.id as string

// 上传者勾选了任一敏感标记时才需要用户确认
const hasSensitiveFlag = computed(() => fileInfo.value.flag !== 0)

// 组件卸载后到达的异步结果一律丢弃，避免创建出永不释放的 object URL
let disposed = false
let pendingLoad: AbortController | undefined

const _toMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e))

const _isAbortError = (e: unknown): boolean => e instanceof DOMException && e.name === 'AbortError'

const _loadFileInfo = async () => {
  let response

  if (paramsFileId.length === 36) {
    response = await fileApi.get(paramsFileId, userStore.token)
  } else {
    response = await fileApi.getById(Number(paramsFileId), userStore.token)
  }

  // 网关/代理出错时返回的可能是 HTML，直接解析会抛出英文的 SyntaxError
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      response.status === 401
        ? '登录已过期，请重新登录'
        : response.status === 404
          ? '文件不存在或链接已失效'
          : (body?.detail ?? '文件加载失败')

    throw new FileLoadError(message, response.status)
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
  contentType: string,
  signal: AbortSignal,
): Promise<Blob> => {
  const response = await fetchFile(url, signal)

  const encryptedBuffer = await response.arrayBuffer()

  const [ivBuffer, payloadBuffer] = splitBuffer(encryptedBuffer)

  // 密文至少包含 12 字节 IV + 16 字节 GCM tag，长度不足说明数据已损坏
  if (!ivBuffer || ivBuffer.byteLength < 12 || !payloadBuffer || payloadBuffer.byteLength === 0) {
    throw new Error('文件数据不完整，无法解密')
  }

  if (signal.aborted) {
    throw new DOMException('加载已取消', 'AbortError')
  }

  let decryptedBuffer: ArrayBuffer

  try {
    decryptedBuffer = await decryptFile(fileInfo.value.encryptKey, ivBuffer, payloadBuffer)
  } catch {
    // 密钥不匹配或数据被篡改，不把底层 DOMException 抛给用户
    throw new Error('文件解密失败，数据可能已损坏')
  }

  return new File([decryptedBuffer], fileName, { type: contentType })
}

// 文件名中的控制字符（0x00-0x1F、0x7F）会让浏览器直接丢弃整个下载
const _stripControlChars = (value: string): string =>
  Array.from(value)
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0

      return code > 0x1f && code !== 0x7f
    })
    .join('')

// 去掉文件系统不接受的字符，避免部分浏览器静默丢弃或截断文件名
const _sanitizeFileName = (name: string): string => {
  const cleaned = _stripControlChars(name.replace(/[\\/:*?"<>|]/g, '_')).trim()

  return cleaned.length > 0 ? cleaned : '未命名文件'
}

const handleDownload = () => {
  if (!blobUrl.value) {
    errorMessage(previewError.value ? '文件加载失败，无法下载' : '文件尚未加载完成，请稍后再试')
    return
  }

  const tempAElement = document.createElement('a')

  tempAElement.href = blobUrl.value
  tempAElement.download = _sanitizeFileName(fileInfo.value.title)
  tempAElement.rel = 'noopener'
  tempAElement.style.display = 'none'

  // Firefox 只对文档树中的锚点触发下载
  document.body.appendChild(tempAElement)
  tempAElement.click()
  tempAElement.remove()
}

const handleRetry = () => window.location.reload()

const handleGoHome = () => router.push({ name: 'home' })

const handleCopy = async () => {
  // 用 UUID 生成规范链接：丢掉 query/hash，也不把数字 ID 形式的地址分享出去
  const href = router.resolve({ name: 'file', params: { id: fileInfo.value.fileUuid } }).href
  const url = new URL(href, window.location.origin).href

  try {
    await navigator.clipboard.writeText(url)
    successMessage('链接已复制')
  } catch {
    // 权限被拒或页面未聚焦时 writeText 会 reject
    errorMessage('复制失败，请手动复制地址栏中的链接')
  }
}

// 下载并解密文件，失败时统一置为错误状态并提示
const _loadBlob = async () => {
  if (disposed) return

  // 防御性处理：重复触发时先取消上一次请求
  pendingLoad?.abort()

  const controller = new AbortController()

  pendingLoad = controller

  try {
    const blob = await _downloadFile(
      fileInfo.value.url,
      fileInfo.value.title,
      fileInfo.value.contentType,
      controller.signal,
    )

    // 组件已卸载：不再创建 object URL，否则无人回收
    if (disposed) return

    if (blobUrl.value) {
      URL.revokeObjectURL(blobUrl.value)
    }

    blobUrl.value = URL.createObjectURL(blob)
  } catch (e) {
    // 主动取消不是错误，不打扰用户
    if (disposed || _isAbortError(e)) return

    // 只影响预览区域，元信息依然可用
    previewError.value = _toMessage(e)
    errorMessage(`文件加载失败：${previewError.value}`)
  } finally {
    if (pendingLoad === controller) {
      pendingLoad = undefined

      if (!disposed) {
        status.value.loading = false
      }
    }
  }
}

// 弹窗确认敏感内容；返回 true 表示用户选择继续
const _confirmSensitiveContent = async (): Promise<boolean> => {
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

  try {
    await ElMessageBox({
      title: '敏感内容警告',
      message: h('div', tags),
      type: 'warning',
      showCancelButton: true,
      closeOnClickModal: false,
      confirmButtonText: '继续',
      confirmButtonType: 'danger',
    })

    return true
  } catch {
    return false
  }
}

onBeforeMount(async () => {
  try {
    await _loadFileInfo()
    infoReady.value = true
  } catch (e) {
    status.value.loading = false
    status.value.error = true
    status.value.errorMsg = _toMessage(e)

    // 401 已由统一钩子提示并跳转，这里不重复弹错；其余失败（如 404）必须给出提示。
    // 不能用"当前是否登录"来代理错误类型，否则匿名访客打开失效链接时会被静默处理。
    if (!isUnauthorized(e)) {
      errorMessage(status.value.errorMsg)
    }

    return
  }

  if (disposed) return

  if (hasSensitiveFlag.value && !(await _confirmSensitiveContent())) {
    // 用户取消或关闭警告时返回首页
    status.value.loading = false
    router.push({ name: 'home' })
    return
  }

  await _loadBlob()
})

onBeforeUnmount(() => {
  disposed = true
  pendingLoad?.abort()
  pendingLoad = undefined

  if (blobUrl.value) {
    URL.revokeObjectURL(blobUrl.value)
    blobUrl.value = ''
  }
})
</script>

<template>
  <div class="container mx-auto">
    <!-- 元信息加载失败：整页错误态，不再渲染标题为空、大小为 0 B 的空壳信息卡片 -->
    <el-result v-if="status.error" icon="warning" title="文件无法打开" :sub-title="status.errorMsg">
      <template #extra>
        <el-button type="primary" @click="handleRetry">重新加载</el-button>
        <el-button @click="handleGoHome">返回首页</el-button>
      </template>
    </el-result>

    <!-- 元信息加载中：骨架占位，避免先渲染出空标题和 0 B 再被错误页替换 -->
    <el-skeleton v-else-if="!infoReady" animated>
      <template #template>
        <div class="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div class="p-5 sm:p-6">
            <el-skeleton-item variant="h3" style="width: 45%; height: 28px" />
            <div class="mt-3 flex flex-wrap items-center gap-4">
              <el-skeleton-item variant="text" style="width: 6rem; height: 16px" />
              <el-skeleton-item variant="text" style="width: 9rem; height: 16px" />
            </div>
          </div>

          <div class="border-t border-gray-100 bg-gray-50 p-4 sm:p-6">
            <div class="flex justify-center">
              <el-skeleton-item variant="image" class="min-h-48 min-w-48" />
            </div>
          </div>
        </div>
      </template>
    </el-skeleton>

    <template v-else>
      <article class="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div class="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div class="min-w-0">
            <h1
              class="line-clamp-2 text-lg font-semibold break-all text-gray-900 sm:text-xl md:text-2xl"
              :title="fileInfo.title"
            >
              {{ fileInfo.title }}
            </h1>

            <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
              <span class="inline-flex items-center gap-1">
                <span class="icon-[material-symbols--hard-drive] text-base text-gray-400"></span>
                {{ formatBytes(fileInfo.size) }}
              </span>
              <span class="inline-flex items-center gap-1">
                <span class="icon-[material-symbols--schedule] text-base text-gray-400"></span>
                上传于 {{ toMinute(fileInfo.createTime) }}
              </span>
              <span
                v-if="fileExtension"
                class="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-medium tracking-wide text-gray-500"
              >
                {{ fileExtension }}
              </span>
            </div>
          </div>

          <!-- Element Plus 的 .el-button-group--horizontal 是 display:inline-block + float 子元素，
               属于未分层样式，会盖掉 Tailwind 的 flex；这里用 ! 强制成 flex，窄屏才能让按钮均分整行 -->
          <el-button-group class="flex! w-full shrink-0 sm:w-auto">
            <el-button class="flex-1 sm:flex-none" :loading="status.loading" @click="handleCopy">
              复制链接
            </el-button>
            <el-button
              class="flex-1 sm:flex-none"
              type="primary"
              :loading="status.loading"
              @click="handleDownload"
            >
              下载文件
            </el-button>
          </el-button-group>
        </div>

        <!-- 预览区和信息区共用一张卡片：浅色底从卡片边缘铺到底，底部圆角由卡片的 overflow-hidden 裁出，
             不再额外套一层自己的圆角与边框 -->
        <div class="border-t border-gray-100 bg-gray-50 p-4 sm:p-6">
          <div class="flex justify-center">
            <el-skeleton class="flex justify-center" animated :loading="status.loading">
              <template #template>
                <el-skeleton-item class="min-h-48 min-w-48" variant="image" />
              </template>

              <!-- blobUrl 为空时不要渲染 el-image：空的 src 会被浏览器解析成当前页面地址 -->
              <el-image
                v-if="blobUrl"
                class="min-h-48 min-w-48"
                :src="blobUrl"
                fit="scale-down"
                :preview-src-list="[blobUrl]"
              >
                <template #error>
                  <div
                    class="flex h-full max-h-full min-h-48 max-w-full items-center justify-center"
                  >
                    <p class="text-red-600">图片加载失败，文件可能已损坏</p>
                  </div>
                </template>
              </el-image>

              <p v-else-if="previewError" class="text-red-600">文件加载失败：{{ previewError }}</p>
            </el-skeleton>
          </div>
        </div>
      </article>
    </template>
  </div>
</template>
