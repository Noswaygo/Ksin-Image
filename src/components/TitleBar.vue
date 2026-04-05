<script setup>
import { ref, onMounted } from 'vue'
import { Minus, Close, FullScreen, Refresh, CopyDocument } from '@element-plus/icons-vue'

const isMaximized = ref(false)

onMounted(async () => {
  isMaximized.value = await window.electronAPI?.windowControl?.('isMaximized')
})

const handleMinimize = () => {
  window.electronAPI?.windowControl?.('minimize')
}

const handleMaximize = async () => {
  await window.electronAPI?.windowControl?.('maximize')
  isMaximized.value = await window.electronAPI?.windowControl?.('isMaximized')
}

const handleClose = () => {
  window.electronAPI?.windowControl?.('close')
}

const handleRefresh = () => {
  window.location.reload()
}
</script>

<template>
  <div class="title-bar">
    <div class="title-bar-left">
      <img src="/icons.svg" alt="Ksin Image" class="title-icon" />
      <span class="title">Ksin Image</span>
    </div>
    <div class="title-bar-right">
      <button class="control-button refresh" @click="handleRefresh" title="刷新">
        <Refresh />
      </button>
      <button class="control-button minimize" @click="handleMinimize" title="最小化">
        <Minus />
      </button>
      <button class="control-button maximize" @click="handleMaximize" :title="isMaximized ? '还原' : '最大化'">
        <FullScreen v-if="!isMaximized" />
        <CopyDocument v-else />
      </button>
      <button class="control-button close" @click="handleClose" title="关闭">
        <Close />
      </button>
    </div>
  </div>
</template>

<style scoped>
.title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 48px;
  background: var(--bg-color);
  border-bottom: 1px solid var(--border-color);
  -webkit-app-region: drag;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1000;
}

.title-bar-left {
  display: flex;
  align-items: center;
  padding-left: 20px;
  gap: 10px;
}

.title-icon {
  width: 24px;
  height: 24px;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
  letter-spacing: 0.3px;
}

.title-bar-right {
  display: flex;
  -webkit-app-region: no-drag;
}

.control-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-color-secondary);
}

.control-button:hover {
  background: var(--hover-bg);
  color: var(--text-color);
}

.control-button.close:hover {
  background: #f56c6c;
  color: #ffffff;
}

.control-button svg {
  width: 18px;
  height: 18px;
}
</style>
