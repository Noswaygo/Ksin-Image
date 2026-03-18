<script setup>
import { onMounted, nextTick } from 'vue'
import { useSettingStore } from '@/stores'
import { useUserStore } from '@/stores'
import router from './router'

const settingStore = useSettingStore()
const userStore = useUserStore()

onMounted(async () => {
  // 应用主题
  settingStore.applyTheme()
  settingStore.setThemeColor(settingStore.themeColor)

  // 打印当前状态
  console.log('App onMounted')
  console.log('当前 token:', userStore.token)
  console.log('当前 isLoggedIn:', userStore.isLoggedIn)
  console.log('当前 userInfo:', userStore.userInfo)

  // 如果已登录，获取用户信息
  if (userStore.isLoggedIn) {
    console.log('应用启动时获取用户信息，token:', userStore.token)
    try {
      await userStore.fetchUserInfo()
      console.log('用户信息获取成功:', userStore.userInfo)
    } catch (error) {
      console.error('获取用户信息失败:', error)
      // 如果获取失败，可能是token过期，清除登录状态
      if (error.message?.includes('401') || error.status === 401) {
        userStore.logout()
      }
    }
  }

  // 监听登录成功事件
  window.electronAPI?.onAuthSuccess?.(async (data) => {
    console.log('========== 收到登录成功事件 ==========')
    console.log('收到数据:', data)
    console.log('事件触发前 - token:', userStore.token)
    console.log('事件触发前 - isLoggedIn:', userStore.isLoggedIn)
    console.log('事件触发前 - userInfo:', userStore.userInfo)

    // 使用接收到的数据更新 store
    if (data?.token) {
      userStore.setToken(data.token)
    }
    if (data?.userInfo) {
      userStore.setUserInfo(data.userInfo)
    }

    console.log('数据更新后 - token:', userStore.token)
    console.log('数据更新后 - isLoggedIn:', userStore.isLoggedIn)
    console.log('数据更新后 - userInfo:', userStore.userInfo)

    // 再次获取用户信息以确保最新
    try {
      await userStore.fetchUserInfo()
      console.log('用户信息获取成功:', userStore.userInfo)
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
  })

  // 监听页面可见性变化，当从独立窗口返回时刷新用户信息
  document.addEventListener('visibilitychange', async () => {
    console.log('页面可见性变化:', document.visibilityState)
    if (document.visibilityState === 'visible' && userStore.isLoggedIn) {
      console.log('页面重新可见，刷新用户信息')
      await nextTick()
      userStore.fetchUserInfo().catch(console.error)
    }
  })
})

// 监听更新消息
window.electronAPI?.onUpdateMessage?.((event, message) => {
  console.log('更新消息:', message)
})

window.electronAPI?.onUpdateAvailable?.((event, info) => {
  console.log('发现新版本:', info)
})

window.electronAPI?.onUpdateError?.((event, error) => {
  console.log('更新错误:', error)
})

window.electronAPI?.onDownloadProgress?.((event, progress) => {
  console.log('下载进度:', progress)
})

window.electronAPI?.onUpdateDownloaded?.((event, info) => {
  console.log('更新下载完成:', info)
})
</script>

<template>
  <router-view />
</template>

<style>
#app {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
