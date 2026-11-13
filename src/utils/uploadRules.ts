import { formatBytes } from './formatBytes'

/** 单个文件大小上限：50 MiB（按 1024 进制计算） */
export const MAX_UPLOAD_SIZE = 50 * 1024 * 1024

/** 与 MAX_UPLOAD_SIZE 对应的展示文案，提示与报错共用，避免两处写法不一致 */
export const MAX_UPLOAD_SIZE_LABEL = '50 MiB'

/** 文件选择框的 accept：图片 + MP4 视频；带 .mp4 是为了在 MIME 缺失时也能选到文件 */
export const UPLOAD_ACCEPT = 'image/*,video/mp4,.mp4'

export type UploadKind = 'image' | 'video'

const MP4_EXTENSION = /\.mp4$/i

/**
 * 判断文件类型：MIME 可信时以 MIME 为准；
 * 部分系统（尤其 Windows）从注册表推断 .mp4 的 MIME 会给出空值或 application/octet-stream，
 * 这时退回扩展名判断，避免把合法视频拦下来。
 */
const resolveKind = (file: File): UploadKind | null => {
  const mime = file.type.toLowerCase()

  if (mime.startsWith('image/')) {
    return 'image'
  }

  if (mime === 'video/mp4') {
    return 'video'
  }

  if ((mime === '' || mime === 'application/octet-stream') && MP4_EXTENSION.test(file.name)) {
    return 'video'
  }

  return null
}

/**
 * 校验待上传文件。
 * @returns 校验失败时的提示文案；通过校验返回 null
 */
export const validateUploadFile = (file: File): string | null => {
  if (!resolveKind(file)) {
    return '只支持图片和 MP4 视频文件'
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    // 同时给出可读单位和精确字节数：接近上限时 formatBytes 会四舍五入到 50 MiB，
    // 只保留「50 MiB」会和上限文案看起来一样，补上字节数避免误解
    return `文件大小不能超过 ${MAX_UPLOAD_SIZE_LABEL}，当前文件为 ${formatBytes(file.size)}（${file.size.toLocaleString('zh-CN')} 字节）`
  }

  return null
}
