import Api from './Api'

export default class UserApi extends Api {
  public login(login: login, turnstileToken: string) {
    return super._post('/user/api/v1/login', login, null, turnstileToken)
  }

  public verifyToken(token: string) {
    return super._get('/user/api/v1/token/verify', token)
  }
}

export interface login {
  email: string
  password: string
}
