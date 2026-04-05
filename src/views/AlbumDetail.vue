<script setup>
import { ref, onMounted, computed, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Plus, PictureFilled, Calendar, Select, Close } from '@element-plus/icons-vue'
import { photoApi, albumApi } from '@/api'
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
const route = useRoute()
const router = useRouter()

const loading = ref(false)
const album = ref(null)
const albumEdit = ref({
  name: '',
  intro: '',
  is_public: true
})
const photos = ref([])
const selectedPhotos = ref([])
const imageViewerVisible = ref(false)
const currentImage = ref(null)
const scale = ref(1)
const position = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const startPos = ref({ x: 0, y: 0 })
const imgSize = ref({ width: 0, height: 0 })

// 用户相册 ID
const albumId = computed(() => route.params.id)

const rearrangeForMasonry = (items, columnCount = 3) => {
  if (!items || items.length === 0) return []
  const columns = Array.from({ length: columnCount }, () => [])
  items.forEach((item, index) => {
    columns[index % columnCount].push(item)
  })
  return columns.flat()
}

// 添加图片抽屉相关（仅用户相册）
const addPhotosDrawer = ref(false)
const myPhotos = ref([])
const myPhotosLoading = ref(false)
const myPhotosPagination = ref({
  page: 1,
  pageSize: 50,
  total: 0
})
const addingPhotos = ref(false)
const scrollContainer = ref(null)
const photosToAdd = ref([])
const existingPhotoIds = ref([])

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

const isAddPhotoSelected = (photoId) => {
  return photosToAdd.value.some(p => p.id === photoId)
}

const toggleAddPhotoSelection = (photo) => {
  const index = photosToAdd.value.findIndex(p => p.id === photo.id)
  if (index > -1) {
    photosToAdd.value.splice(index, 1)
  } else {
    photosToAdd.value.push(photo)
  }
}

const fetchAlbumDetail = async () => {
  if (!albumId.value) {
    ElMessage.error('缺少相册ID')
    loading.value = false
    return
  }
  loading.value = true
  try {
    const res = await albumApi.getAlbumDetail(albumId.value)
    album.value = res.data?.data || res.data
    albumEdit.value.name = album.value.name
    albumEdit.value.intro = album.value.intro
    albumEdit.value.is_public = album.value.is_public
  } catch (error) {
    ElMessage.error('获取相册详情失败')
  } finally {
    loading.value = false
  }
}

const fetchPhotos = async () => {
  try {
    const res = await photoApi.getPhotoList({ album_id: albumId.value })
    const rawPhotos = res.data?.data || res.data || []
    photos.value = rearrangeForMasonry(rawPhotos, 2)
  } catch (error) {
    console.error('获取图片失败', error)
  }
}

const handleDeleteAlbum = async () => {
  try {
    await ElMessageBox.confirm('确定要删除这个相册吗？', '提示', {
      type: 'warning'
    })
    await albumApi.deleteAlbum(albumId.value)
    ElMessage.success('删除成功')
    router.push('/albums')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const saveAlbumInfo = async () => {
  if (!albumEdit.value.name && !albumEdit.value.intro) return
  try {
    await albumApi.updateAlbum(albumId.value, {
      name: albumEdit.value.name,
      intro: albumEdit.value.intro,
      is_public: albumEdit.value.is_public
    })
    album.value.name = albumEdit.value.name
    album.value.intro = albumEdit.value.intro
    album.value.is_public = albumEdit.value.is_public
    ElMessage.success('保存成功')
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

const openAddPhotosDrawer = async () => {
  addPhotosDrawer.value = true
  photosToAdd.value = []
  myPhotosPagination.value.page = 1
  // 获取相册中已有的图片ID用于过滤
  try {
    const res = await photoApi.getPhotoList({ album_id: albumId.value })
    const existingPhotos = res.data?.data || []
    existingPhotoIds.value = existingPhotos.map(p => p.id)
  } catch (e) {
    existingPhotoIds.value = []
  }
  fetchMyPhotos()
}

const fetchMyPhotos = async (isLoadMore = false) => {
  if (isLoadMore) {
    myPhotosLoading.value = true
  } else {
    myPhotosLoading.value = true
  }

  try {
    const res = await photoApi.getPhotoList({
      page: myPhotosPagination.value.page,
      per_page: myPhotosPagination.value.pageSize
    })

    const photoData = res.data?.data || []
    const rearrangedData = rearrangeForMasonry(photoData, 3)

    if (isLoadMore) {
      myPhotos.value = [...myPhotos.value, ...rearrangedData]
    } else {
      myPhotos.value = rearrangedData
    }

    myPhotosPagination.value.total = res.data?.meta?.total || 0
  } catch (error) {
    ElMessage.error('获取图片列表失败')
  } finally {
    myPhotosLoading.value = false
  }
}

const handleAddPhotosScroll = () => {
  if (addingPhotos.value || myPhotosLoading.value || myPhotos.value.length >= myPhotosPagination.value.total) return

  const container = scrollContainer.value
  if (!container) return

  const scrollTop = container.scrollTop
  const scrollHeight = container.scrollHeight
  const clientHeight = container.clientHeight

  if (scrollTop + clientHeight >= scrollHeight - 100) {
    myPhotosPagination.value.page++
    fetchMyPhotos(true)
  }
}

const handleAddSelectedPhotos = async () => {
  if (photosToAdd.value.length === 0) {
    ElMessage.warning('请选择要添加的图片')
    return
  }

  addingPhotos.value = true
  try {
    const photoIds = photosToAdd.value.map(photo => photo.id)
    await albumApi.addPhotosToAlbum(albumId.value, { photo_ids: photoIds })
    ElMessage.success('添加成功')
    addPhotosDrawer.value = false
    photosToAdd.value = []
    fetchPhotos()
  } catch (error) {
    ElMessage.error('添加失败')
  } finally {
    addingPhotos.value = false
  }
}

const handleBatchDeletePhotos = async () => {
  if (selectedPhotos.value.length === 0) {
    ElMessage.warning('请选择要删除的图片')
    return
  }

  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedPhotos.value.length} 张图片吗？`, '提示', {
      type: 'warning'
    })
    const photoIds = selectedPhotos.value.map(photo => photo.id)
    await albumApi.removePhotosFromAlbum(albumId.value, { photo_ids: photoIds })
    ElMessage.success('删除成功')
    fetchPhotos()
    selectedPhotos.value = []
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
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
    currentImage.value = photo
    imageViewerVisible.value = true
    scale.value = 1
    position.value = { x: 0, y: 0 }
  }
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

const closeImageViewer = () => {
  imageViewerVisible.value = false
  currentImage.value = null
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

onMounted(() => {
  fetchAlbumDetail()
  fetchPhotos()
})
</script>

<template>
  <div class="album-detail">
    <div v-if="loading" v-loading="loading" class="loading-wrap">
    </div>

    <template v-else-if="album">
      <div class="album-header">
        <div class="header-top">
          <div class="header-left">
            <el-input
              v-model="albumEdit.name"
              class="album-name-input"
              @blur="saveAlbumInfo"
            />
            <div class="album-meta">
              <span class="meta-item">
                <PictureFilled class="meta-icon" />
                {{ album.photo_count }} 张
              </span>
              <span class="meta-item">
                <Calendar class="meta-icon" />
                {{ album.created_at?.split('T')[0] }}
              </span>
              <el-switch
                v-model="albumEdit.is_public"
                active-text="公开"
                inactive-text="私密"
                @change="saveAlbumInfo"
              />
            </div>
          </div>
          
          <div class="header-actions">
            <el-button type="primary" @click="openAddPhotosDrawer">
              <Plus /> 添加图片
            </el-button>
            <el-button type="danger" @click="handleDeleteAlbum">
              <Delete /> 删除相册
            </el-button>
            <el-button v-if="selectedPhotos.length > 0" type="danger" @click="handleBatchDeletePhotos">
              <Delete /> 删除选中 ({{ selectedPhotos.length }})
            </el-button>
          </div>
        </div>
        
        <!-- 简介编辑 -->
        <div class="album-intro-edit">
          <el-input
            v-model="albumEdit.intro"
            type="textarea"
            :rows="2"
            placeholder="简介"
            @blur="saveAlbumInfo"
          />
        </div>
      </div>
      
      <div class="photo-masonry">
        <div 
          v-for="photo in photos" 
          :key="photo.id" 
          class="photo-card"
          :class="{ selected: isPhotoSelected(photo.id) }"
          @click="togglePhotoSelection(photo)"
          @dblclick="openImageViewer(photo)"
        >
          <div class="photo-check" v-if="isPhotoSelected(photo.id)">
            <el-icon><Select /></el-icon>
          </div>
          <div class="photo-thumbnail">
            <img :src="photo.thumbnail_url || photo.public_url" :alt="photo.name" />
            <div class="photo-overlay">
              <div class="photo-actions-row">
                <div
                  class="action-btn download-btn"
                  @click.stop="handleDownloadPhoto(photo)"
                  title="下载"
                >
                  <DownloadIcon :size="18" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    
    <!-- 添加图片抽屉 -->
    <div v-if="addPhotosDrawer" class="add-photos-panel">
      <div class="panel-header">
        <h3>添加图片</h3>
        <el-button text @click="addPhotosDrawer = false">
          <Close />
        </el-button>
      </div>
      <div class="panel-content" ref="scrollContainer" @scroll="handleAddPhotosScroll">
        <div v-loading="myPhotosLoading" class="photo-masonry">
          <div 
            v-for="photo in myPhotos" 
            :key="photo.id" 
            class="photo-card"
            :class="{ selected: isAddPhotoSelected(photo.id), disabled: existingPhotoIds.includes(photo.id) }"
            @click="!existingPhotoIds.includes(photo.id) && toggleAddPhotoSelection(photo)"
          >
            <div class="photo-check" v-if="isAddPhotoSelected(photo.id)">
              <el-icon><Select /></el-icon>
            </div>
            <div class="photo-thumbnail">
              <img :src="photo.thumbnail_url || photo.public_url" :alt="photo.name" />
            </div>
          </div>
        </div>
      </div>
      <div class="panel-footer">
        <el-button @click="addPhotosDrawer = false">取消</el-button>
        <el-button type="primary" :loading="addingPhotos" @click="handleAddSelectedPhotos">
          添加选中 ({{ photosToAdd.length }})
        </el-button>
      </div>
    </div>
    
    <!-- 图片查看器 -->
    <Transition name="fade">
      <div v-if="imageViewerVisible" class="image-viewer" @click="closeImageViewer">
        <div class="viewer-close" @click="closeImageViewer">
          <Close />
        </div>
        <div class="photo-viewer-content" @click.stop @wheel="handleWheel" @mousedown="handleMouseDown" @mousemove="handleMouseMove" @mouseup="handleMouseUp" @mouseleave="handleMouseUp">
          <img :src="currentImage?.public_url" :alt="currentImage?.name" :style="transformStyle()" @load="handleImgLoad" draggable="false" />
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.album-detail {
  padding: 0;
}

.loading-wrap {
  min-height: 400px;
}

.album-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-left {
  flex: 1;
  text-align: left;
}

.album-name {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
  text-align: left;
}

.album-name-input {
  width: 300px;
  text-align: left;
}

.album-name-input :deep(.el-input__wrapper) {
  padding: 4px 8px;
  text-align: left;
}

.album-name-input :deep(.el-input__inner) {
  font-size: 20px;
  font-weight: 600;
}

.album-intro-edit {
  margin-top: 12px;
}

.album-meta {
  display: flex;
  gap: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--text-color-secondary);
}

.meta-icon {
  width: 14px;
  height: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.album-intro {
  font-size: 13px;
  color: var(--text-color-secondary);
  line-height: 1.7;
  margin: 0 0 12px 0;
  white-space: pre-wrap;
  padding: 10px 12px;
  background: var(--hover-bg);
  border-radius: 6px;
}

.album-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.album-user {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.user-name {
  font-size: 13px;
  color: var(--text-color);
}

.album-covers {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  overflow-x: auto;
  background: var(--bg-color-secondary);
}

.cover-image {
  width: 160px;
  height: 100px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
}

.album-toolbar {
  padding: 12px 24px;
  border-bottom: 1px solid var(--border-color);
}

.photo-masonry {
  column-count: 2;
  column-gap: 24px;
  padding: 24px;
}

.photo-card {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background: var(--el-bg-color);
  break-inside: avoid;
  margin-bottom: 24px;
  cursor: pointer;
}

.photo-card:hover {
  opacity: 0.9;
}

.photo-card.selected {
  outline: 2px solid var(--primary-color);
}

.photo-card.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.photo-check {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 24px;
  height: 24px;
  background: var(--primary-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  z-index: 10;
}

.photo-thumbnail img {
  width: 100%;
  height: auto;
  display: block;
}

/* 添加图片面板 */
.add-photos-panel {
  position: fixed;
  top: 120px;
  right: 0;
  width: 400px;
  min-width: 300px;
  max-width: 800px;
  bottom: 0;
  background: var(--bg-color);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
  resize: horizontal;
  overflow: auto;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.panel-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
}

/* 图片查看器 */
.image-viewer {
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
  padding: 40px;
}

.viewer-close {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  cursor: pointer;
  z-index: 10000;
}

.photo-viewer-content {
  max-width: 90vw;
  max-height: 90vh;
}

.photo-viewer-content img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  user-select: none;
}

.is-liked {
  color: var(--primary-color);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .photo-masonry {
    column-count: 2;
  }
}
.photo-card:hover .photo-thumbnail .photo-overlay {
  opacity: 1;
}

.photo-thumbnail {
  position: relative;
  overflow: hidden;
}

.photo-thumbnail img {
  width: 100%;
  height: auto;
  display: block;
}

.photo-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.6) 0%, transparent 40%);
  opacity: 0;
  transition: opacity 0.3s;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 20px;
  z-index: 10;
}

.photo-actions-row {
  display: flex;
  gap: 16px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  transition: all 0.25s;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.35);
  border-color: rgba(255, 255, 255, 0.5);
}

.download-btn:hover {
  background: rgba(103, 194, 58, 0.3);
  border-color: rgba(103, 194, 58, 0.5);
  color: #67c23a;
}

</style>