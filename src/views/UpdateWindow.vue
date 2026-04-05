<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Close } from '@element-plus/icons-vue'

const { t } = useI18n()

const visible = ref(false)
const updateInfo = ref(null)
const downloadProgress = ref(0)
const isDownloading = ref(false)
const isDownloaded = ref(false)
const statusText = ref('')

const handleClose = () => {
  visible.value = false
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
  // 监听更新消息
  messageListener = (event, message) => {
    statusText.value = message
    if (message === '当前已是最新版本') {
      ElMessage.info(message)
    }
  }

  availableListener = (event, info) => {
    updateInfo.value = info
    visible.value = true
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
    statusText.value = '下载完成，点击安装更新'
    ElMessage.success('更新已下载完成')
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

// 暴露打开窗口的方法
defineExpose({ open: () => visible.value = true })
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="t('settings.updateTitle')"
    width="420"
    :close-on-click-modal="false"
    class="update-dialog"
    :show-close="false"
  >
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
    </div>

    <template #footer>
      <div class="dialog-footer">
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
    </template>
  </el-dialog>
</template>

<style scoped>
.update-content {
  text-align: center;
  padding: 20px 0;
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
  color: #666;
  font-size: 14px;
  margin: 6px 0;
}

.release-notes {
  margin-top: 12px;
  padding: 12px;
  background: #f5f5f5;
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
  color: #999;
  font-size: 13px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>