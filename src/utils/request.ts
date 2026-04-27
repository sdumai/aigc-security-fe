import axios from 'axios'
import { message } from 'antd'
import { apiBase } from './apiBase'
import { REQUEST_TIMEOUT_MS } from '@/constants/request'

const request = axios.create({
  baseURL: apiBase ? `${apiBase}/api` : '/api',
  timeout: REQUEST_TIMEOUT_MS,
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const { data } = response
    if (data.success === false) {
      message.error(data.message || '请求失败')
      return Promise.reject(new Error(data.message || '请求失败'))
    }
    return data
  },
  (error) => {
    message.error(error.message || '网络请求失败')
    return Promise.reject(error)
  }
)

export default request

