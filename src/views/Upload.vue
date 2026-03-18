<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { systemApi } from '@/api'

const { t } = useI18n()

const fileList = ref([])
const uploading = ref(false)
const selectedAlbum = ref('')
const tags = ref([])
const uploadProgress = ref(0)

const handleFileChange = (uploadFile) => {
  fileList.value.push(uploadFile.raw)
}

const handleRemove = (index) => {
  fileList.value.splice(index, 1)
}

const handleUpload = async () => {
  if (fileList.value.length === 0) {
    ElMessage.warning('请选择要上传的图片')
    return
  }

  uploading.value = true
  uploadProgress.value = 0

  try {
    for (let i = 0; i < fileList.value.length; i++) {
      const file = fileList.value[i]
      await systemApi.uploadPhoto(file, (progress) => {
        uploadProgress.value = Math.round((i + progress / 100) / fileList.value.length * 100)
      })
    }

    ElMessage.success(t('upload.uploadSuccess'))
    fileList.value = []
    uploadProgress.value = 0
  } catch (error) {
    ElMessage.error(error.message || t('upload.uploadFailed'))
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="upload">
    <el-card>
      <el-upload
        drag
        multiple
        accept="image/*"
        :auto-upload="false"
        :on-change="handleFileChange"
      >
        <el-icon class="el-icon--upload"><Upload /></el-icon>
        <div class="el-upload__text">
          {{ t('upload.dragDrop') }}
          <em>{{ t('upload.selectFiles') }}</em>
        </div>
      </el-upload>

      <div v-if="fileList.length > 0" class="upload-settings">
        <el-form label-width="100px">
          <el-form-item :label="t('upload.selectAlbum')">
            <el-select v-model="selectedAlbum" :placeholder="t('upload.defaultAlbum')">
              <el-option :label="t('upload.defaultAlbum')" value="" />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('upload.addTags')">
            <el-select v-model="tags" multiple :placeholder="t('upload.addTags')">
              <el-option :label="t('upload.landscape')" value="landscape" />
              <el-option :label="t('upload.people')" value="people" />
            </el-select>
          </el-form-item>
        </el-form>
      </div>

      <div v-if="uploading" class="upload-progress">
        <el-progress :percentage="uploadProgress" />
      </div>

      <div class="upload-actions">
        <el-button type="primary" :loading="uploading" @click="handleUpload">
          {{ t('common.upload') }}
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.upload-settings {
  margin: 20px 0;
}

.upload-progress {
  margin: 20px 0;
}

.upload-actions {
  text-align: center;
  margin-top: 20px;
}
</style>
