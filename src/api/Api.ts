// 这两个接口本身就用于换取凭据，401 不应该触发"登录失效"处理
const AUTH_EXEMPT_PATHS = new Set(['/user/api/v1/login', '/user/api/v1/register'])

export default class Api {
  /**
   * 登录态失效（401）的统一处理钩子，由 main.ts 注入。
   * 放在这里是为了让 api 层不直接依赖 store / router，避免循环依赖。
   */
  static onUnauthorized?: () => void

  private _host: string

  constructor(host: string) {
    this._host = host
  }

  host(): string {
    return this._host
  }

  private _inspect(apiPath: string, response: Response): Response {
    if (response.status === 401 && !AUTH_EXEMPT_PATHS.has(apiPath)) {
      Api.onUnauthorized?.()
    }

    return response
  }

  protected async _get(apiPath: string, token?: string) {
    const headers: Headers = new Headers()
    if (token) headers.append('Authorization', token)
    headers.append('Content-Type', 'application/json')

    const response = await fetch(this.host() + apiPath, {
      method: 'GET',
      headers: headers,
    })

    return this._inspect(apiPath, response)
  }

  protected async _post(
    apiPath: string,
    body?: unknown,
    token?: string | null,
    turnstileToken?: string,
  ) {
    const headers: Headers = new Headers()
    if (token) headers.append('Authorization', token)
    if (turnstileToken) headers.append('x-cloudflare-turnstile', turnstileToken)
    headers.append('Content-Type', 'application/json')

    const response = await fetch(this.host() + apiPath, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
    })

    return this._inspect(apiPath, response)
  }

  protected async _postForm(
    apiPath: string,
    body: FormData,
    token?: string,
    turnstileToken?: string,
  ) {
    const headers: Headers = new Headers()
    if (token) headers.append('Authorization', token)
    if (turnstileToken) headers.append('x-cloudflare-turnstile', turnstileToken)

    const response = await fetch(this.host() + apiPath, {
      method: 'POST',
      headers: headers,
      body: body,
    })

    return this._inspect(apiPath, response)
  }
}
