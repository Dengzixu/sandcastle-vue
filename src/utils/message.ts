import { ElMessage } from 'element-plus'

const successMessage = (message: string) => {
  ElMessage({
    message: message,
    type: 'success',
    duration: 5 * 1000,
    showClose: true,
  })
}

const warningMessage = (message: string) => {
  ElMessage({
    message: message,
    type: 'warning',
    duration: 10 * 1000,
    showClose: true,
  })
}

const errorMessage = (message: string) => {
  ElMessage({
    message: message,
    type: 'error',
    duration: 10 * 1000,
    showClose: true,
  })
}

export { successMessage, warningMessage, errorMessage }
