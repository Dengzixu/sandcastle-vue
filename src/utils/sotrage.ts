export default class sotrage {
  constructor() {
    if (!('localStorage' in window)) {
      console.warn('[Auth] ')
      throw Error(
        '当前浏览器环境不支持 localStorage / The current browser environment does not support localStorage. ',
      )
    }
  }
}
