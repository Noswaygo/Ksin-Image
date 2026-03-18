import { defineStore } from 'pinia'
import { authApi, userApi } from '@/api'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    userInfo: JSON.parse(localStorage.getItem('userInfo') || 'null'),
    isLoggedIn: !!localStorage.getItem('token'),
    loading: false
  }),

  getters: {
    hasToken: (state) => !!state.token,
    username: (state) => state.userInfo?.name || '',
    email: (state) => state.userInfo?.email || '',
    phone: (state) => state.userInfo?.phone || '',
    avatar: (state) => state.userInfo?.avatar_url || '',
    background: (state) => state.userInfo?.background || ''
  },

  actions: {
    // 设置token
    setToken(token) {
      this.token = token
      this.isLoggedIn = !!token
      if (token) {
        localStorage.setItem('token', token)
      } else {
        localStorage.removeItem('token')
      }
    },

    // 设置用户信息
    setUserInfo(userInfo) {
      this.userInfo = userInfo
      if (userInfo) {
        localStorage.setItem('userInfo', JSON.stringify(userInfo))
      } else {
        localStorage.removeItem('userInfo')
      }
    },

    // 登录
    async login(credentials) {
      this.loading = true
      try {
        const res = await authApi.login(credentials)
        this.setToken(res.data?.token)
        this.setUserInfo(res.data)
        this.isLoggedIn = true
        return res
      } finally {
        this.loading = false
      }
    },

    // 注册
    async register(data) {
      this.loading = true
      try {
        const res = await authApi.register(data)
        return res
      } finally {
        this.loading = false
      }
    },

    // 退出登录
    async logout() {
      try {
        await authApi.logout()
      } catch (error) {
        console.error('退出登录失败:', error)
      } finally {
        this.setToken('')
        this.setUserInfo(null)
        this.isLoggedIn = false
      }
    },

    // 获取用户信息
    async fetchUserInfo() {
      if (!this.token) return

      this.loading = true
      try {
        const res = await userApi.getUserInfo()
        console.log('fetchUserInfo response:', res)
        this.setUserInfo(res.data)
        return res
      } catch (error) {
        console.error('获取用户信息失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 更新用户信息
    async updateUserInfo(data) {
      this.loading = true
      try {
        const res = await userApi.updateUserInfo(data)
        await this.fetchUserInfo()
        return res
      } finally {
        this.loading = false
      }
    },

    // 修改密码
    async changePassword(data) {
      return await userApi.changePassword(data)
    },

    // 绑定/换绑手机号
    async bindPhone(data) {
      this.loading = true
      try {
        const res = await userApi.bindPhone(data)
        await this.fetchUserInfo()
        return res
      } finally {
        this.loading = false
      }
    },

    // 绑定/换绑邮箱
    async bindEmail(data) {
      this.loading = true
      try {
        const res = await userApi.bindEmail(data)
        await this.fetchUserInfo()
        return res
      } finally {
        this.loading = false
      }
    },

    // 设置背景图片
    async setBackground(data) {
      this.loading = true
      try {
        const res = await userApi.setBackground(data)
        await this.fetchUserInfo()
        return res
      } finally {
        this.loading = false
      }
    },

    // 移除背景图片
    async removeBackground() {
      this.loading = true
      try {
        const res = await userApi.removeBackground()
        await this.fetchUserInfo()
        return res
      } finally {
        this.loading = false
      }
    }
  }
})
