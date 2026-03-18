<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CopyDocument, Share, Close, Delete, Sort, Loading } from '@element-plus/icons-vue'
import { photoApi } from '@/api'

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

    if (!isUnmounted.value) {
      if (isLoadMore) {
        photos.value = [...photos.value, ...photoData]
      } else {
        photos.value = photoData
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

        <div v-else class="photo-grid">
          <div v-for="(groupPhotos, dateLabel) in photoGroups" :key="dateLabel" class="date-group">
            <div class="date-header">{{ dateLabel }}</div>
            <div class="photo-list">
              <div v-for="photo in groupPhotos" :key="photo.id" class="photo-item" :class="{ selected: isPhotoSelected(photo.id) }">
                <div class="photo-checkbox">
                  <el-checkbox :model-value="isPhotoSelected(photo.id)" @change="togglePhotoSelection(photo)" />
                </div>
                <div class="photo-thumbnail">
                  <img :src="photo.thumbnail_url" :alt="photo.name" />
                </div>
                <div class="photo-info">
                  <h4>{{ photo.name }}</h4>
                </div>
                <div class="photo-actions">
                  <el-tooltip content="复制链接" placement="top">
                    <el-button size="small" circle @click="copyUrl(photo.public_url)">
                      <el-icon><CopyDocument /></el-icon>
                    </el-button>
                  </el-tooltip>
                  <el-tooltip :content="photo.share_url ? '取消分享' : '分享'" placement="top">
                    <el-button
                      size="small"
                      :type="photo.share_url ? 'warning' : 'primary'"
                      circle
                      @click="photo.share_url ? handleUnshare(photo) : handleShare(photo)"
                    >
                      <el-icon v-if="photo.share_url"><Close /></el-icon>
                      <el-icon v-else><Share /></el-icon>
                    </el-button>
                  </el-tooltip>
                  <el-tooltip content="删除" placement="top">
                    <el-button size="small" type="danger" circle @click="handleDelete(photo)">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </el-tooltip>
                </div>
              </div>
            </div>
          </div>

          <div v-if="loadingMore" class="loading-more">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>加载中...</span>
          </div>
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

.photo-item {
  position: relative;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
  transition: border-color 0.3s;
}

.photo-item.selected {
  border-color: var(--el-color-primary);
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

.photo-checkbox {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
}

.photo-thumbnail {
  height: 150px;
  overflow: hidden;
}

.photo-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-info {
  padding: 12px;
}

.photo-info h4 {
  font-size: 14px;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.photo-meta {
  font-size: 12px;
  color: var(--text-color-secondary);
}

.photo-actions {
  padding: 12px;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 8px;
  justify-content: space-around;
}
</style>
