<script setup>
import { computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import TitleBar from '@/components/TitleBar.vue'
import Sidebar from '@/components/Sidebar.vue'
import { User, Setting, SwitchButton, Trophy, Share } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const userStore = useUserStore()

const isAuthPage = computed(() => route.path === '/login' || route.path === '/register')
const showSidebar = computed(() => !route.meta?.hideSidebar)

// 调试：监听登录状态变化
watch(() => userStore.isLoggedIn, (newVal) => {
  console.log('Layout - isLoggedIn 变化:', newVal)
  console.log('Layout - token:', userStore.token)
  console.log('Layout - userInfo:', userStore.userInfo)
}, { immediate: true })

const handleLogin = () => {
  window.electronAPI?.openAuthWindow?.('login')
}

const handleRegister = () => {
  window.electronAPI?.openAuthWindow?.('register')
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await userStore.logout()
    ElMessage.success('退出登录成功')
  } catch (error) {
    // 用户取消
  }
}

const goToProfile = () => {
  router.push('/profile')
}

const goToSettings = () => {
  router.push('/settings')
}

const goToSubscription = () => {
  router.push('/subscription')
}

const goToShares = () => {
  router.push('/shares')
}

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 KB'
  const units = ['KB', 'MB', 'GB', 'TB', 'PB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const size = bytes / Math.pow(k, i)
  return parseFloat(size.toFixed(2)) + ' ' + units[i]
}

// 新增：统一转换为KB后再格式化
const formatStorageValue = (value, unit) => {
  if (!value || value === 0) return 0
  // 根据单位转换成KB
  if (unit === 'GB') return value * 1024 * 1024
  if (unit === 'MB') return value * 1024
  return value
}

const getStoragePercentage = () => {
  const userInfo = userStore.userInfo

  // API返回的字段名是 used_storage 和 total_storage，单位都是KB
  const usedKB = userInfo?.used_storage || 0
  const totalKB = userInfo?.total_storage || 0

  console.log('used_storage (KB):', usedKB, 'total_storage (KB):', totalKB)

  if (totalKB === 0) return 0
  const percentage = (usedKB / totalKB) * 100
  console.log('percentage:', percentage)

  return Math.min(Math.round(percentage), 100)
}

onMounted(() => {
  // 监听登录成功事件，当登录窗口关闭时刷新 UI
  window.electronAPI?.onAuthSuccess?.(async () => {
    console.log('Layout 收到登录成功事件')
    // userStore 的状态会自动响应式更新，无需额外操作
  })

  // 检查当前登录状态
  if (userStore.isLoggedIn && !userStore.userInfo) {
    console.log('已登录但用户信息为空，获取用户信息')
    userStore.fetchUserInfo().catch(console.error)
  }

  // 调试：打印用户信息
  console.log('Layout onMounted - userInfo:', userStore.userInfo)
})

onUnmounted(() => {
  // 清理事件监听
})
</script>

<template>
  <div class="layout">
    <TitleBar />
    <div class="layout-content">
      <Sidebar v-if="showSidebar" />
      <main class="main-content" :class="{ 'full-width': !showSidebar }">
        <div class="page-header">
          <h2>{{ route.meta?.titleKey ? t(route.meta.titleKey) : '' }}</h2>
          <div class="header-actions">
            <div v-if="userStore.isLoggedIn" class="user-info">
              <div v-if="userStore.userInfo" class="storage-info">
                <div class="storage-bar">
                  <div
                    class="storage-used"
                    :style="{ width: getStoragePercentage() + '%' }"
                  />
                </div>
                <span class="storage-text">{{ formatBytes(userStore.userInfo.used_storage || 0) }} / {{ formatBytes(userStore.userInfo.total_storage || 0) }}</span>
              </div>
              <el-dropdown trigger="click">
                <div class="user-avatar-container">
                  <img
                    :src="userStore.avatar || '/src/assets/default-avatar.svg'"
                    alt="Avatar"
                    class="user-avatar"
                  />
                  <span class="user-name">{{ userStore.username || userStore.email || '用户' }}</span>
                </div>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="goToProfile">
                      <el-icon :size="16"><User /></el-icon> {{ t('common.personalCenter') }}
                    </el-dropdown-item>
                    <el-dropdown-item @click="goToSubscription">
                      <el-icon :size="16"><Trophy /></el-icon> {{ t('nav.subscription') }}
                    </el-dropdown-item>
                    <el-dropdown-item @click="goToShares">
                      <el-icon :size="16"><Share /></el-icon> {{ t('nav.myShares') }}
                    </el-dropdown-item>
                    <el-dropdown-item @click="goToSettings">
                      <el-icon :size="16"><Setting /></el-icon> {{ t('nav.settings') }}
                    </el-dropdown-item>
                    <el-dropdown-item divided @click="handleLogout">
                      <el-icon :size="16"><SwitchButton /></el-icon> {{ t('nav.logout') }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
            <div v-else class="auth-buttons">
              <el-button type="primary" @click="handleLogin">{{ t('auth.login') }}</el-button>
              <el-button @click="handleRegister">{{ t('auth.register') }}</el-button>
            </div>
          </div>
        </div>
        <div class="page-content" :class="{ 'no-scroll': route.path.startsWith('/tickets/') && route.path !== '/tickets' }">
          <router-view />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-color);
}

.layout-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-content.full-width {
  width: 100%;
}

.page-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-color);
}

.header-actions {
  display: flex;
  align-items: center;
}

.storage-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 12px;
  padding: 4px 12px;
  background: var(--hover-bg);
  border-radius: 12px;
}

.storage-bar {
  width: 80px;
  height: 6px;
  background: var(--border-color);
  border-radius: 3px;
  overflow: hidden;
}

.storage-used {
  height: 100%;
  background: linear-gradient(90deg, #67c23a, #409eff);
  border-radius: 3px;
  transition: width 0.3s;
}

.storage-text {
  font-size: 12px;
  color: var(--text-color-secondary);
  min-width: 36px;
}

.user-info {
  display: flex;
  align-items: center;
}

.user-avatar-container {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--hover-bg);
}

.user-avatar-container:hover {
  background: var(--active-bg);
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.user-name {
  font-size: 14px;
  color: var(--text-color);
  font-weight: 500;
}

.auth-buttons {
  display: flex;
  gap: 12px;
}

.page-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.page-content.no-scroll {
  overflow-y: hidden;
  padding: 0;
}

/* 下拉菜单图标大小 */
:deep(.el-dropdown-menu .el-dropdown-menu__item .el-icon) {
  width: 16px;
  height: 16px;
  margin-right: 8px;
}
</style>
