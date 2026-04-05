<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElDialog } from 'element-plus'
import { systemApi, albumApi } from '@/api'
import { useGroupStore, useSettingStore } from '@/stores'
import { Picture, Folder, Clock, Warning, Edit, Delete } from '@element-plus/icons-vue'

const { t } = useI18n()
const groupStore = useGroupStore()
const settingStore = useSettingStore()

// 文件列表，每项包含文件和单独设置
const fileList = ref([])
const uploading = ref(false)
const uploadProgress = ref(0)
const albumList = ref([])

// 编辑对话框
const editDialogVisible = ref(false)
const editingFile = ref(null)
const editingIndex = ref(-1)

// 可用标签选项
const tagOptions = [
  { label: '风景', value: 'landscape' },
  { label: '人物', value: 'people' },
  { label: '建筑', value: 'architecture' },
  { label: '街头', value: 'street' },
  { label: '自然', value: 'nature' },
  { label: '夜景', value: 'night' },
  { label: '静物', value: 'still_life' },
  { label: '其他', value: 'other' }
]

// 每张图片的设置
const createFileItem = (file, index) => {
  const url = URL.createObjectURL(file)
  return {
    file,
    url, // 预览URL
    name: file.name.replace(/\.[^/.]+$/, ''),
    album_id: '',
    expired_at: '',
    tags: [],
    is_public: false,
    is_remove_exif: false,
    intro: '',
    invalid: false,
    index
  }
}

const invalidFiles = computed(() => fileList.value.filter(f => f.invalid))

const handleFileChange = (uploadFile) => {
  const file = uploadFile.raw
  const ext = file.name.split('.').pop()?.toLowerCase()
  const sizeKB = file.size / 1024
  
  // 验证文件类型
  let invalid = false
  if (groupStore.allowFileTypes.length > 0 && !groupStore.allowFileTypes.includes(ext)) {
    ElMessage.warning(`不支持 ${ext} 格式，仅支持: ${groupStore.allowFileTypes.join(', ')}`)
    invalid = true
  }
  
  // 验证文件大小
  if (groupStore.maxUploadSize > 0 && sizeKB > groupStore.maxUploadSize) {
    ElMessage.warning(`文件大小超过限制 ${groupStore.maxUploadSizeText}`)
    invalid = true
  }
  
  // 添加到文件列表
  const item = createFileItem(file, fileList.value.length)
  item.invalid = invalid
  fileList.value.push(item)
  return true
}

const handleRemove = (index) => {
  // 释放URL对象
  const item = fileList.value[index]
  if (item && item.url) {
    URL.revokeObjectURL(item.url)
  }
  fileList.value.splice(index, 1)
}

const handleEdit = (item, index) => {
  editingFile.value = { ...item }
  editingIndex.value = index
  editDialogVisible.value = true
}

const saveEdit = () => {
  if (editingIndex.value >= 0) {
    fileList.value[editingIndex.value] = { ...editingFile.value }
  }
  editDialogVisible.value = false
}

// 清理URL对象
const cleanupURLs = () => {
  fileList.value.forEach(item => {
    if (item.url) {
      URL.revokeObjectURL(item.url)
    }
  })
}

onUnmounted(() => {
  cleanupURLs()
})

const handleUpload = async () => {
  if (fileList.value.length === 0) {
    ElMessage.warning('请选择要上传的图片')
    return
  }

  if (invalidFiles.value.length > 0) {
    ElMessage.warning('存在不符合上传要求的文件')
    return
  }

  uploading.value = true
  uploadProgress.value = 0

  try {
    const files = fileList.value.map(item => item.file)
    const firstItem = fileList.value[0]
    
    const options = {
      storage_id: settingStore.defaultStorageId,
      album_id: firstItem.album_id || undefined,
      tags: firstItem.tags,
      is_public: firstItem.is_public ? 1 : 0,
      is_remove_exif: firstItem.is_remove_exif ? 1 : 0,
      intro: firstItem.intro
    }

    await systemApi.uploadPhotos(files, options, (progress) => {
      uploadProgress.value = progress
    })

    ElMessage.success(t('upload.uploadSuccess'))
    cleanupURLs()
    fileList.value = []
    uploadProgress.value = 0
  } catch (error) {
    ElMessage.error(error.message || t('upload.uploadFailed'))
  } finally {
    uploading.value = false
  }
}

const fetchAlbums = async () => {
  try {
    const res = await albumApi.getAlbumList({ page: 1, pageSize: 100 })
    albumList.value = res.data?.data || []
  } catch (error) {
    console.error('获取相册列表失败:', error)
  }
}

onMounted(async () => {
  await groupStore.fetchGroupInfo()
  await fetchAlbums()
})
</script>

<template>
  <div class="upload">
    <el-card>
      <!-- 上传限制信息 -->
      <div v-if="groupStore.groupInfo" class="upload-limits">
        <div class="limits-header">
          <el-icon><Warning /></el-icon>
          <span>上传限制</span>
        </div>
        <div class="limits-content">
          <div class="limit-item">
            <div class="limit-icon">
              <Picture />
            </div>
            <div class="limit-info">
              <span class="limit-label">最大单文件</span>
              <span class="limit-value">{{ groupStore.maxUploadSizeText }}</span>
            </div>
          </div>
          <div class="limit-item">
            <div class="limit-icon">
              <Clock />
            </div>
            <div class="limit-info">
              <span class="limit-label">并发上传</span>
              <span class="limit-value">{{ groupStore.limitConcurrentUpload }} 个</span>
            </div>
          </div>
          <div class="limit-item">
            <div class="limit-icon">
              <Folder />
            </div>
            <div class="limit-info">
              <span class="limit-label">每日限制</span>
              <span class="limit-value">{{ groupStore.limitPerDay }} 次</span>
            </div>
          </div>
        </div>
        <div class="limit-types">
          <span class="types-label">允许格式：</span>
          <el-tag 
            v-for="ext in groupStore.allowFileTypes" 
            :key="ext" 
            size="small" 
            type="info"
          >
            {{ ext }}
          </el-tag>
          <span v-if="groupStore.allowFileTypes.length === 0" class="no-limit">
            全部格式
          </span>
        </div>
      </div>

      <el-upload
        drag
        multiple
        :accept="groupStore.allowExtensions.join(',')"
        :auto-upload="false"
        :show-file-list="false"
        :on-change="handleFileChange"
        class="upload-area"
      >
        <el-icon class="el-icon--upload"><Upload /></el-icon>
        <div class="el-upload__text">
          {{ t('upload.dragDrop') }}
          <em>{{ t('upload.selectFiles') }}</em>
        </div>
      </el-upload>

      <!-- 文件列表 -->
      <div v-if="fileList.length > 0" class="file-list">
        <div class="file-list-header">
          <span>已选择 {{ fileList.length }} 张图片</span>
          <span v-if="invalidFiles.length > 0" class="invalid-count">
            ({{ invalidFiles.length }} 张不符合要求)
          </span>
        </div>
        <div class="file-items">
          <div 
            v-for="(item, index) in fileList" 
            :key="index" 
            class="file-item"
            :class="{ invalid: item.invalid }"
          >
            <div class="file-thumb">
              <img :src="item.url" />
            </div>
            <div class="file-info">
              <div class="file-name">{{ item.name || item.file.name }}</div>
              <div class="file-meta">
                <span v-if="item.album_id">相册: {{ albumList.find(a => a.id === item.album_id)?.name }}</span>
                <span v-if="item.tags.length > 0">标签: {{ item.tags.join(', ') }}</span>
                <span v-if="item.is_public">公开</span>
              </div>
            </div>
            <div class="file-actions">
              <el-button text type="primary" @click="handleEdit(item, index)">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button text type="danger" @click="handleRemove(index)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="uploading" class="upload-progress">
        <el-progress :percentage="uploadProgress" :stroke-width="8" />
      </div>

      <div class="upload-actions">
        <el-button type="primary" :loading="uploading" @click="handleUpload">
          {{ t('common.upload') }}
        </el-button>
        <el-button v-if="fileList.length > 0" @click="fileList = []">
          {{ t('common.clear') }}
        </el-button>
        <span v-if="fileList.length > 0" class="file-count">
          已选择 {{ fileList.length }} 张图片
        </span>
      </div>
    </el-card>

    <!-- 编辑单张图片信息对话框 -->
    <el-dialog 
      v-model="editDialogVisible" 
      title="编辑图片信息" 
      width="500px"
    >
      <el-form v-if="editingFile" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="editingFile.name" placeholder="图片名称（不含扩展名）" />
        </el-form-item>
        <el-form-item label="相册">
          <el-select v-model="editingFile.album_id" placeholder="选择相册" style="width: 100%">
            <el-option label="不加入相册" value="" />
            <el-option 
              v-for="album in albumList" 
              :key="album.id" 
              :label="album.name" 
              :value="album.id" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="到期时间">
          <el-date-picker 
            v-model="editingFile.expired_at" 
            type="datetime" 
            placeholder="选择到期时间"
            format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="标签">
          <el-select v-model="editingFile.tags" multiple placeholder="选择标签" style="width: 100%">
            <el-option 
              v-for="tag in tagOptions" 
              :key="tag.value" 
              :label="tag.label" 
              :value="tag.value" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="editingFile.intro" type="textarea" :rows="2" placeholder="图片描述" />
        </el-form-item>
        <el-form-item label="设置">
          <el-checkbox v-model="editingFile.is_public">公开图片</el-checkbox>
          <el-checkbox v-model="editingFile.is_remove_exif">移除EXIF信息</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.upload-limits {
  background: linear-gradient(135deg, var(--bg-color-secondary) 0%, var(--bg-color) 100%);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.limits-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--el-color-primary);
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.limits-content {
  display: flex;
  gap: 24px;
  margin-bottom: 12px;
}

.limit-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.limit-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-color);
  border-radius: 6px;
  color: var(--el-color-primary);
  border: 1px solid var(--border-color);
}

.limit-info {
  display: flex;
  flex-direction: column;
}

.limit-label {
  font-size: 12px;
  color: var(--text-color-secondary);
}

.limit-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color-primary);
}

.limit-types {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.types-label {
  font-size: 13px;
  color: var(--text-color-secondary);
}

.no-limit {
  color: #52c41a;
  font-size: 13px;
}

.upload-area {
  margin: 16px 0;
}

.file-list {
  margin: 20px 0;
}

.file-list-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--text-color-primary);
}

.invalid-count {
  color: #ff4d4f;
}

.file-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.file-item {
  display: flex;
  flex-direction: column;
  padding: 12px;
  background: var(--bg-color-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.file-item.invalid {
  border-color: #ff4d4f;
  background: rgba(255, 77, 79, 0.1);
}

.file-thumb {
  width: 100%;
  height: 120px;
  border-radius: 4px;
  overflow: hidden;
  background: var(--bg-color);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.file-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 13px;
  color: var(--text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.file-meta {
  font-size: 11px;
  color: var(--text-color-secondary);
}

.file-meta span + span::before {
  content: ' | ';
}

.file-actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 8px;
}

.upload-progress {
  margin: 20px 0;
}

.upload-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
}

.file-count {
  color: var(--text-color-secondary);
  font-size: 14px;
}

:deep(.el-upload-dragger) {
  padding: 40px;
}

:deep(.el-icon--upload) {
  font-size: 48px;
  color: var(--el-color-primary);
  margin-bottom: 16px;
}
</style>