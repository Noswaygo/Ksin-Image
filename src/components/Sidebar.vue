<script setup>
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/user'
import { useSettingStore } from '@/stores/setting'
import {
  Picture,
  Upload,
  Folder,
  Share,
  ShoppingBag,
  Tickets,
  Key,
  User,
  Setting,
  SwitchButton,
  PictureRounded,
  Document,
  ChatDotRound,
  Coin,
  Refresh
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const userStore = useUserStore()
const settingStore = useSettingStore()

// 监听主题变化
watch(() => settingStore.darkMode, () => {
  settingStore.applyTheme()
})

const menuItems = computed(() => [
  { path: '/home', icon: PictureRounded, text: t('nav.home') },
  { path: '/upload', icon: Upload, text: t('nav.upload') },
  { path: '/photos', icon: Picture, text: t('nav.myPhotos') },
  { path: '/albums', icon: Folder, text: t('nav.myAlbums') },
  { path: '/shares', icon: Share, text: t('nav.myShares') },
  { path: '/subscription', icon: Coin, text: t('nav.subscription') },
  { path: '/orders', icon: Document, text: t('nav.orders') },
  { path: '/tickets', icon: ChatDotRound, text: t('nav.tickets') },
  { path: '/tokens', icon: Key, text: t('nav.tokens') },
  { path: '/profile', icon: User, text: t('nav.profile') },
  { path: '/sync', icon: Refresh, text: t('nav.sync') },
  { path: '/settings', icon: Setting, text: t('nav.settings') }
])

const activeMenu = computed(() => route.path)

const handleMenuClick = (path) => {
  router.push(path)
}

const handleLogout = async () => {
  await userStore.logout()
  router.push('/login')
}

// 响应式主题状态
const isDarkTheme = computed(() => settingStore.darkMode)

onMounted(() => {
  settingStore.applyTheme()
})
</script>

<template>
  <div class="sidebar" :key="isDarkTheme">
    <div class="sidebar-menu">
      <div
        v-for="item in menuItems"
        :key="item.path"
        class="menu-item"
        :class="{ active: activeMenu === item.path }"
        @click="handleMenuClick(item.path)"
      >
        <component :is="item.icon" class="menu-item-icon" />
        <span class="menu-item-text">{{ item.text }}</span>
      </div>
    </div>

    <div class="sidebar-footer" v-if="userStore.isLoggedIn">
      <div class="logout-button" @click="handleLogout">
        <SwitchButton class="menu-item-icon" />
        <span class="menu-item-text">{{ t('nav.logout') }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  width: 160px;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-color);
  border-right: 1px solid var(--border-color);
}

.sidebar-menu {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow-y: auto;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-color-secondary);
}

.menu-item:hover {
  background: var(--hover-bg);
  color: var(--text-color);
}

.menu-item.active {
  background: var(--active-bg);
  color: var(--primary-color);
}

.menu-item-icon {
  width: 16px;
  height: 16px;
  margin-right: 12px;
}

.menu-item-text {
  font-size: 14px;
  white-space: nowrap;
}

.sidebar-footer {
  padding: 12px 8px;
  border-top: 1px solid var(--border-color);
}

.logout-button {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-color-secondary);
}

.logout-button:hover {
  background: var(--hover-bg);
  color: var(--danger-color);
}

.logout-button .menu-item-icon {
  color: inherit;
}
</style>
