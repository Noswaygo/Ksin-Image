<script setup>
import { ref, onMounted, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { squarePhotoApi, squareAlbumApi } from '@/api'
import { View, PictureFilled, FolderOpened, Warning, Close, Calendar, Download } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { downloadImage, getFilenameFromUrl } from '@/utils/download'

// 自定义点赞SVG图标
const LikeIcon = {
  props: ['size', 'liked'],
  render() {
    const color = this.liked ? '#00d1b2' : 'currentColor'
    return h('svg', {
      t: '1775384624253',
      class: 'icon',
      viewBox: '0 0 1024 1024',
      version: '1.1',
      xmlns: 'http://www.w3.org/2000/svg',
      pId: '5722',
      width: this.size || 18,
      height: this.size || 18,
      style: `fill: ${color};`
    }, [
      h('path', {
        d: 'M857.28 344.992h-264.832c12.576-44.256 18.944-83.584 18.944-118.208 0-78.56-71.808-153.792-140.544-143.808-60.608 8.8-89.536 59.904-89.536 125.536v59.296c0 76.064-58.208 140.928-132.224 148.064l-117.728-0.192A67.36 67.36 0 0 0 64 483.04V872c0 37.216 30.144 67.36 67.36 67.36h652.192a102.72 102.72 0 0 0 100.928-83.584l73.728-388.96a102.72 102.72 0 0 0-100.928-121.824zM128 872V483.04c0-1.856 1.504-3.36 3.36-3.36H208v395.68H131.36A3.36 3.36 0 0 1 128 872z m767.328-417.088l-73.728 388.96a38.72 38.72 0 0 1-38.048 31.488H272V476.864a213.312 213.312 0 0 0 173.312-209.088V208.512c0-37.568 12.064-58.912 34.72-62.176 27.04-3.936 67.36 38.336 67.36 80.48 0 37.312-9.504 84-28.864 139.712a32 32 0 0 0 30.24 42.496h308.512a38.72 38.72 0 0 1 38.048 45.888z',
        pId: '5723',
        style: `fill: ${color};`
      })
    ])
  }
}

// 自定义举报SVG图标
const ReportIcon = {
  props: ['size'],
  render() {
    return h('svg', {
      t: '1775384709958',
      class: 'icon',
      viewBox: '0 0 1024 1024',
      version: '1.1',
      xmlns: 'http://www.w3.org/2000/svg',
      pId: '10846',
      width: this.size || 18,
      height: this.size || 18,
      style: 'fill: currentColor;'
    }, [
      h('path', {
        d: 'M960.288 787.488c-98.88-154.08-287.36-469.568-385.76-622.912-21.44-27.968-71.872-44-102.88 0L61.504 803.872c-23.36 33.888-23.008 79.872 49.376 82.432h824.64c48.416-2.784 48.416-62.496 24.768-98.816z m-437.44-27.776a47.296 47.296 0 1 1 0-94.592 47.296 47.296 0 0 1 0 94.592z m35.456-165.536c0.448 11.52-10.944 23.68-23.648 23.68h-23.648c-12.672 0-23.2-12.16-23.616-23.68l-23.68-224.64c0-19.552 15.904-35.456 35.488-35.456h47.296c19.584 0 35.456 15.904 35.456 35.488l-23.648 224.64z',
        pId: '10847',
        style: 'fill: currentColor;'
      })
    ])
  }
}

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
const userStore = useUserStore()

const loading = ref(false)
const activeTab = ref('photos')
const photos = ref([])
const albums = ref([])
const sortOrder = ref('newest')
const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0
})
const imageViewerVisible = ref(false)
const currentImage = ref(null)
const scale = ref(1)
const position = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const startPos = ref({ x: 0, y: 0 })
const imgSize = ref({ width: 0, height: 0 })

const fetchPhotos = async () => {
  loading.value = true
  try {
    const res = await squarePhotoApi.getPhotoList({
      page: pagination.value.page,
      per_page: pagination.value.pageSize,
      order: sortOrder.value
    })
    const rawPhotos = res.data?.data || []
    photos.value = rearrangeForMasonry(rawPhotos, 3)
    pagination.value.total = res.data?.meta?.total || 0
  } catch (error) {
    ElMessage.error('获取图片失败')
  } finally {
    loading.value = false
  }
}

const fetchAlbums = async () => {
  loading.value = true
  try {
    const res = await squareAlbumApi.getAlbumList({
      page: pagination.value.page,
      pageSize: pagination.value.pageSize
    })
    const rawAlbums = res.data?.data || []
    albums.value = rearrangeForMasonry(rawAlbums, 3)
    pagination.value.total = res.data?.meta?.total || 0
  } catch (error) {
    ElMessage.error('获取相册失败')
  } finally {
    loading.value = false
  }
}

const handleLikePhoto = async (photo) => {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录后再点赞')
    return
  }
  try {
    await squarePhotoApi.likePhoto(photo.id)
    photo.is_liked = true
    photo.likes++
    ElMessage.success('点赞成功')
  } catch (error) {
    ElMessage.error('点赞失败')
  }
}

const handleUnlikePhoto = async (photo) => {
  if (!userStore.isLoggedIn) {
    ElMessage.warning(t('home.pleaseLogin'))
    return
  }
  try {
    await squarePhotoApi.unlikePhoto(photo.id)
    photo.is_liked = false
    photo.likes--
    ElMessage.success(t('home.unlikeSuccess'))
  } catch (error) {
    ElMessage.error(t('home.unlikeFailed'))
  }
}

const handleLikeAlbum = async (album) => {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录后再点赞')
    return
  }
  try {
    await squareAlbumApi.likeAlbum(album.id)
    album.is_liked = true
    album.likes++
    ElMessage.success('点赞成功')
  } catch (error) {
    ElMessage.error('点赞失败')
  }
}

const handleUnlikeAlbum = async (album) => {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录后再点赞')
    return
  }
  try {
    await squareAlbumApi.unlikeAlbum(album.id)
    album.is_liked = false
    album.likes--
    ElMessage.success('取消点赞成功')
  } catch (error) {
    ElMessage.error('取消点赞失败')
  }
}

const handlePageChange = (page) => {
  pagination.value.page = page
  if (activeTab.value === 'photos') {
    fetchPhotos()
  } else {
    fetchAlbums()
  }
}

const handleOrderChange = () => {
  pagination.value.page = 1
  fetchPhotos()
}

const handleDownloadPhoto = async (photo) => {
  const url = photo.public_url || photo.url
  // 如果有名称，去掉@后面参数；否则从URL提取
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

const openPhotoDetail = (photo) => {
  if (window.electronAPI?.openViewerWindow) {
    window.electronAPI.openViewerWindow(
      photo.public_url,
      photo.name || photo.intro,
      { 
        user: photo.user?.name || photo.user?.username || photo.user, 
        views: photo.views, 
        likes: photo.likes 
      }
    )
  } else {
    // 非 Electron 环境回退到原逻辑
    currentImage.value = photo
    imageViewerVisible.value = true
  }
}

const closeImageViewer = () => {
  imageViewerVisible.value = false
  currentImage.value = null
  scale.value = 1
  position.value = { x: 0, y: 0 }
}

const getMinScale = (containerW, containerH, imgW, imgH) => {
  if (!imgW || !imgW || !containerW) return 1
  const imgRatio = imgW / imgH
  const containerRatio = containerW / containerH
  return imgRatio > containerRatio ? containerW / imgW : containerH / imgH
}

const handleWheel = (e) => {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const container = e.target.closest('.image-viewer-content')
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
    const container = e.target.closest('.image-viewer-content')?.parentElement
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

const handleReportPhoto = async (photo) => {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录后再举报')
    return
  }
  try {
    const { value: content } = await ElMessageBox.prompt('请输入举报原因', '举报图片', {
      confirmButtonText: '提交',
      cancelButtonText: '取消',
      inputType: 'textarea',
      inputPlaceholder: '请详细描述举报原因...',
      inputValidator: (value) => {
        if (!value || value.trim() === '') {
          return '请输入举报原因'
        }
        return true
      }
    })
    if (content) {
      await squarePhotoApi.reportPhoto(photo.id, { content })
      ElMessage.success('举报成功')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('举报失败')
    }
  }
}

const handleReportAlbum = async (album) => {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录后再举报')
    return
  }
  try {
    const { value: content } = await ElMessageBox.prompt('请输入举报原因', '举报相册', {
      confirmButtonText: '提交',
      cancelButtonText: '取消',
      inputType: 'textarea',
      inputPlaceholder: '请详细描述举报原因...',
      inputValidator: (value) => {
        if (!value || value.trim() === '') {
          return '请输入举报原因'
        }
        return true
      }
    })
    if (content) {
      await squareAlbumApi.reportAlbum(album.id, { content })
      ElMessage.success('举报成功')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('举报失败')
    }
  }
}

// 热门相册详情
const albumDetailVisible = ref(false)
const albumDetail = ref(null)
const albumDetailLoading = ref(false)
const albumPhotos = ref([])

const openAlbumDetail = async (album) => {
  // 先获取详情数据传递给窗口
  if (window.electronAPI?.openAlbumDetailWindow) {
    // 传递albumId，窗口内会通过URL参数获取
    window.electronAPI.openAlbumDetailWindow(album.id, album.name)
  } else {
    // 回退到弹窗
    albumDetailLoading.value = true
    albumDetailVisible.value = true
    try {
      const res = await squareAlbumApi.getAlbumDetail(album.id)
      albumDetail.value = res.data?.data || res.data
      const photoRes = await squareAlbumApi.getAlbumPhotos(album.id, { page: 1, pageSize: 20 })
      albumPhotos.value = rearrangeForMasonry(photoRes.data?.data || [], 3)
    } catch (error) {
      ElMessage.error('获取相册详情失败')
    } finally {
      albumDetailLoading.value = false
    }
  }
}

const closeAlbumDetail = () => {
  albumDetailVisible.value = false
  albumDetail.value = null
  albumPhotos.value = []
}

// 按列重新排列数据，使column-count按行显示
const rearrangeForMasonry = (items, columnCount = 3) => {
  if (!items || items.length === 0) return []
  const columns = Array.from({ length: columnCount }, () => [])
  items.forEach((item, index) => {
    columns[index % columnCount].push(item)
  })
  return columns.flat()
}

onMounted(() => {
  fetchPhotos()
})
</script>

<template>
  <div class="home">
    <el-tabs v-model="activeTab" @tab-change="activeTab === 'photos' ? fetchPhotos() : fetchAlbums()">
      <el-tab-pane :label="t('home.hotPhotos')" name="photos">
        <div class="toolbar">
          <el-select v-model="sortOrder" @change="handleOrderChange" style="width: 150px">
            <el-option label="最新" value="newest" />
            <el-option label="最早" value="oldest" />
            <el-option label="最受欢迎" value="most_liked" />
            <el-option label="最少点赞" value="least_liked" />
          </el-select>
        </div>
        <div v-loading="loading" class="photo-masonry">
          <div v-for="photo in photos" :key="photo.id" class="photo-card">
            <div class="photo-overlay">
              <div class="photo-actions-row">
                <div
                  v-if="photo.is_liked"
                  class="action-btn liked"
                  @click.stop="handleUnlikePhoto(photo)"
                  title="取消点赞"
                >
                  <LikeIcon :size="18" :liked="true" />
                </div>
                <div
                  v-else
                  class="action-btn"
                  @click.stop="handleLikePhoto(photo)"
                  title="点赞"
                >
                  <LikeIcon :size="18" :liked="false" />
                </div>
                <div
                  class="action-btn report-btn"
                  @click.stop="handleReportPhoto(photo)"
                  :title="t('home.report')"
                >
                  <ReportIcon :size="18" />
                </div>
                <div
                  class="action-btn download-btn"
                  @click.stop="handleDownloadPhoto(photo)"
                  title="下载"
                >
                  <DownloadIcon :size="18" />
                </div>
              </div>
            </div>
            <div class="photo-thumbnail" @click="openPhotoDetail(photo)">
              <img :src="photo.thumbnail_url || photo.public_url" :alt="photo.name" />
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane :label="t('home.hotAlbums')" name="albums">
        <div v-loading="loading" class="photo-masonry">
          <div v-for="album in albums" :key="album.id" class="photo-card album-card" @click="openAlbumDetail(album)">
            <div class="photo-overlay">
              <div class="photo-actions-row">
                <div
                  v-if="album.is_liked"
                  class="action-btn liked"
                  @click.stop="handleUnlikeAlbum(album)"
                  title="取消点赞"
                >
                  <LikeIcon :size="18" :liked="true" />
                </div>
                <div
                  v-else
                  class="action-btn"
                  @click.stop="handleLikeAlbum(album)"
                  title="点赞"
                >
                  <LikeIcon :size="18" :liked="false" />
                </div>
                <div
                  class="action-btn report-btn"
                  @click.stop="handleReportAlbum(album)"
                  :title="t('home.report')"
                >
                  <ReportIcon :size="18" />
                </div>
              </div>
            </div>
            <div class="photo-thumbnail">
              <img :src="album.covers?.[0] || '/default-album.png'" :alt="album.name" />
            </div>
            <div class="album-info-overlay">
              <h4>{{ album.name }}</h4>
              <div class="album-meta">
                <span><PictureFilled /> {{ album.photo_count }}</span>
                <span v-if="album.user">@{{ album.user?.username || album.user?.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-pagination
      v-if="pagination.total > 0"
      v-model:current-page="pagination.page"
      :page-size="pagination.pageSize"
      :total="pagination.total"
      @current-change="handlePageChange"
      class="pagination"
    />

    <!-- 图片查看器 -->
    <Transition name="fade">
      <div v-if="imageViewerVisible" class="image-viewer" @click="closeImageViewer">
        <div class="image-viewer-close" @click="closeImageViewer">
          <Close />
        </div>
        <div class="image-viewer-content" @click.stop @wheel="handleWheel" @mousedown="handleMouseDown" @mousemove="handleMouseMove" @mouseup="handleMouseUp" @mouseleave="handleMouseUp">
          <img :src="currentImage?.public_url" :alt="currentImage?.name" :style="transformStyle()" @load="handleImgLoad" draggable="false" />
          <div class="image-info">
            <div class="image-name">{{ currentImage?.name || currentImage?.intro }}</div>
            <div class="image-meta">
              <span v-if="currentImage?.user" class="user-info">
                {{ currentImage.user.name || currentImage.user.username }}
              </span>
              <span><View /> {{ currentImage?.views || 0 }}</span>
              <span><LikeIcon :size="14" :liked="currentImage?.is_liked" /> {{ currentImage?.likes || 0 }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 相册详情弹窗 -->
    <Transition name="fade">
      <div v-if="albumDetailVisible" class="album-detail-modal" @click="closeAlbumDetail">
        <div class="album-detail-content" @click.stop>
          <div class="album-detail-close" @click="closeAlbumDetail">
            <Close />
          </div>
          <div v-if="albumDetailLoading" class="album-detail-loading" v-loading="albumDetailLoading">
          </div>
          <template v-else-if="albumDetail">
            <div class="album-detail-header">
              <h2>{{ albumDetail.name }}</h2>
              <div class="album-detail-info">
                <div class="album-detail-stats">
                  <span class="stat-item">
                    <PictureFilled class="stat-icon" />
                    <em>{{ albumDetail.photo_count }}</em> 张
                  </span>
                  <span class="stat-item">
                    <Calendar class="stat-icon" />
                    {{ albumDetail.created_at?.split('T')[0] }}
                  </span>
                </div>
                <div class="album-detail-user">
                  <img :src="albumDetail.user?.avatar_url" class="user-avatar" />
                  <span class="user-name">{{ albumDetail.user?.name }}</span>
                  <el-tag v-if="albumDetail.user?.is_admin" size="small" type="warning">管理员</el-tag>
                </div>
              </div>
              <p class="album-detail-intro">{{ albumDetail.intro || '暂无简介' }}</p>
              <div class="album-detail-tags" v-if="albumDetail.tags?.length">
                <el-tag v-for="tag in albumDetail.tags" :key="tag" size="small" type="info">{{ tag }}</el-tag>
              </div>
            </div>
            <div class="album-detail-covers" v-if="albumDetail.covers?.length">
              <img v-for="cover in albumDetail.covers" :key="cover" :src="cover" class="cover-image" />
            </div>
            <div class="album-detail-photos">
              <h3>相册图片</h3>
              <div class="photo-masonry">
                <div v-for="photo in albumPhotos" :key="photo.id" class="photo-card">
                  <div class="photo-thumbnail">
                    <img :src="photo.thumbnail_url || photo.public_url" :alt="photo.name" />
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.home {
  padding: 0;
}

.toolbar {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
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

.photo-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
}

.photo-card:hover .photo-overlay {
  opacity: 1;
}

.photo-thumbnail {
  position: relative;
  overflow: hidden;
  cursor: pointer;
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
  background: linear-gradient(to top, rgba(0, 0, 0, 0.6) 0%, transparent 40%);
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

.action-btn.liked {
  color: #00d1b2;
  background: rgba(0, 209, 178, 0.2);
  border-color: rgba(0, 209, 178, 0.5);
  animation: like-bounce 0.3s ease-out;
}

@keyframes like-bounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.report-btn:hover {
  background: rgba(245, 108, 108, 0.3);
  border-color: rgba(245, 108, 108, 0.5);
  color: #f56c6c;
}

.download-btn:hover {
  background: rgba(103, 194, 58, 0.3);
  border-color: rgba(103, 194, 58, 0.5);
  color: #67c23a;
}

.album-info-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, transparent 100%);
  color: white;
}

.album-info-overlay h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.album-info-overlay .album-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  opacity: 0.8;
}

.album-card {
  position: relative;
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

.album-cover {
  width: 100%;
  height: 200px;
  overflow: hidden;
}

.album-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-info,
.album-info {
  padding: 16px;
}

.photo-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 12px;
  color: var(--text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.photo-actions,
.album-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  background: var(--hover-bg);
  color: var(--text-color-secondary);
  transition: all 0.3s;
  border: 1px solid transparent;
}

.icon-btn:hover {
  background: var(--active-bg);
  color: var(--primary-color);
}

.icon-btn.liked {
  color: var(--primary-color);
  background: rgba(var(--primary-rgb), 0.1);
  border-color: var(--primary-color);
}

.report-btn:hover {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.1);
}

.album-desc {
  font-size: 13px;
  color: var(--text-color-secondary);
  margin-bottom: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.album-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--text-color-secondary);
}

.album-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.album-count {
  display: flex;
  align-items: center;
  gap: 4px;
}

.album-count svg {
  width: 14px;
  height: 14px;
}

.album-user {
  display: flex;
  align-items: center;
  gap: 6px;
}

.album-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
}

.album-user span {
  font-size: 11px;
}

.pagination {
  display: flex;
  justify-content: center;
}

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
  padding: 20px;
  overflow: hidden;
}

.image-viewer-close {
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

.image-viewer-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.image-viewer-content {
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.image-viewer-content img {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 4px;
  user-select: none;
  -webkit-user-drag: none;
  transition: transform 0.2s;
}

.image-info {
  margin-top: 16px;
  text-align: center;
  color: white;
}

.image-name {
  font-size: 16px;
  margin-bottom: 8px;
}

.image-meta {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.image-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.user-info {
  font-weight: 500;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 相册详情弹窗 */
.album-detail-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  overflow-y: auto;
}

.album-detail-content {
  background: var(--bg-color);
  border-radius: 16px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  padding: 0;
}

.album-detail-close {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--hover-bg);
  border-radius: 50%;
  cursor: pointer;
  color: var(--text-color);
  font-size: 18px;
  transition: all 0.3s;
  z-index: 10;
}

.album-detail-close:hover {
  background: var(--active-bg);
}

.album-detail-loading {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.album-detail-header {
  padding: 24px;
  border-bottom: 1px solid var(--border-color);
}

.album-detail-header h2 {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 16px 0;
}

.album-detail-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.album-detail-stats {
  display: flex;
  gap: 16px;
}

.album-detail-stats .stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--text-color-secondary);
}

.album-detail-stats .stat-icon {
  width: 14px;
  height: 14px;
}

.album-detail-stats .stat-item em {
  font-style: normal;
  color: var(--primary-color);
  font-weight: 500;
}

.album-detail-user {
  display: flex;
  align-items: center;
  gap: 8px;
}

.album-detail-user .user-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.album-detail-user .user-name {
  font-size: 13px;
  color: var(--text-color);
}

.album-detail-intro {
  font-size: 13px;
  color: var(--text-color-secondary);
  line-height: 1.7;
  margin: 0 0 12px 0;
  white-space: pre-wrap;
  padding: 10px 12px;
  background: var(--hover-bg);
  border-radius: 6px;
}

.album-detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.album-detail-covers {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  overflow-x: auto;
  background: var(--bg-color-secondary);
}

.album-detail-covers .cover-image {
  width: 180px;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
}

.album-detail-photos {
  padding: 20px 24px;
}

.album-detail-photos h3 {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-color);
  margin: 0 0 16px 0;
}
</style>
