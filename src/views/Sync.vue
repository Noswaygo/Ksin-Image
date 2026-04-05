<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { useSettingStore } from '@/stores/setting'
import { useUserStore } from '@/stores/user'
import { Refresh, FolderOpened, Warning, SuccessFilled, CircleCheck, WarningFilled } from '@element-plus/icons-vue'

const { t } = useI18n()
const settingStore = useSettingStore()
const userStore = useUserStore()

const syncing = ref(false)
const lastSyncTime = ref('')
const syncLog = ref([])
const currentStep = ref(0)

const syncSteps = [
  { label: '扫描本地图片', icon: 'search' },
  { label: '对比云端文件', icon: 'compare' },
  { label: '上传新文件', icon: 'upload' },
  { label: '同步完成', icon: 'done' }
]

const isLoggedIn = computed(() => userStore.isLoggedIn)

const handleAutoSyncChange = async (value) => {
  settingStore.updateSetting('autoSync', value)
  ElMessage.success(value ? t('sync.autoSyncEnabled') : t('sync.autoSyncDisabled'))
  await window.electronAPI?.showNotification?.({
    title: value ? t('sync.autoSyncEnabled') : t('sync.autoSyncDisabled'),
    body: value ? t('sync.syncStarted') : t('sync.syncStopped')
  })
}

const handleSelectSyncDirectory = async () => {
  if (!isLoggedIn.value) {
    window.electronAPI?.openAuthWindow?.('login')
    return
  }
  try {
    const defaultPath = settingStore.syncDirectory || undefined
    const result = await window.electronAPI?.showOpenDialog?.({
      properties: ['openDirectory'],
      title: t('sync.selectSyncDirectory'),
      defaultPath: defaultPath
    })

    if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
      settingStore.updateSetting('syncDirectory', result.filePaths[0])
      ElMessage.success(t('sync.directoryUpdated') + ': ' + result.filePaths[0])
    }
  } catch (error) {
    console.error('选择目录失败:', error)
    ElMessage.error(t('sync.selectDirectoryFailed'))
  }
}

const handleSyncNow = async () => {
  if (!isLoggedIn.value) {
    window.electronAPI?.openAuthWindow?.('login')
    return
  }

  syncing.value = true
  currentStep.value = 0
  syncLog.value = []

  try {
    // 模拟同步步骤
    const steps = [
      { msg: t('sync.scanningFiles'), step: 0 },
      { msg: t('sync.comparingFiles'), step: 1 },
      { msg: t('sync.uploadingFiles'), step: 2 },
      { msg: t('sync.syncComplete'), step: 3 }
    ]

    for (const s of steps) {
      await new Promise(resolve => setTimeout(resolve, 800))
      currentStep.value = s.step
      syncLog.value.push({
        time: new Date().toLocaleTimeString(),
        message: s.msg,
        type: s.step === 3 ? 'success' : 'info'
      })
    }

    lastSyncTime.value = new Date().toLocaleString()
    ElMessage.success(t('sync.syncComplete'))
  } catch (error) {
    syncLog.value.push({
      time: new Date().toLocaleTimeString(),
      message: t('sync.syncFailed'),
      type: 'error'
    })
    ElMessage.error(t('sync.syncFailed'))
  } finally {
    syncing.value = false
  }
}

onMounted(async () => {
  await settingStore.loadSettings()
})
</script>

<template>
  <div class="sync-page page-content">
    <!-- 同步状态卡片 -->
    <el-card class="sync-status-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">{{ t('sync.syncStatus') }}</span>
          <div class="header-actions">
            <el-switch
              v-model="settingStore.autoSync"
              :active-text="t('sync.autoSync')"
              @change="handleAutoSyncChange"
            />
          </div>
        </div>
      </template>

      <!-- 登录提示 -->
      <div v-if="!isLoggedIn" class="login-tip">
        <el-icon :size="40" color="#E6A23C"><Warning /></el-icon>
        <p>{{ t('sync.loginRequired') }}</p>
        <el-button type="primary" @click="window.electronAPI?.openAuthWindow?.('login')">
          {{ t('auth.login') }}
        </el-button>
      </div>

      <template v-else>
        <!-- 同步信息 -->
        <div class="sync-info">
          <div class="info-row">
            <span class="info-label">{{ t('sync.syncStatus') }}</span>
            <span class="info-value">
              <el-tag :type="settingStore.autoSync ? 'success' : 'info'" size="small">
                {{ settingStore.autoSync ? t('sync.syncing') : t('sync.syncPaused') }}
              </el-tag>
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">{{ t('sync.syncDirectory') }}</span>
            <div class="info-value directory-value">
              <el-icon><FolderOpened /></el-icon>
              <span class="dir-text">{{ settingStore.syncDirectory || t('sync.notSet') }}</span>
              <el-button size="small" @click="handleSelectSyncDirectory">
                {{ t('sync.changeDirectory') }}
              </el-button>
            </div>
          </div>
          <div class="info-row">
            <span class="info-label">{{ t('sync.lastSync') }}</span>
            <span class="info-value">{{ lastSyncTime || t('sync.neverSynced') }}</span>
          </div>
        </div>

        <!-- 手动同步按钮 -->
        <div class="sync-actions">
          <el-button
            type="primary"
            size="large"
            :loading="syncing"
            :icon="Refresh"
            @click="handleSyncNow"
          >
            {{ syncing ? t('sync.syncingNow') : t('sync.syncNow') }}
          </el-button>
        </div>

        <!-- 同步进度 -->
        <div v-if="syncing || syncLog.length > 0" class="sync-progress">
          <el-steps :active="currentStep" finish-status="success" align-center>
            <el-step v-for="step in syncSteps" :key="step.label" :title="step.label" />
          </el-steps>
        </div>

        <!-- 同步日志 -->
        <div v-if="syncLog.length > 0" class="sync-log">
          <h4>{{ t('sync.syncLog') }}</h4>
          <div class="log-list">
            <div
              v-for="(log, index) in syncLog"
              :key="index"
              class="log-item"
              :class="'log-' + log.type"
            >
              <el-icon v-if="log.type === 'success'" class="log-icon"><SuccessFilled /></el-icon>
              <el-icon v-else-if="log.type === 'error'" class="log-icon"><WarningFilled /></el-icon>
              <el-icon v-else class="log-icon"><CircleCheck /></el-icon>
              <span class="log-time">[{{ log.time }}]</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
          </div>
        </div>
      </template>
    </el-card>
  </div>
</template>

<style scoped>
.sync-page {
  margin: -24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}

.login-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 0;
  color: var(--text-color-secondary);
}

.login-tip p {
  font-size: 14px;
  margin: 0;
}

.sync-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.info-label {
  font-size: 14px;
  color: var(--text-color-secondary);
  min-width: 100px;
}

.info-value {
  font-size: 14px;
  color: var(--text-color);
  display: flex;
  align-items: center;
  gap: 8px;
}

.directory-value {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dir-text {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sync-actions {
  display: flex;
  justify-content: center;
  margin: 24px 0;
}

.sync-progress {
  margin: 24px 0;
}

.sync-log {
  margin-top: 24px;
}

.sync-log h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 12px;
}

.log-list {
  max-height: 200px;
  overflow-y: auto;
  background: var(--hover-bg);
  border-radius: 8px;
  padding: 12px;
}

.log-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
}

.log-icon {
  flex-shrink: 0;
}

.log-time {
  color: var(--text-color-secondary);
  flex-shrink: 0;
}

.log-message {
  color: var(--text-color);
}

.log-success .log-icon {
  color: #67C23A;
}

.log-error .log-icon {
  color: #F56C6C;
}
</style>
