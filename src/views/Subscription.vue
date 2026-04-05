<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { subscriptionApi, planApi, orderApi } from '@/api'

const { t } = useI18n()
const router = useRouter()
const loading = ref(false)
const roleGroups = ref([])
const capacities = ref([])
const plans = ref([])
const activeTab = ref('vip')
const planDetailVisible = ref(false)
const selectedPlan = ref(null)
const selectedPrice = ref(null)
const planDetailLoading = ref(false)
const buyLoading = ref(false)
const couponCode = ref('')
const payDialogVisible = ref(false)
const payLoading = ref(false)
const selectedPlatform = ref('alipay')
const createdOrder = ref(null)
const payResult = ref(null)

const vipPlans = computed(() => plans.value.filter(p => p.type === 'vip'))
const capacityPlans = computed(() => plans.value.filter(p => p.type === 'storage'))

// 支付方式选项
const payPlatforms = [
  { value: 'alipay', label: '支付宝', channel: 'alipay', method: 'web' },
  { value: 'paypal', label: 'PayPal', channel: 'paypal', method: 'web' }
]

// 根据 ID 查找价格对象
const getSelectedPriceObject = computed(() => {
  if (!selectedPrice.value || !selectedPlan.value?.prices) return null
  return selectedPlan.value.prices.find(p => p.id === selectedPrice.value)
})

// 当前选中的支付方式详情
const currentPayPlatform = computed(() => {
  return payPlatforms.find(p => p.value === selectedPlatform.value)
})

const fetchMySubscriptions = async () => {
  loading.value = true
  try {
    const [roles, caps] = await Promise.all([
      subscriptionApi.getRoleGroups(),
      subscriptionApi.getCapacities()
    ])
    roleGroups.value = roles.data?.data || []
    capacities.value = caps.data?.data || []
  } catch (error) {
    ElMessage.error('获取订阅信息失败')
  } finally {
    loading.value = false
  }
}

const fetchPlans = async () => {
  try {
    const res = await planApi.getPlanList()
    plans.value = res.data?.data || []
  } catch (error) {
    ElMessage.error('获取套餐列表失败')
  }
}

const formatBytes = (kb) => {
  if (!kb || kb === 0) return '0 KB'
  // 如果大于等于 1048576 KB (1024 MB)，转换为 GB
  if (kb >= 1048576) {
    return (kb / 1048576).toFixed(2) + ' GB'
  }
  // 如果大于等于 1024 KB，转换为 MB
  if (kb >= 1024) {
    return (kb / 1024).toFixed(2) + ' MB'
  }
  return parseFloat(kb) + ' KB'
}

const formatDate = (dateString) => {
  if (!dateString) return '永久'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDuration = (minutes) => {
  if (!minutes) return ''

  // 小于1小时
  if (minutes < 60) {
    return minutes + '分钟'
  }

  // 小时级别
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return hours + '小时'
  }

  // 天数级别
  const days = Math.floor(hours / 24)
  if (days >= 365) {
    const years = Math.floor(days / 365)
    return years + '年'
  } else if (days >= 30) {
    const months = Math.floor(days / 30)
    return months + '个月'
  } else {
    return days + '天'
  }
}

const handlePlanClick = async (plan) => {
  if (window.electronAPI?.openPayWindow) {
    // Electron 环境：在新窗口打开支付页
    window.electronAPI.openPayWindow(plan.id)
  } else {
    // 浏览器环境：回退到原逻辑
    selectedPlan.value = plan
    selectedPrice.value = null
    planDetailVisible.value = true
    planDetailLoading.value = true
    try {
      const res = await planApi.getPlanDetail(plan.id)
      selectedPlan.value = res.data
    } catch (error) {
      ElMessage.error('获取套餐详情失败')
      planDetailVisible.value = false
    } finally {
      planDetailLoading.value = false
    }
  }
}

const handleBuy = async () => {
  if (!selectedPrice.value) {
    ElMessage.warning(t('subscription.selectPlanDuration'))
    return
  }

  try {
    buyLoading.value = true
    const orderData = { price_id: selectedPrice.value }
    if (couponCode.value.trim()) {
      orderData.coupon_code = couponCode.value.trim()
    }

    const res = await orderApi.createOrder(orderData)
    createdOrder.value = res.data?.data || res.data

    if (createdOrder.value?.trade_no) {
      planDetailVisible.value = false
      payDialogVisible.value = true
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
      payData.return_url = window.location.href
      payData.cancel_url = window.location.href
    }

    const res = await orderApi.payOrder(createdOrder.value.trade_no, payData)
    const data = res.data?.data || res.data

    if (data?.url) {
      window.electronAPI?.openExternal?.(data.url)
      payDialogVisible.value = false
      ElMessage.success(t('subscription.redirectingToPay'))
    } else if (data?.qr_code) {
      payResult.value = data
      ElMessage.success(t('subscription.qrCodeGenerated'))
    } else if (data?.content) {
      payDialogVisible.value = false
      ElMessage.info(t('subscription.payContentGenerated'))
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

const handleViewOrder = () => {
  if (createdOrder.value?.trade_no) {
    router.push(`/orders/${createdOrder.value.trade_no}`)
  }
  payDialogVisible.value = false
}

// 监听支付窗口关闭事件，刷新订阅数据
let isAlive = true
const onPaySuccess = () => {
  if (isAlive) {
    fetchMySubscriptions()
  }
}

onMounted(() => {
  fetchMySubscriptions()
  fetchPlans()
  window.electronAPI?.onPaySuccess?.(onPaySuccess)
})

onUnmounted(() => {
  isAlive = false
})
</script>

<template>
  <div class="subscription">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>购买套餐</span>
            </div>
          </template>
          <el-tabs v-model="activeTab">
            <el-tab-pane label="会员" name="vip">
              <el-empty v-if="vipPlans.length === 0" description="暂无会员套餐" />
              <div v-else class="plan-grid">
                <el-card v-for="plan in vipPlans" :key="plan.id" class="plan-card" @click="handlePlanClick(plan)">
                  <h4>{{ plan.name }}</h4>
                  <p v-if="plan.badge" class="badge">{{ plan.badge }}</p>
                  <ul class="features">
                    <li v-for="feature in plan.features" :key="feature">{{ feature }}</li>
                  </ul>
                </el-card>
              </div>
            </el-tab-pane>
            <el-tab-pane label="容量" name="storage">
              <el-empty v-if="capacityPlans.length === 0" description="暂无容量套餐" />
              <div v-else class="plan-grid">
                <el-card v-for="plan in capacityPlans" :key="plan.id" class="plan-card" @click="handlePlanClick(plan)">
                  <h4>{{ plan.name }}</h4>
                  <p v-if="plan.badge" class="badge">{{ plan.badge }}</p>
                  <ul class="features">
                    <li v-for="feature in plan.features" :key="feature">{{ feature }}</li>
                  </ul>
                </el-card>
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card v-loading="loading">
          <template #header>
            <div class="card-header">
              <span>我的会员</span>
            </div>
          </template>

          <el-empty v-if="roleGroups.length === 0" description="暂无会员" />

          <el-table v-else :data="roleGroups" align="left">
            <el-table-column prop="group.name" label="会员名称" min-width="150" />
            <el-table-column label="会员特权" min-width="300">
              <template #default="{ row }">
                <div v-if="row.group?.options" style="font-size: 12px;">
                  <div>• 最大上传: {{ formatBytes(row.group.options.max_upload_size) }}</div>
                  <div>• 并发上传: {{ row.group.options.limit_concurrent_upload }}</div>
                  <div>• 每日限制: {{ row.group.options.limit_per_day }}</div>
                  <div>• 每月限制: {{ row.group.options.limit_per_month }}</div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="过期时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.expired_at) }}
              </template>
            </el-table-column>
            <el-table-column label="来源" width="100">
              <template #default="{ row }">
                <el-tag :type="row.from === 'system' ? 'info' : 'primary'" size="small">
                  {{ row.from === 'system' ? '系统' : '购买' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card v-loading="loading">
          <template #header>
            <div class="card-header">
              <span>我的容量</span>
            </div>
          </template>

          <el-empty v-if="capacities.length === 0" description="暂无容量" />

          <el-table v-else :data="capacities" align="left">
            <el-table-column label="容量大小" min-width="150">
              <template #default="{ row }">
                {{ formatBytes(row.capacity) }}
              </template>
            </el-table-column>
            <el-table-column label="过期时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.expired_at) }}
              </template>
            </el-table-column>
            <el-table-column label="来源" width="100">
              <template #default="{ row }">
                <el-tag :type="row.from === 'system' ? 'info' : 'primary'" size="small">
                  {{ row.from === 'system' ? '系统' : '购买' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="创建时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.created_at) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <!-- 套餐详情对话框 -->
    <el-dialog
      v-model="planDetailVisible"
      :title="selectedPlan?.name"
      width="600px"
      :close-on-click-modal="false"
    >
      <div v-loading="planDetailLoading">
        <el-descriptions :column="1" border v-if="selectedPlan">
          <el-descriptions-item label="介绍">{{ selectedPlan.intro }}</el-descriptions-item>
          <el-descriptions-item label="特性">
            <ul class="detail-features">
              <li v-for="feature in selectedPlan.features" :key="feature">{{ feature }}</li>
            </ul>
          </el-descriptions-item>
        </el-descriptions>

        <div class="price-selection" v-if="selectedPlan?.prices">
          <h4>选择套餐时长</h4>
          <div class="price-options">
            <div
              v-for="price in selectedPlan.prices"
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
      </div>

      <template #footer>
        <div class="dialog-footer-content">
          <div class="coupon-row">
            <el-input
              v-model="couponCode"
              :placeholder="t('subscription.couponPlaceholder')"
              clearable
              size="default"
            >
              <template #prefix>🎫</template>
            </el-input>
          </div>
          <div class="footer-buttons">
            <el-button @click="planDetailVisible = false">{{ t('common.cancel') }}</el-button>
            <el-button type="primary" @click="handleBuy" :disabled="!getSelectedPriceObject" :loading="buyLoading">
              {{ t('subscription.buy') }} ¥{{ getSelectedPriceObject?.price || '0.00' }}
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- 支付对话框 -->
    <el-dialog
      v-model="payDialogVisible"
      :title="t('subscription.selectPayMethod')"
      width="480px"
      :close-on-click-modal="false"
    >
      <div v-if="!payResult" class="pay-method-selection">
        <div class="order-info-bar">
          <span>{{ t('subscription.orderNo') }}: {{ createdOrder?.trade_no }}</span>
          <span class="order-amount">¥{{ createdOrder?.amount?.toFixed(2) || '0.00' }}</span>
        </div>

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
      </div>

      <div v-else class="pay-result">
        <div class="qr-code-tip">{{ t('subscription.scanToPay') }}</div>
        <div class="qr-code-box">
          <img v-if="payResult.qr_code" :src="'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(payResult.qr_code)" alt="QR Code" />
        </div>
      </div>

      <template #footer>
        <el-button @click="payDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button v-if="createdOrder" @click="handleViewOrder">{{ t('subscription.viewOrder') }}</el-button>
        <el-button type="primary" @click="handlePay" :loading="payLoading">
          {{ t('subscription.payNow') }}
        </el-button>
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

.plan-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.plan-card {
  text-align: center;
  padding: 20px;
}

.plan-card h4 {
  font-size: 18px;
  margin-bottom: 12px;
}

.price {
  font-size: 24px;
  font-weight: bold;
  color: var(--primary-color);
  margin-bottom: 16px;
}

.features {
  list-style: none;
  padding: 0;
  margin-bottom: 20px;
}

.features li {
  padding: 4px 0;
  color: var(--text-color-secondary);
}

.buy-button {
  width: 100%;
}

.plan-card {
  cursor: pointer;
  transition: all 0.3s;
}

.plan-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.badge {
  color: #f56c6c;
  font-size: 12px;
  margin-bottom: 8px;
}

.detail-features {
  margin: 0;
  padding-left: 20px;
}

.detail-features li {
  padding: 4px 0;
}

.price-selection {
  margin-top: 24px;
}

.price-selection h4 {
  font-size: 14px;
  margin-bottom: 12px;
  color: var(--text-color);
}

.price-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.price-option {
  width: 100%;
  cursor: pointer;
  padding: 16px 20px;
  border: 2px solid var(--el-border-color);
  border-radius: 8px;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 16px;
  background-color: var(--el-bg-color);
}

.price-option:hover {
  border-color: var(--el-color-primary-light-3);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}

.price-option.active {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.25);
}

.price-radio {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border: 2px solid var(--el-border-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  background-color: var(--el-bg-color);
}

.price-option.active .price-radio {
  border-color: var(--el-color-primary);
}

.radio-dot {
  width: 10px;
  height: 10px;
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
  gap: 12px;
}

.price-name {
  font-weight: 600;
  font-size: 15px;
  color: var(--el-text-color-primary);
  flex-shrink: 0;
}

.price-duration {
  color: var(--el-text-color-secondary);
  font-size: 14px;
  background-color: var(--el-fill-color);
  padding: 4px 10px;
  border-radius: 4px;
  white-space: nowrap;
}

.price-amount {
  font-size: 22px;
  font-weight: 700;
  color: var(--el-color-primary);
  flex-shrink: 0;
}

.dialog-footer-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.coupon-row {
  display: flex;
  justify-content: flex-end;
}

.coupon-row .el-input {
  width: 220px;
}

.footer-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.order-info-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.order-amount {
  font-size: 18px;
  font-weight: 700;
  color: var(--el-color-danger);
}

.pay-platforms {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pay-platform-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
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

.pay-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.qr-code-tip {
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.qr-code-box {
  width: 200px;
  height: 200px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  overflow: hidden;
}

.qr-code-box img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
