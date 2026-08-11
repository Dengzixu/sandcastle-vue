export interface UserInfo {
  id: number
  uuid: string
  username: string
  email: string
}

export interface File {
  id: number
  file_uuid: string
  user_uuid: string
  object_uuid: string
  status: number
  flag: number
  title: string
  content_type: string
  type: string
  create_time: string
}
