<script setup>
import { ref, onMounted, computed, h } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSettingStore } from '@/stores'
import { ElMessage, ElMessageBox } from 'element-plus'
import { squareAlbumApi } from '@/api'
import { downloadImage, getFilenameFromUrl } from '@/utils/download'
import { useUserStore } from '@/stores/user'

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
      width: this.size || 14,
      height: this.size || 14,
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
      width: this.size || 14,
      height: this.size || 14,
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

const { t } = useI18n()
const route = useRoute()
const settingStore = useSettingStore()

const loading = ref(false)
const album = ref(null)
const photos = ref([])

// 使用 query 参数
const albumId = computed(() => route.query.id)

const fetchAlbumDetail = async () => {
  if (!albumId.value) {
    ElMessage.error('缺少相册ID')
    loading.value = false
    return
  }
  loading.value = true
  try {
    const res = await squareAlbumApi.getAlbumDetail(albumId.value)
    album.value = res.data?.data || res.data
  } catch (error) {
    ElMessage.error('获取相册详情失败')
  } finally {
    loading.value = false
  }
}

const fetchPhotos = async () => {
  try {
    const res = await squareAlbumApi.getAlbumPhotos(albumId.value, { page: 1, pageSize: 50 })
    photos.value = res.data?.data || []
  } catch (error) {
    console.error('获取图片失败', error)
  }
}

const handleLikeAlbum = async () => {
  if (!album.value) return
  try {
    if (album.value.is_liked) {
      await squareAlbumApi.unlikeAlbum(albumId.value)
      album.value.is_liked = false
    } else {
      await squareAlbumApi.likeAlbum(albumId.value)
      album.value.is_liked = true
    }
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const userStore = useUserStore()

const handleReportAlbum = async () => {
  if (!album.value) return
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
      await squareAlbumApi.reportAlbum(albumId.value, { content })
      ElMessage.success('举报成功')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('举报失败')
    }
  }
}

const openImageViewer = (photo) => {
  const url = photo?.public_url || photo?.url
  if (!url) {
    ElMessage.error('图片地址无效')
    return
  }
  
  const userInfo = album.value?.user
  const userData = userInfo ? {
    name: userInfo.name || userInfo.username,
    avatar: userInfo.avatar_url || userInfo.avatar,
    is_admin: userInfo.is_admin
  } : null
  
  const imageInfo = { 
    views: photo.views, 
    likes: photo.likes,
    user: userData
  }
  
  if (window.electronAPI?.openViewerWindow) {
    window.electronAPI.openViewerWindow(url, photo.name, imageInfo)
  } else {
    ElMessage.error('无法打开图片查看器')
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

const handleClose = () => {
  window.electronAPI?.closeWindow()
}

onMounted(() => {
  settingStore.applyTheme()
  settingStore.setThemeColor(settingStore.themeColor)
  fetchAlbumDetail()
  fetchPhotos()
})
</script>

<template>
  <div class="square-album-detail">
    <!-- 自定义标题栏 -->
    <div class="title-bar" :class="{ 'dark-title': settingStore.isDarkMode }">
      <div class="title-bar-drag"></div>
      <div class="title-bar-title">{{ t('album.albumDetail') }}</div>
      <div class="title-bar-controls">
        <button class="control-btn close-btn" @click="handleClose">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>

    <div v-if="loading" v-loading="loading" class="loading-wrap">
    </div>

    <template v-else-if="album">
      <div class="album-header">
        <!-- 用户信息和元信息在同一行 -->
        <div class="header-top">
          <div class="user-info" v-if="album.user">
            <img :src="album.user.avatar_url || album.user.avatar" class="user-avatar" />
            <span class="user-name">{{ album.user.name || album.user.username }}</span>
            <el-tag v-if="album.user.is_admin" size="small" type="warning">管理员</el-tag>
          </div>
          <div class="album-meta">
            <span class="meta-item">
              <span class="meta-icon">📷</span>
              {{ album.photo_count }} 张
            </span>
            <span class="meta-item">
              <span class="meta-icon">📅</span>
              {{ album.created_at?.split('T')[0] }}
            </span>
          </div>
        </div>
        
        <!-- 标题和点赞 -->
        <div class="header-main">
          <h2 class="album-name">{{ album.name }}</h2>
          <div class="header-actions">
            <el-button :type="album.is_liked ? 'primary' : 'default'" size="small" @click="handleLikeAlbum" class="like-button">
              <LikeIcon :size="14" :liked="album.is_liked" />
              {{ album.is_liked ? '已赞' : '点赞' }}
            </el-button>
            <el-button size="small" @click="handleReportAlbum" class="report-button">
              <ReportIcon :size="14" />
              举报
            </el-button>
          </div>
        </div>
      </div>
      
      <div class="album-info">
        <p class="album-intro">{{ album.intro || '暂无简介' }}</p>
        <div class="album-tags" v-if="album.tags?.length">
          <el-tag v-for="tag in album.tags" :key="tag" size="small" type="info">{{ tag }}</el-tag>
        </div>
      </div>
      
      <!-- 封面预览 -->
      <div class="album-covers" v-if="album.covers?.length">
        <img v-for="cover in album.covers" :key="cover" :src="cover" class="cover-image" />
      </div>
      
      <div class="photo-grid">
        <div 
          v-for="photo in photos" 
          :key="photo.id" 
          class="photo-card"
          @click="openImageViewer(photo)"
        >
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
  </div>
</template>

<style scoped>
.square-album-detail {
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

.loading-wrap {
  min-height: 400px;
}

.album-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.user-info {
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
  font-weight: 500;
}

.album-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--text-color-secondary);
}

.meta-icon {
  font-size: 14px;
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.album-name {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
  text-align: left;
}

.album-info {
  padding: 12px 24px;
  border-bottom: 1px solid var(--border-color);
}

.album-intro {
  font-size: 14px;
  color: var(--text-color-secondary);
  line-height: 1.7;
  margin: 0 0 8px 0;
}

.album-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
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

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  padding: 24px;
}

.photo-card {
  border-radius: 8px;
  overflow: hidden;
  background: var(--el-bg-color);
  cursor: pointer;
  transition: opacity 0.2s;
}

.photo-card:hover {
  opacity: 0.9;
}

.photo-thumbnail img {
  width: 100%;
  height: auto;
  display: block;
}

.photo-thumbnail {
  position: relative;
  overflow: hidden;
}

.photo-card:hover .photo-thumbnail .photo-overlay {
  opacity: 1;
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

.is-liked {
  color: #00d1b2;
  animation: like-bounce 0.3s ease-out;
}

@keyframes like-bounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.like-button {
  background: linear-gradient(135deg, #00d1b2 0%, #00b4a0 100%);
  border: none;
  color: white;
  transition: all 0.3s ease;
}

.like-button:hover {
  background: linear-gradient(135deg, #00e5c2 0%, #00d1b2 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 209, 178, 0.4);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.report-button {
  background: var(--bg-color-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-color);
}

.report-button:hover {
  background: rgba(245, 108, 108, 0.2);
  border-color: rgba(245, 108, 108, 0.5);
  color: #f56c6c;
}
</style>