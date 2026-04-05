<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Plus, Delete, Edit, FolderOpened } from '@element-plus/icons-vue'
import { albumApi } from '@/api'

const { t } = useI18n()
const router = useRouter()

const loading = ref(false)
const albums = ref([])
const dialogVisible = ref(false)
const albumForm = ref({
  name: '',
  intro: '',
  is_public: true
})

// 按列重新排列数据，使column-count按行显示
const rearrangeForMasonry = (items, columnCount = 3) => {
  if (!items || items.length === 0) return []
  const columns = Array.from({ length: columnCount }, () => [])
  items.forEach((item, index) => {
    columns[index % columnCount].push(item)
  })
  return columns.flat()
}

const fetchAlbums = async () => {
  loading.value = true
  try {
    const res = await albumApi.getAlbumList()
    const rawAlbums = res.data?.data || []
    albums.value = rearrangeForMasonry(rawAlbums, 3)
  } catch (error) {
    ElMessage.error('获取相册列表失败')
  } finally {
    loading.value = false
  }
}

const handleCreate = async () => {
  try {
    await albumApi.createAlbum(albumForm.value)
    ElMessage.success('创建成功')
    dialogVisible.value = false
    albumForm.value = { name: '', intro: '', is_public: true }
    fetchAlbums()
  } catch (error) {
    ElMessage.error('创建失败')
  }
}

const handleDelete = async (album) => {
  try {
    await albumApi.deleteAlbum(album.id)
    ElMessage.success('删除成功')
    fetchAlbums()
  } catch (error) {
    ElMessage.error('删除失败')
  }
}

const openAlbum = (album) => {
  router.push(`/album/${album.id}`)
}

onMounted(() => {
  fetchAlbums()
})
</script>

<template>
  <div class="albums">
    <div class="toolbar">
      <el-button type="primary" @click="dialogVisible = true">
        <Plus /> {{ t('album.createAlbum') }}
      </el-button>
    </div>

    <div v-loading="loading" class="photo-masonry">
      <div v-for="album in albums" :key="album.id" class="photo-card album-card">
        <div class="photo-thumbnail" @click="openAlbum(album)">
          <img v-if="album.covers && album.covers.length > 0" :src="album.covers[0]" :alt="album.name" />
          <div v-else class="album-placeholder">
            <FolderOpened :size="48" />
          </div>
        </div>
        <div class="album-info-overlay">
          <h4>{{ album.name }}</h4>
          <div class="album-meta">
            <span>{{ album.photo_count }} 张图片</span>
          </div>
        </div>
      </div>
    </div>

    <el-pagination
      v-if="albums.length > 0"
      class="pagination"
      layout="prev, pager, next"
      :total="albums.length"
    />

    <el-dialog v-model="dialogVisible" :title="t('album.createAlbum')">
      <el-form :model="albumForm" label-width="80px">
        <el-form-item :label="t('album.albumName')">
          <el-input v-model="albumForm.name" />
        </el-form-item>
        <el-form-item :label="t('album.albumDesc')">
          <el-input v-model="albumForm.intro" type="textarea" />
        </el-form-item>
        <el-form-item label="公开">
          <el-switch v-model="albumForm.is_public" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreate">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.toolbar {
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
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

.album-placeholder {
  width: 100%;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--hover-bg);
  color: var(--text-color-secondary);
  opacity: 0.5;
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
  gap: 12px;
}

.photo-actions-row .el-button {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
}

.photo-actions-row .el-button:hover {
  background: rgba(245, 108, 108, 0.8);
  border-color: rgba(245, 108, 108, 0.8);
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

.pagination {
  display: flex;
  justify-content: center;
  padding: 20px;
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
</style>