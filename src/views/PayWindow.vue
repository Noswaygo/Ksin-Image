<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { planApi, orderApi } from '@/api'
import { useSettingStore } from '@/stores'

const { t } = useI18n()
const route = useRoute()
const settingStore = useSettingStore()
const plan = ref(null)
const selectedPrice = ref(null)
const planLoading = ref(false)
const buyLoading = ref(false)
const payLoading = ref(false)
const selectedPlatform = ref('alipay')
const createdOrder = ref(null)
const payStep = ref('select') // select -> paying -> done
const pollTimer = ref(null)

const payPlatforms = [
  { value: 'alipay', label: '支付宝', channel: 'alipay', method: 'web' },
  { value: 'paypal', label: 'PayPal', channel: 'paypal', method: 'web' }
]

const currentPayPlatform = computed(() => {
  return payPlatforms.find(p => p.value === selectedPlatform.value)
})

const getSelectedPriceObject = computed(() => {
  if (!selectedPrice.value || !plan.value?.prices) return null
  return plan.value.prices.find(p => p.id === selectedPrice.value)
})

const formatDuration = (minutes) => {
  if (!minutes) return ''
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return hours + '小时'
  const days = Math.floor(hours / 24)
  if (days >= 365) return Math.floor(days / 365) + '年'
  if (days >= 30) return Math.floor(days / 30) + '个月'
  return days + '天'
}

const fetchPlanDetail = async () => {
  const planId = route.query.plan
  if (!planId) {
    ElMessage.error('缺少套餐信息')
    return
  }
  planLoading.value = true
  try {
    const res = await planApi.getPlanDetail(planId)
    plan.value = res.data
    const priceId = route.query.price
    if (priceId && plan.value?.prices) {
      const found = plan.value.prices.find(p => String(p.id) === String(priceId))
      if (found) selectedPrice.value = found.id
    }
  } catch (error) {
    ElMessage.error('获取套餐详情失败')
  } finally {
    planLoading.value = false
  }
}

const handleClose = () => {
  stopPolling()
  window.electronAPI?.closePayWindow?.()
}

const handleBuy = async () => {
  if (!selectedPrice.value) {
    ElMessage.warning(t('subscription.selectPlanDuration'))
    return
  }
  try {
    buyLoading.value = true
    const res = await orderApi.createOrder({ price_id: selectedPrice.value })
    createdOrder.value = res.data?.data || res.data
    if (createdOrder.value?.trade_no) {
      payStep.value = 'paying'
    } else {
      ElMessage.error(t('subscription.createOrderFailed'))
    }
  } catch (error) {
    const msg = error.response?.data?.message || t('subscription.createOrderFailed')
    ElMessage.error(msg)
  } finally {
    buyLoading.value = false
  }
}

const handlePay = async () => {
  if (!createdOrder.value?.trade_no || !currentPayPlatform.value) return
  try {
    payLoading.value = true
    const platform = currentPayPlatform.value
    const payData = {
      platform: platform.value,
      channel: platform.channel,
      method: platform.method
    }

    if (platform.value === 'paypal') {
      payData.return_url = 'https://img.ksinx.com'
      payData.cancel_url = 'https://img.ksinx.com'
    }

    const res = await orderApi.payOrder(createdOrder.value.trade_no, payData)
    const data = res.data?.data || res.data

    if (platform.value === 'paypal' && data?.url) {
      // PayPal: 打开默认浏览器
      window.electronAPI?.openExternal?.(data.url)
      payStep.value = 'done'
      // 通知主窗口
      window.electronAPI?.notifyPaySuccess?.()
      // 3秒后自动关闭
      setTimeout(() => handleClose(), 3000)
    } else if (data?.url || data?.qr_code) {
      // 支付宝等: 打开默认浏览器，轮询订单状态
      const payUrl = data?.url || data?.qr_code
      window.electronAPI?.openExternal?.(payUrl)
      payStep.value = 'done'
      startPolling()
    } else if (data?.url) {
      // 其他平台: 打开默认浏览器
      window.electronAPI?.openExternal?.(data.url)
      payStep.value = 'done'
      window.electronAPI?.notifyPaySuccess?.()
      setTimeout(() => handleClose(), 3000)
    } else {
      ElMessage.error(t('subscription.payFailed'))
    }
  } catch (error) {
    const msg = error.response?.data?.message || t('subscription.payFailed')
    ElMessage.error(msg)
  } finally {
    payLoading.value = false
  }
}

const startPolling = () => {
  stopPolling()
  pollTimer.value = setInterval(async () => {
    if (!createdOrder.value?.trade_no) return
    try {
      const res = await orderApi.getOrderDetail(createdOrder.value.trade_no)
      const order = res.data?.data || res.data
      if (order?.status === 'paid') {
        stopPolling()
        payStep.value = 'done'
        // 通知主窗口
        window.electronAPI?.notifyPaySuccess?.()
        // 自动关闭窗口
        setTimeout(() => handleClose(), 1500)
      }
    } catch (error) {
      // 轮询失败不影响
    }
  }, 3000)
}

const stopPolling = () => {
  if (pollTimer.value) {
    clearInterval(pollTimer.value)
    pollTimer.value = null
  }
}

onMounted(() => {
  settingStore.applyTheme()
  settingStore.setThemeColor(settingStore.themeColor)
  fetchPlanDetail()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <div class="pay-window">
    <!-- 标题栏 -->
    <div class="title-bar" :class="{ 'dark-title': settingStore.isDarkMode }">
      <div class="title-bar-drag"></div>
      <div class="title-bar-title">{{ plan?.name || '购买套餐' }}</div>
      <div class="title-bar-controls">
        <button class="control-btn close-btn" @click="handleClose">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="pay-content" v-loading="planLoading">
      <!-- 步骤1: 选择套餐时长 + 购买 -->
      <template v-if="payStep === 'select' && plan">
        <div class="plan-info">
          <h3>{{ plan.name }}</h3>
          <p v-if="plan.intro" class="plan-intro">{{ plan.intro }}</p>
          <ul v-if="plan.features?.length" class="plan-features">
            <li v-for="feature in plan.features" :key="feature">{{ feature }}</li>
          </ul>
        </div>

        <div class="price-selection" v-if="plan.prices?.length">
          <h4>选择套餐时长</h4>
          <div class="price-options">
            <div
              v-for="price in plan.prices"
              :key="price.id"
              :class="['price-option', { active: selectedPrice === price.id }]"
              @click="selectedPrice = price.id"
            >
              <div class="price-radio">
                <div class="radio-dot"></div>
              </div>
              <div class="price-info">
                <span class="price-name">{{ price.name }}</span>
                <span class="price-duration">{{ formatDuration(price.duration) }}</span>
              </div>
              <span class="price-amount">¥{{ price.price }}</span>
            </div>
          </div>
        </div>

        <div class="buy-section">
          <el-button
            type="primary"
            size="large"
            class="buy-btn"
            :disabled="!getSelectedPriceObject"
            :loading="buyLoading"
            @click="handleBuy"
          >
            {{ t('subscription.buy') }} ¥{{ getSelectedPriceObject?.price || '0.00' }}
          </el-button>
        </div>
      </template>

      <!-- 步骤2: 选择支付方式 -->
      <template v-if="payStep === 'paying'">
        <div class="pay-step">
          <div class="order-info-bar">
            <span>{{ t('subscription.orderNo') }}: {{ createdOrder?.trade_no }}</span>
            <span class="order-amount">¥{{ createdOrder?.amount?.toFixed(2) || '0.00' }}</span>
          </div>

          <h4 class="section-title">{{ t('subscription.selectPayMethod') }}</h4>
          <div class="pay-platforms">
            <div
              v-for="platform in payPlatforms"
              :key="platform.value"
              :class="['pay-platform-item', { active: selectedPlatform === platform.value }]"
              @click="selectedPlatform = platform.value"
            >
              <div class="pay-radio">
                <div class="pay-radio-dot"></div>
              </div>
              <span class="pay-platform-label">{{ platform.label }}</span>
            </div>
          </div>

          <div class="pay-actions">
            <el-button @click="payStep = 'select'" :disabled="payLoading">返回</el-button>
            <el-button type="primary" @click="handlePay" :loading="payLoading">
              {{ t('subscription.payNow') }}
            </el-button>
          </div>
        </div>
      </template>

      <!-- 完成 -->
      <template v-if="payStep === 'done'">
        <div class="done-step">
          <div class="done-icon">✓</div>
          <div class="done-text">订单已提交，请在新打开的页面中完成支付</div>
          <div class="done-sub">支付完成后将自动关闭此窗口</div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.pay-window {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--el-bg-color);
  overflow: hidden;
}

.title-bar {
  display: flex;
  align-items: center;
  height: 40px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  -webkit-app-region: drag;
  flex-shrink: 0;
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
  font-weight: 500;
  color: var(--el-text-color-primary);
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
  color: var(--el-text-color-regular);
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--el-color-danger);
  color: #fff;
}

.pay-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.plan-info {
  margin-bottom: 24px;
}

.plan-info h3 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--el-text-color-primary);
}

.plan-intro {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-bottom: 12px;
  line-height: 1.6;
}

.plan-features {
  list-style: none;
  padding: 0;
  margin: 0;
}

.plan-features li {
  padding: 4px 0;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.plan-features li::before {
  content: '✓';
  margin-right: 8px;
  color: var(--el-color-success);
}

.price-selection h4 {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 12px;
  color: var(--el-text-color-primary);
}

.price-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.price-option {
  width: 100%;
  cursor: pointer;
  padding: 14px 16px;
  border: 2px solid var(--el-border-color);
  border-radius: 8px;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 12px;
}

.price-option:hover {
  border-color: var(--el-color-primary-light-3);
}

.price-option.active {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.price-radio {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border: 2px solid var(--el-border-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.price-option.active .price-radio {
  border-color: var(--el-color-primary);
}

.radio-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--el-color-primary);
  transform: scale(0);
  transition: transform 0.3s;
}

.price-option.active .radio-dot {
  transform: scale(1);
}

.price-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.price-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.price-duration {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  background-color: var(--el-fill-color);
  padding: 2px 8px;
  border-radius: 4px;
}

.price-amount {
  font-size: 20px;
  font-weight: 700;
  color: var(--el-color-primary);
  flex-shrink: 0;
}

.buy-section {
  margin-top: 24px;
}

.buy-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
}

.order-info-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.order-amount {
  font-size: 16px;
  font-weight: 700;
  color: var(--el-color-danger);
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 12px;
  color: var(--el-text-color-primary);
}

.pay-platforms {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pay-platform-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 2px solid var(--el-border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.pay-platform-item:hover {
  border-color: var(--el-color-primary-light-3);
}

.pay-platform-item.active {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.pay-radio {
  width: 18px;
  height: 18px;
  border: 2px solid var(--el-border-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s;
}

.pay-platform-item.active .pay-radio {
  border-color: var(--el-color-primary);
}

.pay-radio-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--el-color-primary);
  transform: scale(0);
  transition: transform 0.3s;
}

.pay-platform-item.active .pay-radio-dot {
  transform: scale(1);
}

.pay-platform-label {
  font-size: 15px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.pay-actions {
  margin-top: 20px;
  display: flex;
  gap: 10px;
}

.pay-actions .el-button {
  flex: 1;
}

.qr-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 20px;
}

.qr-tip {
  font-size: 14px;
  color: var(--el-text-color-regular);
  margin-bottom: 16px;
}

.qr-box {
  width: 200px;
  height: 200px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
}

.qr-box img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.qr-amount {
  font-size: 24px;
  font-weight: 700;
  color: var(--el-color-danger);
  margin-bottom: 12px;
}

.qr-polling-tip {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.done-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 60px;
}

.done-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: var(--el-color-success-light-9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: var(--el-color-success);
  margin-bottom: 16px;
}

.done-text {
  font-size: 15px;
  color: var(--el-text-color-primary);
  margin-bottom: 8px;
}

.done-sub {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}
</style>
