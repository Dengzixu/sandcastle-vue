import Api from './Api'

export default class UserApi extends Api {
  public login(login: Login, turnstileToken: string) {
    return super._post('/user/api/v1/login', login, null, turnstileToken)
  }

  public register(register: Register, turnstileToken: string) {
    return super._post('/user/api/v1/register', register, null, turnstileToken)
  }

  public verifyToken(token: string) {
    return super._get('/user/api/v1/token/verify', token)
  }
}

export interface Login {
  email: string
  password: string
}

export interface Register {
  username: string
  email: string
  password: string
}
