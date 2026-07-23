import Api from './Api'

export default class FileApi extends Api {
  public upload(file: File, token: string) {
    const formDataBody = new FormData()

    formDataBody.append('file', file)

    return super._postForm('/file/api/v1/upload', formDataBody, token)
  }

  public publish(publish: publish, token: string) {
    return super._post('/file/api/v1/publish', publish, token)
  }

  public get(fileUuid: string, token?: string) {
    return super._get('/file/api/v1/uuid/' + fileUuid, token)
  }

  public getById(fileId: number, token?: string) {
    return super._get('/file/api/v1/id/' + fileId, token)
  }
}

export interface publish {
  file_uuid: string
  flag: number
  password: string | null
  validity_period: number
}
