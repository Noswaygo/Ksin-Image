import { defineStore } from 'pinia'
import { userApi } from '@/api'

export const useSettingStore = defineStore('setting', {
  state: () => ({
    // 主题设置
    theme: localStorage.getItem('theme') || 'light',
    themeColor: localStorage.getItem('themeColor') || '#409EFF',
    darkMode: localStorage.getItem('darkMode') === 'true',

    // 语言设置
    language: localStorage.getItem('language') || 'zh-CN',

    // 应用设置
    showOriginalPhotos: localStorage.getItem('showOriginalPhotos') === 'true',
    encodeCopiedUrl: localStorage.getItem('encodeCopiedUrl') === 'true',
    autoUploadAfterSelect: localStorage.getItem('autoUploadAfterSelect') === 'true',
    uploadButtonAction: localStorage.getItem('uploadButtonAction') || 'direct',
    defaultStorageId: parseInt(localStorage.getItem('defaultStorageId')) || 3,

    // 窗口行为
    closeBehavior: localStorage.getItem('closeBehavior') || 'minimize', // minimize: 最小化, close: 直接关闭
    minimizeBehavior: localStorage.getItem('minimizeBehavior') || 'taskbar', // taskbar: 任务栏, tray: 托盘

    // 系统设置
    startAtLogin: localStorage.getItem('startAtLogin') === 'true',
    showNotification: localStorage.getItem('showNotification') !== 'false',

    loading: false
  }),

  getters: {
    isDarkMode: (state) => state.darkMode,
    isLightMode: (state) => !state.darkMode
  },

  actions: {
    // 切换主题
    toggleTheme() {
      this.darkMode = !this.darkMode
      this.applyTheme()
    },

    // 设置主题
    setTheme(mode) {
      this.darkMode = mode === 'dark'
      this.applyTheme()
    },

    // 应用主题
    applyTheme() {
      if (this.darkMode) {
        document.documentElement.setAttribute('class', 'dark')
      } else {
        document.documentElement.removeAttribute('class')
      }
      localStorage.setItem('darkMode', this.darkMode.toString())
      localStorage.setItem('theme', this.darkMode ? 'dark' : 'light')
    },

    // 设置主题颜色
    setThemeColor(color) {
      this.themeColor = color
      document.documentElement.style.setProperty('--el-color-primary', color)
      localStorage.setItem('themeColor', color)
    },

    // 设置语言
    setLanguage(language) {
      this.language = language
      localStorage.setItem('language', language)
    },

    // 更新应用设置
    updateSetting(key, value) {
      this[key] = value
      if (value !== undefined && value !== null) {
        localStorage.setItem(key, typeof value === 'boolean' ? value.toString() : value)
        // 窗口行为设置同步到 electron-store
        if (key === 'closeBehavior' || key === 'minimizeBehavior' || key === 'showNotification') {
          window.electronAPI?.setStore?.('settings.' + key, value)
        }
      } else {
        localStorage.removeItem(key)
      }
    },

    // 批量更新设置
    updateSettings(settings) {
      Object.keys(settings).forEach(key => {
        this.updateSetting(key, settings[key])
      })
    },

    // 保存设置到服务器
    async saveSettings() {
      this.loading = true
      try {
        const settings = {
          show_original_photos: this.showOriginalPhotos,
          encode_copied_url: this.encodeCopiedUrl,
          auto_upload_after_select: this.autoUploadAfterSelect,
          default_storage_id: this.defaultStorageId,
          upload_button_action: this.uploadButtonAction
        }

        const res = await userApi.saveSetting(settings)
        return res
      } finally {
        this.loading = false
      }
    },

    // 从用户信息加载设置
    loadSettingsFromUserOptions(options) {
      if (!options) return

      if (options.show_original_photos !== undefined) {
        this.showOriginalPhotos = options.show_original_photos
        localStorage.setItem('showOriginalPhotos', options.show_original_photos.toString())
      }
      if (options.encode_copied_url !== undefined) {
        this.encodeCopiedUrl = options.encode_copied_url
        localStorage.setItem('encodeCopiedUrl', options.encode_copied_url.toString())
      }
      if (options.auto_upload_after_select !== undefined) {
        this.autoUploadAfterSelect = options.auto_upload_after_select
        localStorage.setItem('autoUploadAfterSelect', options.auto_upload_after_select.toString())
      }
      if (options.default_storage_id !== undefined) {
        this.defaultStorageId = options.default_storage_id
        localStorage.setItem('defaultStorageId', options.default_storage_id.toString())
      }
    },

    // 从服务器加载设置
    async loadSettings() {
      // 从本地存储初始化
      this.applyTheme()
      this.setThemeColor(this.themeColor)
      // 同步窗口行为设置到 electron-store
      window.electronAPI?.setStore?.('settings.closeBehavior', this.closeBehavior)
      window.electronAPI?.setStore?.('settings.minimizeBehavior', this.minimizeBehavior)
      window.electronAPI?.setStore?.('settings.showNotification', this.showNotification)
    },

    // 切换通知
    async toggleNotification(enabled) {
      this.showNotification = enabled
      localStorage.setItem('showNotification', enabled.toString())
      window.electronAPI?.setStore?.('settings.showNotification', enabled)

      // 测试通知
      if (enabled) {
        await window.electronAPI?.showNotification?.({
          title: '通知已开启',
          body: '系统通知已成功启用'
        })
      }
    }
  }
})
