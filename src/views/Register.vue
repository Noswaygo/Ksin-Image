<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useSettingStore } from '@/stores'
import { captchaApi } from '@/api'
import { User, Lock, Message, Iphone, Close } from '@element-plus/icons-vue'

const { t } = useI18n()
const userStore = useUserStore()
const settingStore = useSettingStore()

// 初始化主题
onMounted(() => {
  settingStore.applyTheme()
  settingStore.setThemeColor(settingStore.themeColor)
  // 默认选择手机号注册
  registerType.value = 'phone'
  // 加载图形验证码
  loadCaptcha()
})

const handleClose = () => {
  window.electronAPI?.closeAuthWindow?.()
}

const registerType = ref('username')
const registerForm = ref({
  username: '',
  email: '',
  phone: '',
  country_code: 'cn',
  password: '',
  confirmPassword: '',
  code: '', // 验证码
  captcha: '', // 图形验证码
  captcha_key: '' // 图形验证码密钥
})

const loading = ref(false)
const codeSending = ref(false)
const countdown = ref(0)
const timer = ref(null)
const captchaUrl = ref('')

// 国家/地区代码列表 - 完整的国际区号
const countries = [
  { label: '+1', value: 'us' },
  { label: '+7', value: 'ru' },
  { label: '+20', value: 'eg' },
  { label: '+27', value: 'za' },
  { label: '+30', value: 'gr' },
  { label: '+31', value: 'nl' },
  { label: '+32', value: 'be' },
  { label: '+33', value: 'fr' },
  { label: '+34', value: 'es' },
  { label: '+36', value: 'hu' },
  { label: '+39', value: 'it' },
  { label: '+40', value: 'ro' },
  { label: '+41', value: 'ch' },
  { label: '+43', value: 'at' },
  { label: '+44', value: 'gb' },
  { label: '+45', value: 'dk' },
  { label: '+46', value: 'se' },
  { label: '+47', value: 'no' },
  { label: '+48', value: 'pl' },
  { label: '+49', value: 'de' },
  { label: '+51', value: 'pe' },
  { label: '+52', value: 'mx' },
  { label: '+53', value: 'cu' },
  { label: '+54', value: 'ar' },
  { label: '+55', value: 'br' },
  { label: '+56', value: 'cl' },
  { label: '+57', value: 'co' },
  { label: '+58', value: 've' },
  { label: '+60', value: 'my' },
  { label: '+61', value: 'au' },
  { label: '+62', value: 'id' },
  { label: '+63', value: 'ph' },
  { label: '+64', value: 'nz' },
  { label: '+65', value: 'sg' },
  { label: '+66', value: 'th' },
  { label: '+81', value: 'jp' },
  { label: '+82', value: 'kr' },
  { label: '+84', value: 'vn' },
  { label: '+86', value: 'cn' },
  { label: '+88', value: 'bd' },
  { label: '+90', value: 'tr' },
  { label: '+91', value: 'in' },
  { label: '+92', value: 'pk' },
  { label: '+93', value: 'af' },
  { label: '+94', value: 'lk' },
  { label: '+95', value: 'mm' },
  { label: '+98', value: 'ir' },
  { label: '+212', value: 'ma' },
  { label: '+213', value: 'dz' },
  { label: '+216', value: 'tn' },
  { label: '+218', value: 'ly' },
  { label: '+220', value: 'gm' },
  { label: '+221', value: 'sn' },
  { label: '+222', value: 'mr' },
  { label: '+223', value: 'ml' },
  { label: '+224', value: 'gn' },
  { label: '+225', value: 'ci' },
  { label: '+226', value: 'bf' },
  { label: '+227', value: 'ne' },
  { label: '+228', value: 'tg' },
  { label: '+229', value: 'bj' },
  { label: '+230', value: 'mu' },
  { label: '+231', value: 'lr' },
  { label: '+232', value: 'sl' },
  { label: '+233', value: 'gh' },
  { label: '+234', value: 'ng' },
  { label: '+235', value: 'td' },
  { label: '+236', value: 'cf' },
  { label: '+237', value: 'cm' },
  { label: '+238', value: 'cv' },
  { label: '+239', value: 'st' },
  { label: '+240', value: 'gq' },
  { label: '+241', value: 'ga' },
  { label: '+242', value: 'cg' },
  { label: '+243', value: 'cd' },
  { label: '+244', value: 'ao' },
  { label: '+245', value: 'gw' },
  { label: '+246', value: 'io' },
  { label: '+248', value: 'sc' },
  { label: '+249', value: 'sd' },
  { label: '+250', value: 'rw' },
  { label: '+251', value: 'et' },
  { label: '+252', value: 'so' },
  { label: '+253', value: 'dj' },
  { label: '+254', value: 'ke' },
  { label: '+255', value: 'tz' },
  { label: '+256', value: 'ug' },
  { label: '+257', value: 'bi' },
  { label: '+258', value: 'mz' },
  { label: '+260', value: 'zm' },
  { label: '+261', value: 'mg' },
  { label: '+262', value: 're' },
  { label: '+263', value: 'zw' },
  { label: '+264', value: 'na' },
  { label: '+265', value: 'mw' },
  { label: '+266', value: 'ls' },
  { label: '+267', value: 'bw' },
  { label: '+268', value: 'sz' },
  { label: '+269', value: 'km' },
  { label: '+290', value: 'sh' },
  { label: '+291', value: 'er' },
  { label: '+297', value: 'aw' },
  { label: '+298', value: 'fo' },
  { label: '+299', value: 'gl' },
  { label: '+350', value: 'gi' },
  { label: '+351', value: 'pt' },
  { label: '+352', value: 'lu' },
  { label: '+353', value: 'ie' },
  { label: '+354', value: 'is' },
  { label: '+355', value: 'al' },
  { label: '+356', value: 'mt' },
  { label: '+357', value: 'cy' },
  { label: '+358', value: 'fi' },
  { label: '+359', value: 'bg' },
  { label: '+370', value: 'lt' },
  { label: '+371', value: 'lv' },
  { label: '+372', value: 'ee' },
  { label: '+373', value: 'md' },
  { label: '+374', value: 'am' },
  { label: '+375', value: 'by' },
  { label: '+376', value: 'ad' },
  { label: '+377', value: 'mc' },
  { label: '+378', value: 'sm' },
  { label: '+380', value: 'ua' },
  { label: '+381', value: 'rs' },
  { label: '+382', value: 'me' },
  { label: '+383', value: 'xk' },
  { label: '+385', value: 'hr' },
  { label: '+386', value: 'si' },
  { label: '+387', value: 'ba' },
  { label: '+389', value: 'mk' },
  { label: '+420', value: 'cz' },
  { label: '+421', value: 'sk' },
  { label: '+423', value: 'li' },
  { label: '+500', value: 'fk' },
  { label: '+501', value: 'bz' },
  { label: '+502', value: 'gt' },
  { label: '+503', value: 'sv' },
  { label: '+504', value: 'hn' },
  { label: '+505', value: 'ni' },
  { label: '+506', value: 'cr' },
  { label: '+507', value: 'pa' },
  { label: '+508', value: 'pm' },
  { label: '+509', value: 'ht' },
  { label: '+590', value: 'gp' },
  { label: '+591', value: 'bo' },
  { label: '+592', value: 'gy' },
  { label: '+593', value: 'ec' },
  { label: '+594', value: 'gf' },
  { label: '+595', value: 'py' },
  { label: '+596', value: 'mq' },
  { label: '+597', value: 'sr' },
  { label: '+598', value: 'uy' },
  { label: '+599', value: 'cw' },
  { label: '+670', value: 'tl' },
  { label: '+672', value: 'nf' },
  { label: '+673', value: 'bn' },
  { label: '+674', value: 'nr' },
  { label: '+675', value: 'pg' },
  { label: '+676', value: 'to' },
  { label: '+677', value: 'sb' },
  { label: '+678', value: 'vu' },
  { label: '+679', value: 'fj' },
  { label: '+680', value: 'pw' },
  { label: '+681', value: 'wf' },
  { label: '+682', value: 'ck' },
  { label: '+683', value: 'nu' },
  { label: '+685', value: 'ws' },
  { label: '+686', value: 'ki' },
  { label: '+687', value: 'nc' },
  { label: '+688', value: 'tv' },
  { label: '+689', value: 'pf' },
  { label: '+690', value: 'tk' },
  { label: '+691', value: 'fm' },
  { label: '+692', value: 'mh' },
  { label: '+850', value: 'kp' },
  { label: '+852', value: 'hk' },
  { label: '+853', value: 'mo' },
  { label: '+855', value: 'kh' },
  { label: '+856', value: 'la' },
  { label: '+880', value: 'bd' },
  { label: '+886', value: 'tw' },
  { label: '+960', value: 'mv' },
  { label: '+961', value: 'lb' },
  { label: '+962', value: 'jo' },
  { label: '+963', value: 'sy' },
  { label: '+964', value: 'iq' },
  { label: '+965', value: 'kw' },
  { label: '+966', value: 'sa' },
  { label: '+967', value: 'ye' },
  { label: '+968', value: 'om' },
  { label: '+970', value: 'ps' },
  { label: '+971', value: 'ae' },
  { label: '+972', value: 'il' },
  { label: '+973', value: 'bh' },
  { label: '+974', value: 'qa' },
  { label: '+975', value: 'bt' },
  { label: '+976', value: 'mn' },
  { label: '+977', value: 'np' },
  { label: '+992', value: 'tj' },
  { label: '+993', value: 'tm' },
  { label: '+994', value: 'az' },
  { label: '+995', value: 'ge' },
  { label: '+996', value: 'kg' },
  { label: '+998', value: 'uz' }
]

// 加载图形验证码
const loadCaptcha = async () => {
  try {
    const res = await captchaApi.getCaptcha()
    if (res.data?.img) {
      captchaUrl.value = res.data.img
      registerForm.value.captcha_key = res.data.key || ''
    }
  } catch (error) {
    console.error('加载验证码失败', error)
  }
}

const handleRegister = async () => {
  if (registerForm.value.password !== registerForm.value.confirmPassword) {
    ElMessage.error('两次密码输入不一致')
    return
  }

  // 邮箱和手机号注册需要验证码
  if ((registerType.value === 'email' || registerType.value === 'phone') && !registerForm.value.code) {
    ElMessage.warning('请输入验证码')
    return
  }

  loading.value = true
  try {
    let data = {
      password: registerForm.value.password
    }

    if (registerType.value === 'username') {
      data.username = registerForm.value.username
    } else if (registerType.value === 'email') {
      data.email = registerForm.value.email
      data.code = registerForm.value.code
    } else if (registerType.value === 'phone') {
      data.phone = registerForm.value.phone
      data.code = registerForm.value.code
    }

    await userStore.register(data)
    ElMessage.success(t('auth.registerSuccess'))
    goToLogin()
  } catch (error) {
    ElMessage.error(error.message || '注册失败')
  } finally {
    loading.value = false
  }
}

const goToLogin = () => {
  window.electronAPI?.openAuthWindow?.('login')
  window.electronAPI?.closeAuthWindow?.()
}

const sendCode = async () => {
  if (codeSending.value || countdown.value > 0) return

  if (registerType.value === 'phone' && !registerForm.value.phone) {
    ElMessage.warning('请先输入手机号')
    return
  }

  if (registerType.value === 'email' && !registerForm.value.email) {
    ElMessage.warning('请先输入邮箱')
    return
  }

  if (registerType.value === 'phone' && !registerForm.value.captcha) {
    ElMessage.warning('请先输入图形验证码')
    return
  }

  if (registerType.value === 'email' && !registerForm.value.captcha) {
    ElMessage.warning('请先输入图形验证码')
    return
  }

  codeSending.value = true
  try {
    if (registerType.value === 'phone') {
      await captchaApi.sendSmsCode(
        registerForm.value.phone,
        registerForm.value.captcha,
        registerForm.value.captcha_key,
        registerForm.value.country_code,
        'register'
      )
      ElMessage.success('验证码已发送到您的手机')
    } else if (registerType.value === 'email') {
      await captchaApi.sendEmailCode(
        registerForm.value.email,
        registerForm.value.captcha,
        registerForm.value.captcha_key
      )
      ElMessage.success('验证码已发送到您的邮箱')
    }

    // 开始倒计时
    countdown.value = 60
    timer.value = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(timer.value)
        timer.value = null
      }
    }, 1000)
  } catch (error) {
    ElMessage.error(error.message || '发送验证码失败')
    // 发送失败后刷新验证码
    loadCaptcha()
  } finally {
    codeSending.value = false
  }
}
</script>

<template>
  <div class="register-container">
    <div class="register-box">
      <button class="close-button" @click="handleClose">
        <Close />
      </button>
      <div class="register-header">
        <img src="/build/icon.ico" alt="Logo" class="logo" />
        <h1>{{ t('app.name') }}</h1>
        <p>{{ t('app.description') }}</p>
      </div>

      <div class="register-tabs">
        <div
          class="tab-item"
          :class="{ active: registerType === 'email' }"
          @click="registerType = 'email'"
        >
          <Message /> 邮箱
        </div>
        <div
          class="tab-item"
          :class="{ active: registerType === 'phone' }"
          @click="registerType = 'phone'"
        >
          <Iphone /> 手机号
        </div>
      </div>

      <el-form class="register-form" @submit.prevent="handleRegister">
        <el-form-item>
          <el-input
            v-model="registerForm.username"
            :placeholder="t('auth.usernamePlaceholder')"
            size="large"
            clearable
          >
            <template #prefix>
              <User />
            </template>
          </el-input>
        </el-form-item>

        <el-form-item v-if="registerType === 'email'">
          <el-input
            v-model="registerForm.email"
            placeholder="请输入邮箱"
            size="large"
            clearable
          >
            <template #prefix>
              <Message />
            </template>
          </el-input>
        </el-form-item>

        <el-form-item v-if="registerType === 'email'">
          <div class="captcha-row">
            <el-input
              v-model="registerForm.captcha"
              placeholder="请输入图形验证码"
              size="large"
              clearable
            >
              <template #prefix>
                <Message />
              </template>
            </el-input>
            <img v-if="captchaUrl" :src="captchaUrl" class="captcha-img" @click="loadCaptcha" alt="图形验证码" />
          </div>
        </el-form-item>

        <el-form-item v-if="registerType === 'phone'">
          <div class="phone-row">
            <el-select v-model="registerForm.country_code" class="country-select" size="large">
              <el-option
                v-for="country in countries"
                :key="country.value"
                :label="country.label"
                :value="country.value"
              />
            </el-select>
            <el-input
              v-model="registerForm.phone"
              placeholder="请输入手机号"
              size="large"
              clearable
            >
              <template #prefix>
                <Iphone />
              </template>
            </el-input>
          </div>
        </el-form-item>

        <el-form-item v-if="registerType === 'phone'">
          <div class="captcha-row">
            <el-input
              v-model="registerForm.captcha"
              placeholder="请输入图形验证码"
              size="large"
              clearable
            >
              <template #prefix>
                <Message />
              </template>
            </el-input>
            <img v-if="captchaUrl" :src="captchaUrl" class="captcha-img" @click="loadCaptcha" alt="图形验证码" />
          </div>
        </el-form-item>

        <el-form-item v-if="registerType === 'email' || registerType === 'phone'">
          <div class="code-input-row">
            <el-input
              v-model="registerForm.code"
              placeholder="请输入验证码"
              size="large"
              clearable
            >
              <template #prefix>
                <Message v-if="registerType === 'email'" />
                <Iphone v-if="registerType === 'phone'" />
              </template>
            </el-input>
            <el-button
              v-if="registerType === 'email'"
              :disabled="codeSending || countdown > 0"
              :loading="codeSending"
              @click="sendCode"
              class="code-button"
              size="large"
            >
              {{ countdown > 0 ? `${countdown}秒` : '发送验证码' }}
            </el-button>
          </div>
        </el-form-item>

        <el-form-item>
          <el-input
            v-model="registerForm.password"
            type="password"
            :placeholder="t('auth.passwordPlaceholder')"
            size="large"
            show-password
          >
            <template #prefix>
              <Lock />
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-input
            v-model="registerForm.confirmPassword"
            type="password"
            :placeholder="t('auth.confirmPassword')"
            size="large"
            show-password
          >
            <template #prefix>
              <Lock />
            </template>
          </el-input>
        </el-form-item>

        <!-- 暂时移除验证码 -->
        <!-- <el-form-item>
          <div class="captcha-row">
            <el-input
              v-model="registerForm.captcha"
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
            @click="handleRegister"
            class="register-button"
          >
            {{ t('auth.register') }}
          </el-button>
        </el-form-item>

        <div class="register-footer">
          <span>{{ t('auth.hasAccount') }}</span>
          <el-link type="primary" @click="goToLogin">{{ t('auth.goLogin') }}</el-link>
        </div>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.register-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  background: var(--bg-color);
  padding: 0;
  margin: 0;
}

.register-box {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 40px 50px;
  background: var(--bg-color);
  box-sizing: border-box;
  overflow: hidden;
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

.register-header {
  text-align: center;
  margin-bottom: 32px;
}

.register-header .logo {
  width: 80px;
  height: 80px;
  margin-bottom: 10px;
}

.register-header h1 {
  font-size: 28px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 8px;
}

.input-with-code {
  display: flex;
  gap: 12px;
  width: 100%;
}

.input-with-code .el-input {
  flex: 1;
}

.phone-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.phone-row .country-select {
  width: 120px;
  flex-shrink: 0;
}

.phone-row .el-input {
  flex: 1;
  min-width: 0;
}

.code-input-row {
  display: flex;
  gap: 12px;
  width: 100%;
}

.code-input-row .el-input {
  flex: 1;
  min-width: 0;
}

.code-input-row .code-button {
  flex-shrink: 0;
  min-width: 110px;
}

.captcha-row {
  display: flex;
  gap: 12px;
  width: 100%;
}

.captcha-row .el-input {
  flex: 1;
  min-width: 0;
}

.captcha-img {
  width: 120px;
  height: 40px;
  cursor: pointer;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  object-fit: cover;
  flex-shrink: 0;
}

.captcha-img:hover {
  border-color: var(--primary-color);
}

.code-button {
  min-width: 120px;
}

.code-button:disabled {
  min-width: 120px;
}

.register-header p {
  font-size: 14px;
  color: var(--text-color-secondary);
}

.register-tabs {
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

.register-form {
  margin-top: 12px;
}



.register-button {
  width: 100%;
  margin-top: 2px;
  height: 34px;
  font-size: 13px;
}

.register-footer {
  text-align: center;
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-color-secondary);
}

.register-footer .el-link {
  margin-left: 6px;
}
</style>
