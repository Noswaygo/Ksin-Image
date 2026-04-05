<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSettingStore } from '@/stores'
import { Close, View, Star } from '@element-plus/icons-vue'

const route = useRoute()
const settingStore = useSettingStore()
const imageUrl = ref('')
const imageName = ref('')
const imageInfo = ref({})
const scale = ref(1)
const position = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const startPos = ref({ x: 0, y: 0 })
const imgSize = ref({ width: 0, height: 0 })
const containerSize = ref({ width: 0, height: 0 })

const handleClose = () => {
  window.electronAPI?.closeViewerWindow?.()
}

const handleWheel = (e) => {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const minScale = getMinScale()
  scale.value = Math.max(minScale, Math.min(5, scale.value + delta))
}

const getMinScale = () => {
  if (!imgSize.value.width || !containerSize.value.width) return 0.1
  const imgRatio = imgSize.value.width / imgSize.value.height
  const containerRatio = containerSize.value.width / containerSize.value.height
  // 图片宽高比更大时，以宽度为基准；否则以高度为基准
  return imgRatio > containerRatio
    ? containerSize.value.width / imgSize.value.width
    : containerSize.value.height / imgSize.value.height
}

const handleMouseDown = (e) => {
  if (scale.value > 1) {
    isDragging.value = true
    startPos.value = { x: e.clientX - position.value.x, y: e.clientY - position.value.y }
  }
}

const handleMouseMove = (e) => {
  if (isDragging.value) {
    let newX = e.clientX - startPos.value.x
    let newY = e.clientY - startPos.value.y
    const scaledW = imgSize.value.width * scale.value
    const scaledH = imgSize.value.height * scale.value
    const maxX = Math.max(0, (scaledW - containerSize.value.width) / 2)
    const maxY = Math.max(0, (scaledH - containerSize.value.height) / 2)
    newX = Math.max(-maxX, Math.min(maxX, newX))
    newY = Math.max(-maxY, Math.min(maxY, newY))
    position.value = { x: newX, y: newY }
  }
}

const handleMouseUp = () => {
  isDragging.value = false
}

const handleImgLoad = (e) => {
  const img = e.target
  imgSize.value = { width: img.naturalWidth, height: img.naturalHeight }
  const container = img.parentElement
  if (container) {
    containerSize.value = { width: container.clientWidth, height: container.clientHeight }
  }
}

const transformStyle = computed(() => ({
  transform: `translate(${position.value.x}px, ${position.value.y}px) scale(${scale.value})`,
  transformOrigin: 'center center',
  cursor: isDragging.value ? 'grabbing' : scale.value > 1 ? 'grab' : 'default'
}))

onMounted(() => {
  settingStore.applyTheme()
  settingStore.setThemeColor(settingStore.themeColor)
  
  imageUrl.value = decodeURIComponent(route.query.url || '')
  imageName.value = decodeURIComponent(route.query.name || '')
  try {
    const infoStr = decodeURIComponent(route.query.info || '{}')
    imageInfo.value = JSON.parse(infoStr)
  } catch (e) {
    imageInfo.value = {}
  }
})
</script>

<template>
  <div class="viewer">
    <!-- 标题栏 -->
    <div class="title-bar" :class="{ 'dark-title': settingStore.isDarkMode }">
      <div class="title-bar-drag"></div>
      <div class="title-bar-title">{{ imageName || '图片查看' }}</div>
      <div class="title-bar-controls">
        <button class="control-btn close-btn" @click="handleClose">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 图片内容 -->
    <div class="viewer-content">
      <img v-if="imageUrl" :src="imageUrl" :alt="imageName" draggable="false" :style="transformStyle" @wheel="handleWheel" @mousedown="handleMouseDown" @mousemove="handleMouseMove" @mouseup="handleMouseUp" @mouseleave="handleMouseUp" @load="handleImgLoad" />
    </div>

    <!-- 底部信息 -->
    <div class="viewer-footer">
      <div class="image-name">{{ imageName }}</div>
      <div class="image-meta">
        <span v-if="imageInfo?.user"><View /> {{ imageInfo.user.name || imageInfo.user.username }}</span>
        <span><View /> {{ imageInfo?.views || 0 }}</span>
        <span><Star /> {{ imageInfo?.likes || 0 }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.viewer {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #000;
  overflow: hidden;
}

.title-bar {
  display: flex;
  align-items: center;
  height: 40px;
  background: var(--bg-color);
  flex-shrink: 0;
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
  white-space: nowrap;
}

.dark-title {
  background: #1a1a1a;
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

.viewer-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.viewer-content img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
  transition: transform 0.2s;
}

.viewer-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: var(--bg-color);
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.image-name {
  color: var(--text-color);
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-meta {
  display: flex;
  gap: 20px;
  color: var(--text-color-secondary);
  font-size: 13px;
}

.image-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>