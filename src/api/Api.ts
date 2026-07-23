export default class Api {
  private _host: string

  constructor(host: string) {
    this._host = host
  }

  host(): string {
    return this._host
  }

  protected _get(apiPath: string, token?: string) {
    const headers: Headers = new Headers()
    if (token) headers.append('Authorization', token)
    headers.append('Content-Type', 'application/json')

    return fetch(this.host() + apiPath, {
      method: 'GET',
      headers: headers,
    })
  }

  protected _post(apiPath: string, body?: unknown, token?: string | null, turnstileToken?: string) {
    const headers: Headers = new Headers()
    if (token) headers.append('Authorization', token)
    if (turnstileToken) headers.append('x-cloudflare-turnstile', turnstileToken)
    headers.append('Content-Type', 'application/json')

    return fetch(this.host() + apiPath, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
    })
  }

  protected _postForm(apiPath: string, body: FormData, token?: string, turnstileToken?: string) {
    const headers: Headers = new Headers()
    if (token) headers.append('Authorization', token)
    if (turnstileToken) headers.append('x-cloudflare-turnstile', turnstileToken)

    return fetch(this.host() + apiPath, {
      method: 'POST',
      headers: headers,
      body: body,
    })
  }
}
