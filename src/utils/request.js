import axios from 'axios'
import { useUserStore } from '@/stores/user'

const baseURL = 'https://img.ksinx.com/api/v2'

const request = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const userStore = useUserStore()
    const token = userStore.token

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const { data, status } = response

    // 204 No Content 表示成功，但没有响应体
    if (status === 204) {
      return { success: true }
    }

    // 检查 API 返回的 status 字段（只有当 data 存在时才检查）
    if (data) {
      if (data.status === 'error') {
        return Promise.reject({
          message: data.message || '请求失败',
          data: data
        })
      }
    }

    return data
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response

      // Token过期或无效
      if (status === 401) {
        const userStore = useUserStore()
        userStore.logout()
        window.location.href = '/login'
      }

      // 其他错误
      return Promise.reject({
        status,
        message: data.message || '请求失败',
        data: data
      })
    }

    return Promise.reject({
      message: error.message || '网络错误'
    })
  }
)

export default request
