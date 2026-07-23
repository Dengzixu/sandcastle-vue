export const fetchFile = (url: string) => {
  return fetch(url, {
    method: 'GET',
  })
}

export const splitBuffer = (buffer: ArrayBuffer): ArrayBuffer[] => {
  const ivBuffer = buffer.slice(0, 12)

  const payloadBuffer = buffer.slice(12)

  return [ivBuffer, payloadBuffer]
}

export const decryptFile = (key: string, iv: ArrayBuffer, data: ArrayBuffer) => {
  const keyBuffer = base64ToArrayBuffer(key)
  return crypto.subtle
    .importKey('raw', keyBuffer, { name: 'AES-GCM' }, false, ['decrypt'])
    .then((cryptoKey) => {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv, tagLength: 128 }, cryptoKey, data)
    })
}

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  // 解码 Base64 字符串
  const binaryString = atob(base64)

  // 创建 Uint8Array 并填充数据
  const bytes = new Uint8Array(binaryString.length)

  // 填充字节数组
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return bytes.buffer
}
