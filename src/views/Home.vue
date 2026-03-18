<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { squarePhotoApi, squareAlbumApi } from '@/api'
import { Star, View, PictureFilled, FolderOpened, CircleClose, Close } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

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

const fetchPhotos = async () => {
  loading.value = true
  try {
    const res = await squarePhotoApi.getPhotoList({
      page: pagination.value.page,
      per_page: pagination.value.pageSize,
      order: sortOrder.value
    })
    photos.value = res.data?.data || []
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
    albums.value = res.data?.data || []
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

const openPhotoDetail = (photo) => {
  currentImage.value = photo
  imageViewerVisible.value = true
}

const closeImageViewer = () => {
  imageViewerVisible.value = false
  currentImage.value = null
}

const handleReportPhoto = (photo) => {
  ElMessage.info('举报功能开发中')
}

const handleReportAlbum = (album) => {
  ElMessage.info(t('home.reportDeveloping'))
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
        <div v-loading="loading" class="photo-grid">
          <el-card
            v-for="photo in photos"
            :key="photo.id"
            class="photo-card"
            :body-style="{ padding: 0 }"
          >
            <div class="photo-image" @click="openPhotoDetail(photo)">
              <img :src="photo.thumbnail_url || photo.public_url" :alt="photo.name" />
            </div>
            <div class="photo-info">
              <div class="photo-name">{{ photo.name || photo.intro }}</div>
              <div class="photo-actions">
                <div
                  v-if="photo.is_liked"
                  class="icon-btn liked"
                  @click="handleUnlikePhoto(photo)"
                  title="取消点赞"
                >
                  <Star :size="16" />
                </div>
                <div
                  v-else
                  class="icon-btn"
                  @click="handleLikePhoto(photo)"
                  title="点赞"
                >
                  <Star :size="16" />
                </div>
                <div
                  class="icon-btn report-btn"
                  @click="handleReportPhoto(photo)"
                  :title="t('home.report')"
                >
                  <CircleClose :size="16" />
                </div>
              </div>
            </div>
          </el-card>
        </div>
        <el-pagination
          v-if="pagination.total > 0"
          v-model:current-page="pagination.page"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          @current-change="handlePageChange"
          class="pagination"
        />
      </el-tab-pane>

      <el-tab-pane :label="t('home.hotAlbums')" name="albums">
        <div v-loading="loading" class="album-grid">
          <el-card
            v-for="album in albums"
            :key="album.id"
            class="album-card"
          >
            <div class="album-cover">
              <img :src="album.covers?.[0] || '/default-album.png'" :alt="album.name" />
            </div>
            <div class="album-info">
              <h4>{{ album.name }}</h4>
              <p class="album-desc">{{ album.intro }}</p>
              <div class="album-meta">
                <span class="album-count"><PictureFilled /> {{ album.photo_count }}</span>
                <div v-if="album.user" class="album-user">
                  <img :src="album.user.avatar_url || '/src/assets/default-avatar.svg'" alt="Avatar" class="album-avatar" />
                  <span>@{{ album.user?.username || album.user?.name }}</span>
                </div>
              </div>
            </div>
            <div class="album-actions">
              <div
                v-if="album.is_liked"
                class="icon-btn liked"
                @click="handleUnlikeAlbum(album)"
                title="取消点赞"
              >
                <Star :size="16" />
              </div>
              <div
                v-else
                class="icon-btn"
                @click="handleLikeAlbum(album)"
                title="点赞"
              >
                <Star :size="16" />
              </div>
              <div
                class="icon-btn report-btn"
                @click="handleReportAlbum(album)"
                :title="t('home.report')"
              >
                <CircleClose :size="16" />
              </div>
            </div>
          </el-card>
        </div>
        <el-pagination
          v-if="pagination.total > 0"
          v-model:current-page="pagination.page"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          @current-change="handlePageChange"
          class="pagination"
        />
      </el-tab-pane>
    </el-tabs>

    <!-- 图片查看器 -->
    <Transition name="fade">
      <div v-if="imageViewerVisible" class="image-viewer" @click="closeImageViewer">
        <div class="image-viewer-close" @click="closeImageViewer">
          <Close />
        </div>
        <div class="image-viewer-content" @click.stop>
          <img :src="currentImage?.public_url" :alt="currentImage?.name" />
          <div class="image-info">
            <div class="image-name">{{ currentImage?.name || currentImage?.intro }}</div>
            <div class="image-meta">
              <span v-if="currentImage?.user" class="user-info">
                {{ currentImage.user.name || currentImage.user.username }}
              </span>
              <span><View /> {{ currentImage?.views || 0 }}</span>
              <span><Star /> {{ currentImage?.likes || 0 }}</span>
            </div>
          </div>
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

.photo-grid,
.album-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.photo-card,
.album-card {
  overflow: hidden;
}

.photo-image {
  width: 100%;
  height: 200px;
  overflow: hidden;
  cursor: pointer;
}

.photo-image:hover {
  opacity: 0.9;
}

.photo-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
</style>
