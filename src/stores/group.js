import { defineStore } from 'pinia'
import { systemApi } from '@/api'

export const useGroupStore = defineStore('group', {
  state: () => ({
    groupInfo: null,
    loading: false,
    // 上传限制
    maxUploadSize: 0,          // 最大上传大小 (KB)
    fileExpireSeconds: 0,      // 文件过期秒数
    limitConcurrentUpload: 4, // 同时上传数
    limitPerMinute: 20,      // 每分钟限制
    limitPerHour: 100,        // 每小时限制
    limitPerDay: 300,         // 每天限制
    limitPerWeek: 600,        // 每周限制
    limitPerMonth: 1000,      // 每月限制
    allowFileTypes: [],       // 允许的文件类型
    // 存储信息
    storages: []
  }),

  getters: {
    // 获取允许的文件类型（带点前缀）
    allowExtensions: (state) => {
      return state.allowFileTypes.map(ext => ext.startsWith('.') ? ext : '.' + ext)
    },
    // 检查文件类型是否允许
    isFileTypeAllowed: (state) => (filename) => {
      if (state.allowFileTypes.length === 0) return true
      const ext = filename.split('.').pop()?.toLowerCase()
      return ext ? state.allowFileTypes.includes(ext) : false
    },
    // 检查文件大小是否允许
    isFileSizeAllowed: (state) => (sizeKB) => {
      if (state.maxUploadSize === 0) return true // 0 表示无限制
      return sizeKB <= state.maxUploadSize
    },
    // 格式化最大上传大小
    maxUploadSizeText: (state) => {
      if (state.maxUploadSize === 0) return '无限制'
      if (state.maxUploadSize >= 1024) {
        return `${(state.maxUploadSize / 1024).toFixed(1)} MB`
      }
      return `${state.maxUploadSize} KB`
    }
  },

  actions: {
    async fetchGroupInfo() {
      this.loading = true
      try {
        const res = await systemApi.getGroupInfo()
        const data = res.data?.data || res.data
        
        if (data?.group) {
          this.groupInfo = data.group
          const options = data.group.options || {}
          
          // 设置上传限制
          this.maxUploadSize = options.max_upload_size || 0
          this.fileExpireSeconds = options.file_expire_seconds || 0
          this.limitConcurrentUpload = options.limit_concurrent_upload || 4
          this.limitPerMinute = options.limit_per_minute || 20
          this.limitPerHour = options.limit_per_hour || 100
          this.limitPerDay = options.limit_per_day || 300
          this.limitPerWeek = options.limit_per_week || 600
          this.limitPerMonth = options.limit_per_month || 1000
          this.allowFileTypes = options.allow_file_types || []
        }
        
        if (data?.storages) {
          this.storages = data.storages
        }
        
        return data
      } catch (error) {
        console.error('获取组信息失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})