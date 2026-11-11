export const fetchFile = async (url: string, signal?: AbortSignal): Promise<Response> => {
  let response: Response

  try {
    response = await fetch(url, {
      method: 'GET',
      signal,
    })
  } catch (e) {
    // 主动取消交给调用方处理，不包装成网络错误
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw e
    }

    throw new Error('文件下载失败，请检查网络连接')
  }

  if (!response.ok) {
    // 预签名链接过期或被清理时，存储端返回的是错误体（通常是 XML），
    // 不在这里拦截会被当成密文继续解密，最终抛出难以理解的加密异常
    if (response.status === 403 || response.status === 404 || response.status === 410) {
      throw new Error('文件链接已失效，可能已过期或被删除')
    }

    throw new Error(`文件下载失败（HTTP ${response.status}）`)
  }

  return response
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
