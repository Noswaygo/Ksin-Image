<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { useSettingStore } from '@/stores'

const { t } = useI18n()
const settingStore = useSettingStore()

const updateInfo = ref(null)
const downloadProgress = ref(0)
const isDownloading = ref(false)
const isDownloaded = ref(false)
const statusText = ref('')

const handleClose = () => {
  window.electronAPI?.closeWindow?.()
}

const startUpdate = async () => {
  try {
    await window.electronAPI?.downloadUpdate?.()
  } catch (error) {
    ElMessage.error('下载更新失败')
  }
}

const installUpdate = async () => {
  try {
    // 关闭当前更新窗口
    window.electronAPI?.closeWindow?.()
    // 等待一小段时间确保窗口关闭
    await new Promise(resolve => setTimeout(resolve, 300))
    // 退出并安装更新
    await window.electronAPI?.installUpdate?.()
  } catch (error) {
    ElMessage.error('安装更新失败')
  }
}

let messageListener = null
let availableListener = null
let errorListener = null
let progressListener = null
let downloadedListener = null

onMounted(() => {
  settingStore.applyTheme()
  settingStore.setThemeColor(settingStore.themeColor)

  messageListener = (event, message) => {
    statusText.value = message
    if (message === '当前已是最新版本') {
      ElMessage.info(message)
    }
  }

  availableListener = (event, info) => {
    updateInfo.value = info
    isDownloaded.value = false
    downloadProgress.value = 0
    statusText.value = `发现新版本: ${info.version || '最新版本'}`
  }

  errorListener = (event, error) => {
    statusText.value = '检查更新失败'
    ElMessage.error(error?.message || '更新出错')
  }

  progressListener = (event, progress) => {
    isDownloading.value = true
    downloadProgress.value = Math.round(progress.percent || 0)
    statusText.value = `正在下载: ${downloadProgress.value}%`
  }

  downloadedListener = (event, info) => {
    isDownloading.value = false
    isDownloaded.value = true
    downloadProgress.value = 100
    statusText.value = '下载完成，正在准备安装...'
    ElMessage.success('更新已下载完成')

    // 自动安装更新
    setTimeout(async () => {
      try {
        window.electronAPI?.closeWindow?.()
        await new Promise(resolve => setTimeout(resolve, 300))
        await window.electronAPI?.installUpdate?.()
      } catch (error) {
        ElMessage.error('自动安装失败，请手动点击安装')
      }
    }, 1500)
  }

  window.electronAPI?.onUpdateMessage?.(messageListener)
  window.electronAPI?.onUpdateAvailable?.(availableListener)
  window.electronAPI?.onUpdateError?.(errorListener)
  window.electronAPI?.onDownloadProgress?.(progressListener)
  window.electronAPI?.onUpdateDownloaded?.(downloadedListener)
})

onUnmounted(() => {
  if (messageListener) window.electronAPI?.offUpdateMessage?.(messageListener)
  if (availableListener) window.electronAPI?.offUpdateAvailable?.(availableListener)
  if (errorListener) window.electronAPI?.offUpdateError?.(errorListener)
  if (progressListener) window.electronAPI?.offDownloadProgress?.(progressListener)
  if (downloadedListener) window.electronAPI?.offUpdateDownloaded?.(downloadedListener)
})
</script>

<template>
  <div class="update-page">
    <!-- 标题栏 -->
    <div class="title-bar" :class="{ 'dark-title': settingStore.isDarkMode }">
      <div class="title-bar-drag"></div>
      <div class="title-bar-title">{{ t('settings.updateTitle') }}</div>
      <div class="title-bar-controls">
        <button class="control-btn close-btn" @click="handleClose">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 更新内容 -->
    <div class="update-content">
      <div class="update-icon">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="30" fill="#E8F5E9" stroke="#00D1B2" stroke-width="2"/>
          <path d="M32 18V38M26 32L32 38L38 32" stroke="#00D1B2" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>

      <div class="update-info">
        <h3>{{ t('settings.updateNewVersion') }}</h3>
        <p v-if="updateInfo?.version">{{ t('settings.updateVersion') }}: {{ updateInfo.version }}</p>
        <p v-if="updateInfo?.releaseDate">{{ t('settings.updateReleaseDate') }}: {{ updateInfo.releaseDate }}</p>
        <p v-if="updateInfo?.releaseNotes" class="release-notes">{{ updateInfo.releaseNotes }}</p>
      </div>

      <div class="progress-section" v-if="isDownloading || isDownloaded">
        <el-progress
          :percentage="downloadProgress"
          :stroke-width="8"
          :format="() => `${downloadProgress}%`"
          :status="isDownloaded ? 'success' : ''"
        />
        <p class="status-text">{{ statusText }}</p>
      </div>

      <div v-else class="status-text">{{ statusText || t('settings.updateChecking') }}</div>

      <div class="update-actions">
        <el-button @click="handleClose">{{ t('settings.updateLater') }}</el-button>
        <el-button
          v-if="isDownloaded"
          type="primary"
          @click="installUpdate"
        >
          {{ t('settings.updateInstallNow') }}
        </el-button>
        <el-button
          v-else-if="updateInfo && !isDownloading"
          type="primary"
          @click="startUpdate"
        >
          {{ t('settings.updateDownload') }}
        </el-button>
        <el-button
          v-else-if="isDownloading"
          type="info"
          disabled
        >
          {{ t('settings.updateDownloading') }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.update-page {
  min-height: 100vh;
  background: var(--bg-color);
}

.title-bar {
  display: flex;
  align-items: center;
  height: 40px;
  background: var(--bg-color);
  border-bottom: 1px solid var(--border-color);
  -webkit-app-region: drag;
  position: relative;
}

.title-bar-drag {
  flex: 1;
}

.title-bar-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 13px;
  color: var(--text-color);
}

.dark-title {
  background: #1a1a1a;
  border-bottom-color: #333;
}

.title-bar-controls {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  -webkit-app-region: no-drag;
}

.control-btn {
  width: 46px;
  height: 100%;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color-secondary);
  transition: all 0.2s;
}

.control-btn:hover {
  background: var(--hover-bg);
}

.close-btn:hover {
  background: #c42b1c;
  color: #fff;
}

.update-content {
  text-align: center;
  padding: 30px 20px;
}

.update-icon {
  margin-bottom: 20px;
}

.update-info {
  margin-bottom: 20px;
}

.update-info h3 {
  color: #00D1B2;
  font-size: 20px;
  margin-bottom: 12px;
}

.update-info p {
  color: var(--text-color-secondary);
  font-size: 14px;
  margin: 6px 0;
}

.release-notes {
  margin-top: 12px;
  padding: 12px;
  background: var(--bg-color-secondary);
  border-radius: 8px;
  text-align: left;
  max-height: 150px;
  overflow-y: auto;
}

.progress-section {
  margin: 20px 0;
}

.status-text {
  margin-top: 12px;
  color: var(--text-color-tertiary);
  font-size: 13px;
}

.update-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
}
</style>