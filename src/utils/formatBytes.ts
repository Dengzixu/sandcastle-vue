/**
 * 将字节（Bytes）自动转换为更易读的单位（B, KiB, MiB, GiB, TiB...）
 * @param bytes 字节数，必须是非负整数或浮点数
 * @param decimalPlaces 小数位数，默认保留 2 位小数
 * @returns 格式化后的字符串，如 "1.25 MiB"
 */
export const formatBytes = (bytes: number, decimalPlaces: number = 2): string => {
  if (bytes < 0) {
    throw new Error('字节数不能为负数')
  }

  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
  let size = bytes
  let unitIndex = 0

  // 每次除以 1024（二进制单位），直到超过当前单位阈值
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  // 处理极小值：当 bytes = 0 时，直接返回 "0 B"
  if (bytes === 0) {
    return `0 ${units[0]}`
  }

  // 格式化数值（避免科学计数法 & 保留指定小数位）
  const formattedSize = size.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimalPlaces,
  })

  return `${formattedSize} ${units[unitIndex]}`
}
