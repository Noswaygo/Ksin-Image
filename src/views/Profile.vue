<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { userApi } from '@/api'

const { t } = useI18n()
const userStore = useUserStore()

const loading = ref(false)
const activeTab = ref('info')
const profileForm = ref({
  name: '',
  username: '',
  tagline: '',
  bio: '',
  url: '',
  company: '',
  company_title: '',
  location: '',
  interests: [],
  socials: []
})
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const avatarFile = ref(null)
const avatarPreview = ref('')

const profileFormRef = ref(null)

const validateProfile = () => {
  if (!profileForm.value.name) {
    ElMessage.warning('请输入昵称')
    return false
  }
  if (!profileForm.value.username) {
    ElMessage.warning('请输入用户名')
    return false
  }
  return true
}

onMounted(() => {
  if (userStore.userInfo) {
    profileForm.value = {
      name: userStore.userInfo.name || '',
      username: userStore.userInfo.username || '',
      tagline: userStore.userInfo.tagline || '',
      bio: userStore.userInfo.bio || '',
      url: userStore.userInfo.url || '',
      company: userStore.userInfo.company || '',
      company_title: userStore.userInfo.company_title || '',
      location: userStore.userInfo.location || '',
      interests: userStore.userInfo.interests || [],
      socials: userStore.userInfo.socials || []
    }
    avatarPreview.value = userStore.userInfo.avatar_url || ''
  }
})

const handleAvatarChange = (file) => {
  const isImage = file.raw.type.startsWith('image/')
  const isLt2M = file.raw.size / 1024 / 1024 < 2

  if (!isImage) {
    ElMessage.error('只能上传图片文件！')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB！')
    return false
  }

  avatarFile.value = file.raw
  avatarPreview.value = URL.createObjectURL(file.raw)
}

const updateProfile = async () => {
  // 验证必填字段
  if (!validateProfile()) {
    return
  }

  loading.value = true
  try {
    const formData = new FormData()

    // 添加头像文件（如果有）
    if (avatarFile.value) {
      formData.append('avatar', avatarFile.value)
    }

    // 添加必填字段
    formData.append('name', profileForm.value.name)
    formData.append('username', profileForm.value.username)

    // 添加可选字段
    if (profileForm.value.tagline) formData.append('tagline', profileForm.value.tagline)
    if (profileForm.value.bio) formData.append('bio', profileForm.value.bio)
    if (profileForm.value.url) formData.append('url', profileForm.value.url)
    if (profileForm.value.company) formData.append('company', profileForm.value.company)
    if (profileForm.value.company_title) formData.append('company_title', profileForm.value.company_title)
    if (profileForm.value.location) formData.append('location', profileForm.value.location)

    // 添加兴趣爱好（数组）
    if (profileForm.value.interests && profileForm.value.interests.length > 0) {
      profileForm.value.interests.forEach((interest, index) => {
        formData.append(`interests[${index}]`, interest)
      })
    }

    // 添加社交媒体（数组）
    if (profileForm.value.socials && profileForm.value.socials.length > 0) {
      profileForm.value.socials.forEach((social, index) => {
        formData.append(`socials[${index}]`, social)
      })
    }

    await userApi.updateUserInfo(formData)
    await userStore.fetchUserInfo()
    ElMessage.success('更新成功')

    // 清空头像文件
    avatarFile.value = null
  } catch (error) {
    ElMessage.error('更新失败：' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

const changePassword = async () => {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    ElMessage.error(t('profile.passwordMismatch'))
    return
  }

  loading.value = true
  try {
    await userStore.changePassword({
      old_password: passwordForm.value.oldPassword,
      new_password: passwordForm.value.newPassword
    })
    ElMessage.success(t('profile.passwordChanged'))
    passwordForm.value = {
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  } catch (error) {
    ElMessage.error(t('profile.changePasswordFailed'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="profile">
    <el-row :gutter="20">
      <el-col :span="8">
        <el-card class="user-card">
          <div class="user-avatar">
            <img :src="userStore.avatar || '/default-avatar.png'" />
          </div>
          <h3>{{ userStore.username }}</h3>
          <p class="user-email">{{ userStore.email }}</p>
        </el-card>
      </el-col>

      <el-col :span="16">
        <el-card>
          <el-tabs v-model="activeTab">
            <el-tab-pane :label="t('profile.title')" name="info">
              <el-form :model="profileForm" label-width="100px" ref="profileFormRef">
                <el-form-item label="头像">
                  <el-upload
                    class="avatar-uploader"
                    action=""
                    :auto-upload="false"
                    :show-file-list="false"
                    accept="image/*"
                    :on-change="handleAvatarChange"
                  >
                    <img v-if="avatarPreview" :src="avatarPreview" class="avatar-preview" />
                    <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
                  </el-upload>
                </el-form-item>

                <el-form-item label="昵称" required>
                  <el-input v-model="profileForm.name" placeholder="显示名称" />
                </el-form-item>

                <el-form-item label="用户名" required>
                  <el-input v-model="profileForm.username" placeholder="登录账号" />
                </el-form-item>

                <el-form-item label="个性签名">
                  <el-input v-model="profileForm.tagline" placeholder="个性签名" />
                </el-form-item>

                <el-form-item label="个人简介">
                  <el-input v-model="profileForm.bio" type="textarea" :rows="4" />
                </el-form-item>

                <el-form-item label="个人网站">
                  <el-input v-model="profileForm.url" placeholder="https://..." />
                </el-form-item>

                <el-form-item label="公司">
                  <el-input v-model="profileForm.company" />
                </el-form-item>

                <el-form-item label="职位">
                  <el-input v-model="profileForm.company_title" />
                </el-form-item>

                <el-form-item label="所在地">
                  <el-input v-model="profileForm.location" />
                </el-form-item>

                <el-form-item>
                  <el-button type="primary" :loading="loading" @click="updateProfile">
                    {{ t('common.save') }}
                  </el-button>
                </el-form-item>
              </el-form>
            </el-tab-pane>

            <el-tab-pane :label="t('profile.changePassword')" name="password">
              <el-form :model="passwordForm" label-width="100px">
                <el-form-item :label="t('profile.oldPassword')">
                  <el-input v-model="passwordForm.oldPassword" type="password" disabled :placeholder="t('profile.passwordNotSupported')" />
                </el-form-item>
                <el-form-item :label="t('profile.newPassword')">
                  <el-input v-model="passwordForm.newPassword" type="password" disabled :placeholder="t('profile.passwordNotSupported')" />
                </el-form-item>
                <el-form-item :label="t('auth.confirmPassword')">
                  <el-input v-model="passwordForm.confirmPassword" type="password" disabled :placeholder="t('profile.passwordNotSupported')" />
                </el-form-item>
              </el-form>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.user-card {
  text-align: center;
}

.user-avatar {
  margin-bottom: 16px;
}

.user-avatar img {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
}

.user-card h3 {
  font-size: 18px;
  margin-bottom: 8px;
}

.user-email {
  color: var(--text-color-secondary);
  margin-bottom: 16px;
}

.avatar-uploader {
  display: inline-block;
}

.avatar-preview {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  cursor: pointer;
}

.avatar-uploader-icon {
  width: 100px;
  height: 100px;
  border: 1px dashed var(--border-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-color-secondary);
  transition: all 0.2s;
}

.avatar-uploader-icon:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}
</style>
