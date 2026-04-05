<script setup>
import { ref, onMounted, onUnmounted, watch, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CopyDocument, Share, Close, Delete, Sort, Loading } from '@element-plus/icons-vue'
import { photoApi } from '@/api'
import { downloadImage, getFilenameFromUrl } from '@/utils/download'

// 自定义下载SVG图标
const DownloadIcon = {
  props: ['size'],
  render() {
    return h('svg', {
      t: '1775384741025',
      class: 'icon',
      viewBox: '0 0 1024 1024',
      version: '1.1',
      xmlns: 'http://www.w3.org/2000/svg',
      pId: '11851',
      width: this.size || 18,
      height: this.size || 18,
      style: 'fill: currentColor;'
    }, [
      h('path', {
        d: 'M828.975746 894.125047 190.189132 894.125047c-70.550823 0-127.753639-57.18542-127.753639-127.752616L62.435493 606.674243c0-17.634636 14.308891-31.933293 31.93227-31.933293l63.889099 0c17.634636 0 31.93227 14.298658 31.93227 31.933293l0 95.821369c0 35.282574 28.596292 63.877843 63.87682 63.877843L765.098927 766.373455c35.281551 0 63.87682-28.595268 63.87682-63.877843l0-95.821369c0-17.634636 14.298658-31.933293 31.943526-31.933293l63.877843 0c17.634636 0 31.933293 14.298658 31.933293 31.933293l0 159.699212C956.729385 836.939627 899.538849 894.125047 828.975746 894.125047L828.975746 894.125047zM249.938957 267.509636c12.921287-12.919241 33.884738-12.919241 46.807049 0l148.97087 148.971893L445.716876 94.89323c0-17.634636 14.300704-31.94762 31.933293-31.94762l63.875796 0c17.637706 0 31.945573 14.312984 31.945573 31.94762l0 321.588299 148.97087-148.971893c12.921287-12.919241 33.875528-12.919241 46.796816 0l46.814212 46.818305c12.921287 12.922311 12.921287 33.874505 0 46.807049L552.261471 624.930025c-1.140986 1.137916-21.664416 13.68365-42.315758 13.69286-20.87647 0.010233-41.878806-12.541641-43.020816-13.69286L203.121676 361.13499c-12.922311-12.933567-12.922311-33.884738 0-46.807049L249.938957 267.509636 249.938957 267.509636z',
        pId: '11852',
        style: 'fill: currentColor;'
      })
    ])
  }
}

const { t } = useI18n()

const shareDialogVisible = ref(false)
const shareForm = ref({
  content: '',
  password: '',
  expired_at: null
})

const loading = ref(false)
const loadingMore = ref(false)
const photos = ref([])
const selectedPhotos = ref([])
const pagination = ref({
  page: 1,
  pageSize: 50,
  total: 0
})
const currentPhoto = ref(null)
const sortOrder = ref('latest')
const scrollContainer = ref(null)
const isUnmounted = ref(false)
const imageViewerVisible = ref(false)
const scale = ref(1)
const position = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const startPos = ref({ x: 0, y: 0 })
const imgSize = ref({ width: 0, height: 0 })

// 按列重新排列数据，使column-count按行显示
const rearrangeForMasonry = (items, columnCount = 3) => {
  if (!items || items.length === 0) return []
  const columns = Array.from({ length: columnCount }, () => [])
  items.forEach((item, index) => {
    columns[index % columnCount].push(item)
  })
  return columns.flat()
}

const handleSelectionChange = (selection) => {
  selectedPhotos.value = selection
}

const isPhotoSelected = (photoId) => {
  return selectedPhotos.value.some(p => p.id === photoId)
}

const togglePhotoSelection = (photo) => {
  const index = selectedPhotos.value.findIndex(p => p.id === photo.id)
  if (index > -1) {
    selectedPhotos.value.splice(index, 1)
  } else {
    selectedPhotos.value.push(photo)
  }
}

const fetchPhotos = async (isLoadMore = false) => {
  if (isLoadMore) {
    loadingMore.value = true
  } else {
    loading.value = true
  }

  try {
    const res = await photoApi.getPhotoList({
      page: pagination.value.page,
      per_page: pagination.value.pageSize,
      q: `sort:${sortOrder.value}`
    })

    const photoData = res.data?.data || []
    const rearrangedData = rearrangeForMasonry(photoData, 3)

    if (!isUnmounted.value) {
      if (isLoadMore) {
        photos.value = [...photos.value, ...rearrangedData]
      } else {
        photos.value = rearrangedData
      }

      pagination.value.total = res.data?.meta?.total || 0
    }
  } catch (error) {
    if (!isUnmounted.value) {
      ElMessage.error('获取图片列表失败')
    }
  } finally {
    if (!isUnmounted.value) {
      loading.value = false
      loadingMore.value = false
    }
  }
}

const handleDelete = async (photo) => {
  try {
    await ElMessageBox.confirm(t('photo.deleteConfirm'), '提示', {
      type: 'warning'
    })
    await photoApi.deletePhoto(photo.id)
    ElMessage.success('删除成功')
    fetchPhotos()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const handleShare = (photo) => {
  currentPhoto.value = photo
  shareForm.value = {
    content: '',
    password: '',
    expired_at: null
  }
  shareDialogVisible.value = true
}

const handleDownloadPhoto = async (photo) => {
  const url = photo.public_url || photo.url
  let filename = photo.name
  if (!filename || filename.includes('@')) {
    filename = getFilenameFromUrl(url)
  }
  const result = await downloadImage(url, filename)
  if (result.success) {
    ElMessage.success('下载完成')
  } else {
    ElMessage.error('下载失败: ' + result.error)
  }
}

const openImageViewer = (photo) => {
  if (window.electronAPI?.openViewerWindow) {
    window.electronAPI.openViewerWindow(
      photo.public_url,
      photo.name,
      { views: photo.views, likes: photo.likes }
    )
  } else {
    currentPhoto.value = photo
    imageViewerVisible.value = true
    scale.value = 1
    position.value = { x: 0, y: 0 }
  }
}

const closeImageViewer = () => {
  imageViewerVisible.value = false
  currentPhoto.value = null
  scale.value = 1
  position.value = { x: 0, y: 0 }
}

const getMinScale = (containerW, containerH, imgW, imgH) => {
  if (!imgW || !imgH || !containerW) return 1
  const imgRatio = imgW / imgH
  const containerRatio = containerW / containerH
  return imgRatio > containerRatio ? containerW / imgW : containerH / imgH
}

const handleWheel = (e) => {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const container = e.target.closest('.photo-viewer-content')
  const containerW = container?.clientWidth || window.innerWidth * 0.9
  const containerH = container?.clientHeight || window.innerHeight * 0.9
  const minScale = getMinScale(containerW, containerH, imgSize.value.width, imgSize.value.height)
  scale.value = Math.max(minScale || 1, Math.min(5, scale.value + delta))
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
    const container = e.target.closest('.photo-viewer-content')?.parentElement
    const containerW = container?.clientWidth || window.innerWidth * 0.9
    const containerH = container?.clientHeight || window.innerHeight * 0.9
    const scaledW = imgSize.value.width * scale.value
    const scaledH = imgSize.value.height * scale.value
    const maxX = Math.max(0, (scaledW - containerW) / 2)
    const maxY = Math.max(0, (scaledH - containerH) / 2)
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
}

const transformStyle = () => ({
  transform: `translate(${position.value.x}px, ${position.value.y}px) scale(${scale.value})`,
  transformOrigin: 'center center',
  cursor: isDragging.value ? 'grabbing' : scale.value > 1 ? 'grab' : 'default'
})

const handleCreateShare = async () => {
  try {
    const res = await photoApi.createShare(currentPhoto.value.id, shareForm.value)
    console.log('创建分享响应:', res)
    const slug = res.data?.data?.slug || res.data?.slug || res.slug
    if (!slug) {
      console.error('分享slug为空,响应数据:', res)
      ElMessage.error('创建分享失败: 未返回分享标识')
      return
    }
    // 构造分享链接
    const shareUrl = `https://img.ksinx.com/shares/${slug}`
    await navigator.clipboard.writeText(shareUrl)
    ElMessage.success('分享链接已复制到剪贴板')
    shareDialogVisible.value = false
    fetchPhotos()
  } catch (error) {
    console.error('创建分享失败:', error)
    ElMessage.error('创建分享失败')
  }
}

const handleUnshare = async (photo) => {
  try {
    await ElMessageBox.confirm(t('photo.confirmUnshare'), t('common.hint'), {
      type: 'warning'
    })
    await photoApi.deleteShare(photo.id)
    ElMessage.success(t('photo.unshareSuccess'))
    fetchPhotos()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(t('photo.unshareFailed'))
    }
  }
}

const handleBatchDelete = async () => {
  if (selectedPhotos.value.length === 0) {
    ElMessage.warning('请选择要删除的图片')
    return
  }

  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedPhotos.value.length} 张图片吗？`, '提示', {
      type: 'warning'
    })
    const ids = selectedPhotos.value.map(photo => photo.id)
    await photoApi.batchDeletePhotos(ids)
    ElMessage.success('删除成功')
    fetchPhotos()
    selectedPhotos.value = []
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const copyUrl = async (url) => {
  try {
    await navigator.clipboard.writeText(url)
    ElMessage.success(t('photo.copySuccess'))
  } catch (error) {
    ElMessage.error(t('photo.copyFailed'))
  }
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const weekday = weekdays[date.getDay()]
  return `${year}/${month}/${day} ${weekday}`
}

const handleSortChange = (command) => {
  sortOrder.value = command
  photos.value = []
  pagination.value.page = 1
  fetchPhotos()
}

const photoGroups = ref({})

const groupPhotosByDate = () => {
  const groups = {}

  photos.value.forEach(photo => {
    const date = new Date(photo.created_at)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    const weekday = weekdays[date.getDay()]
    const dateLabel = `${year}/${month}/${day} ${weekday}`

    if (!groups[dateLabel]) {
      groups[dateLabel] = []
    }
    groups[dateLabel].push(photo)
  })

  // 根据排序方式排列日期
  const sortedGroups = {}
  const sortedDateLabels = Object.keys(groups).sort((a, b) => {
    const dateA = new Date(a.split(' ')[0])
    const dateB = new Date(b.split(' ')[0])
    // 最新优先：降序，最早优先：升序
    return sortOrder.value === 'latest' ? dateB - dateA : dateA - dateB
  })

  sortedDateLabels.forEach(dateLabel => {
    sortedGroups[dateLabel] = groups[dateLabel]
  })

  return sortedGroups
}

const updatePhotoGroups = () => {
  if (!isUnmounted.value) {
    photoGroups.value = groupPhotosByDate()
  }
}

const watchPhotos = watch(photos, () => {
  updatePhotoGroups()
}, { deep: true })

const handleScroll = () => {
  if (loadingMore.value || photos.value.length >= pagination.value.total) return

  const container = scrollContainer.value
  const scrollTop = container.scrollTop
  const scrollHeight = container.scrollHeight
  const clientHeight = container.clientHeight

  if (scrollTop + clientHeight >= scrollHeight - 100) {
    pagination.value.page++
    fetchPhotos(true)
  }
}

let scrollHandler = null

onMounted(() => {
  fetchPhotos()
  scrollHandler = handleScroll
  if (scrollContainer.value) {
    scrollContainer.value.addEventListener('scroll', scrollHandler)
  }
})

onUnmounted(() => {
  isUnmounted.value = true
  if (scrollContainer.value && scrollHandler) {
    scrollContainer.value.removeEventListener('scroll', scrollHandler)
  }
  watchPhotos()
})
</script>

<template>
  <div class="photos">
    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>{{ t('photo.allPhotos') }}</span>
          <div class="header-actions">
            <el-dropdown @command="handleSortChange" trigger="click">
              <el-button size="small">
                <el-icon><Sort /></el-icon>
                {{ sortOrder === 'latest' ? '最新' : '最早' }}
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="latest">最新</el-dropdown-item>
                  <el-dropdown-item command="oldest">最早</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button type="danger" size="small" @click="handleBatchDelete" :disabled="selectedPhotos.length === 0">
              批量删除 ({{ selectedPhotos.length }})
            </el-button>
          </div>
        </div>
      </template>

      <div ref="scrollContainer" class="photo-scroll-container">
        <el-empty v-if="photos.length === 0" :description="t('photo.noPhotos')" />

        <div v-else class="photo-masonry">
          <div v-for="photo in photos" :key="photo.id" class="photo-card" :class="{ selected: isPhotoSelected(photo.id) }">
            <div class="photo-checkbox">
              <el-checkbox :model-value="isPhotoSelected(photo.id)" @change="togglePhotoSelection(photo)" />
            </div>
            <div class="photo-overlay">
              <div class="photo-actions-row">
                <el-button size="small" circle @click.stop="copyUrl(photo.public_url)">
                  <el-icon><CopyDocument /></el-icon>
                </el-button>
                <el-button size="small" circle @click.stop="handleDownloadPhoto(photo)">
                  <DownloadIcon :size="18" />
                </el-button>
                <el-button size="small" circle :type="photo.share_url ? 'warning' : 'primary'" @click.stop="photo.share_url ? handleUnshare(photo) : handleShare(photo)">
                  <el-icon v-if="photo.share_url"><Close /></el-icon>
                  <el-icon v-else><Share /></el-icon>
                </el-button>
              </div>
            </div>
            <div class="photo-thumbnail" @click="openImageViewer(photo)">
              <img :src="photo.thumbnail_url" :alt="photo.name" />
            </div>
          </div>
        </div>

        <div v-if="loadingMore" class="loading-more">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>加载中...</span>
        </div>
      </div>
    </el-card>

    <!-- 分享对话框 -->
    <el-dialog v-model="shareDialogVisible" title="创建分享" width="400px">
      <el-form :model="shareForm" label-width="80px">
        <el-form-item label="分享内容">
          <el-input
            v-model="shareForm.content"
            type="textarea"
            placeholder="分享描述（可选）"
            :rows="3"
          />
        </el-form-item>
        <el-form-item label="访问密码">
          <el-input
            v-model="shareForm.password"
            placeholder="留空则无需密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="过期时间">
          <el-date-picker
            v-model="shareForm.expired_at"
            type="datetime"
            placeholder="留空则永不过期"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shareDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreateShare">创建分享</el-button>
      </template>
    </el-dialog>
  <!-- 图片查看器 -->
    <Transition name="fade">
      <div v-if="imageViewerVisible" class="photo-viewer" @click="closeImageViewer">
        <div class="photo-viewer-close" @click="closeImageViewer">
          <Close />
        </div>
        <div class="photo-viewer-content" @click.stop @wheel="handleWheel" @mousedown="handleMouseDown" @mousemove="handleMouseMove" @mouseup="handleMouseUp" @mouseleave="handleMouseUp">
          <img :src="currentPhoto?.public_url" :alt="currentPhoto?.name" :style="transformStyle()" @load="handleImgLoad" draggable="false" />
          <div class="photo-info">
            <h3>{{ currentPhoto?.name }}</h3>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.photos :deep(.el-card__body) {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.photo-scroll-container {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.photo-scroll-container::-webkit-scrollbar {
  width: 6px;
}

.photo-scroll-container::-webkit-scrollbar-track {
  background: transparent;
}

.photo-scroll-container::-webkit-scrollbar-thumb {
  background-color: var(--el-border-color-darker);
  border-radius: 3px;
}

.photo-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.date-group {
  display: flex;
  flex-direction: column;
}

.date-header {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color);
  margin-bottom: 16px;
  position: sticky;
  top: 0;
  background: var(--el-bg-color);
  z-index: 10;
}

.photo-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: var(--el-text-color-secondary);
}

.loading-more .el-icon {
  font-size: 20px;
}

.photo-masonry {
  column-count: 3;
  column-gap: 20px;
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.photo-card {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: var(--el-bg-color);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  break-inside: avoid;
  margin-bottom: 20px;
}

@media (max-width: 1200px) {
  .photo-masonry {
    column-count: 2;
  }
}

@media (max-width: 600px) {
  .photo-masonry {
    column-count: 1;
  }
}

.photo-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
}

.photo-card:hover .photo-overlay {
  opacity: 1;
}

.photo-card.selected {
  ring: 2px solid var(--el-color-primary);
}

.photo-checkbox {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 20;
  opacity: 0;
  transition: opacity 0.25s;
}

.photo-card:hover .photo-checkbox,
.photo-card.selected .photo-checkbox {
  opacity: 1;
}

.photo-card.selected {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

.photo-checkbox :deep(.el-checkbox__inner) {
  background: rgba(255, 255, 255, 0.95);
  border-color: var(--el-color-primary);
}

.photo-checkbox :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background: var(--el-color-primary);
  border-color: var(--el-color-primary);
}

.photo-thumbnail {
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.photo-thumbnail::after {
  content: '';
  position: absolute;
  inset: 0;
  background: transparent;
  z-index: 5;
}

.photo-thumbnail img {
  width: 100%;
  height: auto;
  display: block;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.photo-card:hover .photo-thumbnail img {
  transform: scale(1.08);
}

.photo-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, transparent 40%);
  opacity: 0;
  transition: opacity 0.3s;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 20px;
  z-index: 10;
  pointer-events: none;
}

.photo-actions-row {
  pointer-events: auto;
  display: flex;
  gap: 12px;
}

.photo-actions-row .el-button {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
}

.photo-actions-row .el-button:hover {
  background: rgba(255, 255, 255, 0.35);
  border-color: rgba(255, 255, 255, 0.5);
}

.photo-actions-row .el-button--danger {
  background: rgba(245, 108, 108, 0.8);
  border-color: rgba(245, 108, 108, 0.8);
}

.photo-actions-row .el-button--warning {
  background: rgba(230, 162, 60, 0.8);
  border-color: rgba(230, 162, 60, 0.8);
}

.photo-viewer {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow: hidden;
}

.photo-viewer-close {
  position: fixed;
  top: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  cursor: pointer;
  color: white;
  font-size: 20px;
  transition: all 0.3s;
  z-index: 10000;
}

.photo-viewer-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.photo-viewer-content {
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.photo-viewer-content img {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 4px;
  user-select: none;
  -webkit-user-drag: none;
  transition: transform 0.2s;
}

.photo-viewer-content .photo-info {
  margin-top: 16px;
  text-align: center;
  color: white;
}

.photo-viewer-content h3 {
  margin: 0;
  color: white;
}
</style>
