<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { albumApi, squareAlbumApi } from '@/api'

const { t } = useI18n()

const loading = ref(false)
const albums = ref([])
const dialogVisible = ref(false)
const albumForm = ref({
  name: '',
  description: ''
})

const fetchAlbums = async () => {
  loading.value = true
  try {
    const res = await squareAlbumApi.getAlbumList()
    albums.value = res.data?.data || []
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
    albumForm.value = { name: '', description: '' }
    fetchAlbums()
  } catch (error) {
    ElMessage.error('创建失败')
  }
}

onMounted(() => {
  fetchAlbums()
})
</script>

<template>
  <div class="albums">
    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <el-button type="primary" @click="dialogVisible = true">
            {{ t('album.createAlbum') }}
          </el-button>
        </div>
      </template>

      <el-empty v-if="albums.length === 0" description="暂无相册" />

      <div v-else class="album-grid">
        <el-card v-for="album in albums" :key="album.id" class="album-card">
          <div v-if="album.covers && album.covers.length > 0" class="album-covers">
            <img :src="album.covers[0]" class="album-cover" />
          </div>
          <div v-else class="album-placeholder">
            <div class="placeholder-icon">📁</div>
          </div>
          <h4>{{ album.name }}</h4>
          <p>{{ album.intro || '暂无简介' }}</p>
          <p class="album-count">{{ album.photo_count }} 张图片</p>
          <div class="album-user">
            <img :src="album.user.avatar_url || '/default-avatar.png'" class="user-avatar" />
            <span>{{ album.user.name || album.user.username }}</span>
          </div>
        </el-card>
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="t('album.createAlbum')">
      <el-form :model="albumForm" label-width="80px">
        <el-form-item :label="t('album.albumName')">
          <el-input v-model="albumForm.name" />
        </el-form-item>
        <el-form-item :label="t('album.albumDesc')">
          <el-input v-model="albumForm.description" type="textarea" />
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
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.album-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
}

.album-card {
  text-align: center;
  transition: transform 0.2s;
  cursor: pointer;
}

.album-card:hover {
  transform: translateY(-4px);
}

.album-covers {
  width: 100%;
  height: 150px;
  overflow: hidden;
  border-radius: 8px;
  margin-bottom: 12px;
}

.album-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.album-placeholder {
  width: 100%;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--hover-bg);
  border-radius: 8px;
  margin-bottom: 12px;
}

.placeholder-icon {
  font-size: 48px;
  opacity: 0.3;
}

.album-card h4 {
  font-size: 16px;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.album-card > p {
  font-size: 13px;
  color: var(--text-color-secondary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.album-count {
  font-size: 12px;
  color: var(--text-color-secondary);
}

.album-user {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 8px;
  gap: 6px;
}

.user-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.album-user span {
  font-size: 12px;
  color: var(--text-color-secondary);
}
</style>
