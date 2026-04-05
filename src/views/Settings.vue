<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useSettingStore } from '@/stores/setting'
import { useUserStore } from '@/stores/user'
import { Sunny, Moon } from '@element-plus/icons-vue'

const router = useRouter()
const { t } = useI18n()
const settingStore = useSettingStore()
const userStore = useUserStore()

const loading = ref(false)
const version = ref('')

const themeColors = [
  '#409EFF', '#67C23A', '#E6A23C', '#F56C6C',
  '#909399', '#3eaf7c', '#11a8cd', '#c23531'
]

const languageOptions = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' }
]

const storageOptions = [
  { label: '默认存储', value: 1 },
  { label: '高速存储', value: 3 }
]

const toggleTheme = () => {
  settingStore.toggleTheme()
}

const changeThemeColor = (color) => {
  settingStore.setThemeColor(color)
}

const changeLanguage = (lang) => {
  settingStore.setLanguage(lang)
  location.reload()
}

const selectCacheDirectory = async () => {
  try {
    const dir = await window.electronAPI?.selectDirectory?.()
    if (dir) {
      settingStore.setCacheDirectory(dir)
    }
  } catch (error) {
    ElMessage.error(t('settings.selectDirectoryFailed'))
  }
}

const selectDownloadDirectory = async () => {
  try {
    const dir = await window.electronAPI?.selectDirectory?.()
    if (dir) {
      settingStore.setDownloadDirectory(dir)
    }
  } catch (error) {
    ElMessage.error(t('settings.selectDirectoryFailed'))
  }
}

const saveSettings = async () => {
  loading.value = true
  try {
    await settingStore.saveSettings()
    ElMessage.success(t('settings.saveSuccess'))
  } catch (error) {
    ElMessage.error(t('settings.saveFailed'))
  } finally {
    loading.value = false
  }
}

const checkUpdate = async () => {
  try {
    await window.electronAPI?.checkUpdate?.()
  } catch (error) {
    ElMessage.error(t('settings.checkUpdateFailed'))
  }
}

const getVersion = async () => {
  try {
    version.value = await window.electronAPI?.getAppVersion?.()
  } catch (error) {
    console.error(t('settings.getVersionFailed'), error)
  }
}

const handleNotificationChange = async (enabled) => {
  try {
    // 使用 updateSetting 方法更新通知设置
    settingStore.updateSetting('showNotification', enabled)

    // 根据开关状态发送相应的通知
    if (enabled) {
      const result = await window.electronAPI?.showNotification?.({
        title: '通知已开启',
        body: '系统通知已成功启用'
      })

      if (result === true) {
        ElMessage.success('通知已开启（请检查系统通知权限）')
      } else if (result === false) {
        ElMessage.warning('通知功能不支持，请在系统设置中开启通知权限')
      }
    } else {
      const result = await window.electronAPI?.showNotification?.({
        title: '通知已关闭',
        body: '系统通知已关闭'
      })

      if (result === true) {
        ElMessage.info('通知已关闭')
      } else if (result === false) {
        ElMessage.info('通知已关闭')
      }
    }
  } catch (error) {
    console.error('切换通知失败:', error)
    ElMessage.error('切换通知失败')
  }
}

const handleCloseBehaviorChange = (value) => {
  settingStore.updateSetting('closeBehavior', value)
  ElMessage.success('关闭行为已更新')
}

const handleMinimizeBehaviorChange = (value) => {
  settingStore.updateSetting('minimizeBehavior', value)
  ElMessage.success('最小化行为已更新')
}

const handleStartAtLoginChange = (value) => {
  settingStore.updateSetting('startAtLogin', value)
  ElMessage.success(value ? '开机自启已开启' : '开机自启已关闭')
}

const handleOpenHomepage = () => {
  if (window.electronAPI?.openExternal) {
    window.electronAPI.openExternal('https://img.ksinx.com')
  } else {
    window.open('https://img.ksinx.com', '_blank')
  }
}

const handleGoToSync = () => {
  router.push('/sync')
}

onMounted(async () => {
  getVersion()
  // 加载设置（包括自动获取默认同步目录）
  await settingStore.loadSettings()
  // 从用户信息加载设置
  if (userStore.userInfo?.options) {
    settingStore.loadSettingsFromUserOptions(userStore.userInfo.options)
  }
})
</script>

<template>
  <div class="settings page-content">
    <el-card class="settings-card">
      <!-- 外观设置 -->
          <div class="settings-section">
            <h3>{{ t('settings.appearance') }}</h3>

            <div class="setting-item">
              <span class="setting-label">{{ t('settings.theme') }}</span>
              <div class="theme-toggle">
                <el-button
                  :type="!settingStore.darkMode ? 'primary' : 'default'"
                  @click="toggleTheme"
                >
                  <Sunny /> {{ t('settings.lightMode') }}
                </el-button>
                <el-button
                  :type="settingStore.darkMode ? 'primary' : 'default'"
                  @click="toggleTheme"
                >
                  <Moon /> {{ t('settings.darkMode') }}
                </el-button>
              </div>
            </div>

            <div class="setting-item">
              <span class="setting-label">{{ t('settings.themeColor') }}</span>
              <div class="color-picker">
                <div
                  v-for="color in themeColors"
                  :key="color"
                  class="color-item"
                  :style="{ backgroundColor: color }"
                  :class="{ active: settingStore.themeColor === color }"
                  @click="changeThemeColor(color)"
                />
              </div>
            </div>

            <div class="setting-item">
              <span class="setting-label">{{ t('settings.language') }}</span>
              <el-select v-model="settingStore.language" @change="changeLanguage">
                <el-option
                  v-for="option in languageOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </div>
          </div>

          <el-divider />

          <!-- 上传设置 -->
          <div class="settings-section">
            <h3>{{ t('settings.upload') }}</h3>

            <div class="setting-item">
              <span class="setting-label">{{ t('settings.showOriginalPhotos') }}</span>
              <el-switch v-model="settingStore.showOriginalPhotos" />
            </div>

            <div class="setting-item">
              <span class="setting-label">{{ t('settings.encodeCopiedUrl') }}</span>
              <el-switch v-model="settingStore.encodeCopiedUrl" />
            </div>

            <div class="setting-item">
              <span class="setting-label">{{ t('settings.autoUploadAfterSelect') }}</span>
              <el-switch v-model="settingStore.autoUploadAfterSelect" />
            </div>

            <div class="setting-item">
              <span class="setting-label">{{ t('settings.defaultStorage') }}</span>
              <el-select v-model="settingStore.defaultStorageId" :placeholder="t('settings.defaultStoragePlaceholder')">
                <el-option
                  v-for="option in storageOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </div>

            <div class="setting-item">
              <span class="setting-label">{{ t('settings.cacheDirectory') }}</span>
              <div class="path-input">
                <el-input v-model="settingStore.cacheDirectory" :placeholder="t('settings.cacheDirectoryPlaceholder')" readonly />
                <el-button @click="selectCacheDirectory">{{ t('settings.browse') }}</el-button>
              </div>
            </div>

            <div class="setting-item">
              <span class="setting-label">{{ t('settings.downloadDirectory') }}</span>
              <div class="path-input">
                <el-input v-model="settingStore.downloadDirectory" :placeholder="t('settings.downloadDirectoryPlaceholder')" readonly />
                <el-button @click="selectDownloadDirectory">{{ t('settings.browse') }}</el-button>
              </div>
            </div>
          </div>

          <el-divider />

          <!-- 同步设置 -->
          <div class="settings-section">
            <h3>{{ t('settings.sync') }}</h3>
            <div class="setting-item">
              <span class="setting-label">{{ t('settings.syncDescription') }}</span>
              <el-button type="primary" @click="handleGoToSync">
                {{ t('settings.goToSync') }}
              </el-button>
            </div>
          </div>

          <el-divider />

          <!-- 窗口行为 -->
          <div class="settings-section">
            <h3>{{ t('settings.window') }}</h3>

            <div class="setting-item">
              <span class="setting-label">{{ t('settings.closeBehavior') }}</span>
              <el-radio-group v-model="settingStore.closeBehavior" @change="handleCloseBehaviorChange">
                <el-radio value="minimize">{{ t('settings.closeMinimize') }}</el-radio>
                <el-radio value="close">{{ t('settings.closeExit') }}</el-radio>
              </el-radio-group>
            </div>

            <div class="setting-item">
              <span class="setting-label">{{ t('settings.minimizeBehavior') }}</span>
              <el-radio-group v-model="settingStore.minimizeBehavior" @change="handleMinimizeBehaviorChange">
                <el-radio value="taskbar">{{ t('settings.minimizeTaskbar') }}</el-radio>
                <el-radio value="tray">{{ t('settings.minimizeTray') }}</el-radio>
              </el-radio-group>
            </div>
          </div>

          <el-divider />

          <!-- 系统设置 -->
          <div class="settings-section">
            <h3>{{ t('settings.system') }}</h3>

            <div class="setting-item">
              <span class="setting-label">{{ t('settings.startAtLogin') }}</span>
              <el-switch v-model="settingStore.startAtLogin" @change="handleStartAtLoginChange" />
            </div>

            <div class="setting-item">
              <span class="setting-label">{{ t('settings.showNotification') }}</span>
              <el-switch v-model="settingStore.showNotification" @change="handleNotificationChange" />
            </div>

            <div class="setting-item">
              <span class="setting-label">{{ t('settings.autoUpdate') }}</span>
              <el-switch v-model="settingStore.autoUpdate" />
            </div>

            <div class="setting-item">
              <span class="setting-label">{{ t('settings.checkUpdate') }}</span>
              <el-button @click="checkUpdate">{{ t('settings.checkUpdate') }}</el-button>
            </div>
          </div>

          <el-divider />

          <!-- 关于 -->
          <div class="settings-section">
            <h3>{{ t('settings.about') }}</h3>

            <div class="setting-item">
              <span class="setting-label">{{ t('settings.version') }}</span>
              <span>{{ version }}</span>
            </div>

            <div class="setting-item">
              <span class="setting-label">{{ t('settings.homepage') }}</span>
              <el-link type="primary" @click="handleOpenHomepage">
                https://img.ksinx.com
              </el-link>
            </div>
          </div>

          <div v-if="userStore.isLoggedIn" class="settings-actions">
            <el-button type="primary" :loading="loading" @click="saveSettings">
              {{ t('common.save') }}
            </el-button>
          </div>
        </el-card>
  </div>
</template>

<style scoped>
.settings-card {
  max-width: 800px;
  margin: 0 auto;
}

.settings-section {
  padding: 8px 0;
}

.settings-section h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 20px;
  color: var(--text-color);
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  gap: 20px;
}

.setting-item > :first-child {
  text-align: left;
}

.setting-label {
  font-size: 14px;
  color: var(--text-color);
  min-width: 120px;
  line-height: 1.6;
  text-align: left;
}

:deep(.el-select) {
  width: 180px;
}

:deep(.el-radio-group) {
  display: flex;
  gap: 16px;
}

.theme-toggle {
  display: flex;
  gap: 12px;
}

.color-picker {
  display: flex;
  gap: 8px;
}

.path-input {
  display: flex;
  gap: 8px;
  flex: 1;
}

.path-input .el-input {
  flex: 1;
}

.color-item {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.3s;
}

.color-item:hover {
  transform: scale(1.1);
}

.color-item.active {
  border-color: var(--text-color);
}

.settings-actions {
  margin-top: 24px;
  text-align: center;
}

.settings-actions .el-button {
  min-width: 120px;
}
</style>
