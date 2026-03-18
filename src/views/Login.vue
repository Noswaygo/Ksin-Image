<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useSettingStore } from '@/stores'
import { User, Lock, Message, Iphone, Close } from '@element-plus/icons-vue'

const { t } = useI18n()
const userStore = useUserStore()
const settingStore = useSettingStore()

const loginType = ref('email') // email, phone, username
const loginForm = ref({
  username: '',
  email: '',
  phone: '',
  password: ''
})

const rememberPassword = ref(false)

const loading = ref(false)

// 初始化主题
onMounted(() => {
  settingStore.applyTheme()
  settingStore.setThemeColor(settingStore.themeColor)
})

const handleClose = () => {
  if (window.electronAPI?.closeAuthWindow) {
    window.electronAPI.closeAuthWindow()
  } else {
    router.push('/')
  }
}

const handleLogin = async () => {
  loading.value = true
  try {
    let data = {
      login_type: loginType.value,
      password: loginForm.value.password
    }

    // 所有登录方式都使用对应的字段作为用户名
    if (loginType.value === 'email') {
      data.username = loginForm.value.email
    } else if (loginType.value === 'phone') {
      data.username = loginForm.value.phone
    } else if (loginType.value === 'username') {
      data.username = loginForm.value.username
    }

    // 只有勾选了"记住我"才传递 remember 参数
    if (rememberPassword.value) {
      data.remember = true
    }

    console.log('开始登录，数据:', data)
    const res = await userStore.login(data)
    console.log('登录成功，响应:', res)
    console.log('当前 token:', userStore.token)
    console.log('当前 isLoggedIn:', userStore.isLoggedIn)
    console.log('当前 userInfo:', userStore.userInfo)

    // 通知主窗口登录成功，传递 token 和用户信息
    if (window.electronAPI?.authSuccess) {
      console.log('调用 authSuccess 通知主窗口')
      // 只传递基本数据，避免循环引用或不可序列化对象
      await window.electronAPI.authSuccess({
        token: userStore.token,
        userInfo: {
          id: userStore.userInfo?.id,
          name: userStore.userInfo?.name,
          username: userStore.userInfo?.username,
          email: userStore.userInfo?.email,
          phone: userStore.userInfo?.phone,
          avatar_url: userStore.userInfo?.avatar_url
        }
      })
    }

    ElMessage.success(t('auth.loginSuccess'))
    // 延迟关闭窗口，确保事件已经发送
    setTimeout(() => {
      handleClose()
    }, 300)
  } catch (error) {
    console.error('登录失败:', error)
    ElMessage.error(error.message || '登录失败')
  } finally {
    loading.value = false
  }
}

const goToRegister = () => {
  if (window.electronAPI?.openAuthWindow) {
    window.electronAPI.openAuthWindow('register')
  } else {
    router.push('/register')
  }
}

const handleForgetPassword = () => {
  window.electronAPI?.openExternal?.('https://img.ksinx.com/forget-password')
}
</script>

<template>
  <div class="login-container">
    <div class="login-box">
      <button class="close-button" @click="handleClose">
        <Close />
      </button>
      <div class="login-header">
        <img src="/build/icon.ico" alt="Logo" class="logo" />
        <h1>{{ t('app.name') }}</h1>
        <p>{{ t('app.description') }}</p>
      </div>

      <div class="login-tabs">
        <div
          class="tab-item"
          :class="{ active: loginType === 'email' }"
          @click="loginType = 'email'"
        >
          <Message /> {{ t('auth.loginByEmail') }}
        </div>
        <div
          class="tab-item"
          :class="{ active: loginType === 'phone' }"
          @click="loginType = 'phone'"
        >
          <Iphone /> {{ t('auth.loginByPhone') }}
        </div>
        <div
          class="tab-item"
          :class="{ active: loginType === 'username' }"
          @click="loginType = 'username'"
        >
          <User /> {{ t('auth.loginByUsername') }}
        </div>
      </div>

      <el-form class="login-form" @submit.prevent="handleLogin">
        <el-form-item v-if="loginType === 'username'">
          <el-input
            v-model="loginForm.username"
            :placeholder="t('auth.usernamePlaceholder')"
            size="large"
            clearable
          >
            <template #prefix>
              <User />
            </template>
          </el-input>
        </el-form-item>

        <el-form-item v-if="loginType === 'email'">
          <el-input
            v-model="loginForm.email"
            :placeholder="t('auth.emailPlaceholder')"
            size="large"
            clearable
          >
            <template #prefix>
              <Message />
            </template>
          </el-input>
        </el-form-item>

        <el-form-item v-if="loginType === 'phone'">
          <el-input
            v-model="loginForm.phone"
            :placeholder="t('auth.phonePlaceholder')"
            size="large"
            clearable
          >
            <template #prefix>
              <Iphone />
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-input
            v-model="loginForm.password"
            type="password"
            :placeholder="t('auth.passwordPlaceholder')"
            size="large"
            show-password
          >
            <template #prefix>
              <Lock />
            </template>
          </el-input>
          <div class="password-options">
            <el-checkbox v-model="rememberPassword">记住我</el-checkbox>
            <el-link type="primary" @click="handleForgetPassword">忘记密码？</el-link>
          </div>
        </el-form-item>

        <!-- 暂时移除验证码 -->
        <!-- <el-form-item>
          <div class="captcha-row">
            <el-input
              v-model="loginForm.captcha"
              :placeholder="t('auth.captcha')"
              size="large"
              clearable
            >
              <template #prefix>
                <Position />
              </template>
            </el-input>
            <img :src="captchaUrl" class="captcha-img" @click="loadCaptcha" />
          </div>
        </el-form-item> -->

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            @click="handleLogin"
            class="login-button"
          >
            {{ t('auth.login') }}
          </el-button>
        </el-form-item>

        <div class="login-footer">
          <span>{{ t('auth.noAccount') }}</span>
          <el-link type="primary" @click="goToRegister">{{ t('auth.goRegister') }}</el-link>
        </div>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  background: var(--bg-color);
  padding: 0;
  margin: 0;
}

.login-box {
  position: relative;
  width: 100%;
  padding: 40px 50px;
  background: var(--bg-color);
  box-sizing: border-box;
}

.close-button {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  color: var(--text-color-secondary);
  transition: all 0.2s;
  z-index: 10;
}

.close-button:hover {
  background: var(--hover-bg);
  color: var(--text-color);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-header .logo {
  width: 80px;
  height: 80px;
  margin-bottom: 10px;
}

.login-header h1 {
  font-size: 28px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 8px;
}

.login-header p {
  font-size: 14px;
  color: var(--text-color-secondary);
}

.login-tabs {
  display: flex;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  font-size: 14px;
  color: var(--text-color-secondary);
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.3s;
  white-space: nowrap;
}

.tab-item svg {
  margin-right: 6px;
  width: 16px;
  height: 16px;
}

.tab-item:hover {
  background: var(--hover-bg);
}

.tab-item.active {
  background: var(--active-bg);
  color: var(--primary-color);
}

.login-form {
  margin-top: 12px;
}

.login-button {
  width: 100%;
  margin-top: 4px;
  height: 38px;
  font-size: 14px;
}

.password-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  width: 100%;
}

.login-footer {
  text-align: center;
  margin-top: 10px;
  font-size: 13px;
  color: var(--text-color-secondary);
}

.login-footer .el-link {
  margin-left: 6px;
}
</style>
