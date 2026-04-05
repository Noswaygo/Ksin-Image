<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Clock, CircleCheck, CircleClose } from '@element-plus/icons-vue'
import { orderApi } from '@/api'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const order = ref(null)
const payDialogVisible = ref(false)
const payLoading = ref(false)
const selectedPlatform = ref('alipay')
const payResult = ref(null)
const pollTimer = ref(null)

const payPlatforms = [
  { value: 'alipay', label: '支付宝', channel: 'alipay', method: 'web' },
  { value: 'paypal', label: 'PayPal', channel: 'paypal', method: 'web' }
]

const currentPayPlatform = computed(() => {
  return payPlatforms.find(p => p.value === selectedPlatform.value)
})

const getStatusText = (status) => {
  const statusMap = {
    unpaid: '未支付',
    paid: '已支付',
    cancelled: '已取消'
  }
  return statusMap[status] || status
}

const getStatusType = (status) => {
  const typeMap = {
    unpaid: 'warning',
    paid: 'success',
    cancelled: 'danger'
  }
  return typeMap[status] || ''
}

const getStatusIcon = (status) => {
  const iconMap = {
    unpaid: Clock,
    paid: CircleCheck,
    cancelled: CircleClose
  }
  return iconMap[status] || null
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
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
  const days = Math.floor(minutes / (60 * 24))
  const months = Math.floor(days / 30)
  const years = Math.floor(months / 12)

  if (years > 0) {
    return `${years}年付`
  } else if (months > 0) {
    return `${months}个月付`
  } else if (days > 0) {
    if (days >= 7) {
      const weeks = Math.floor(days / 7)
      return `${weeks}周付`
    }
    return `${days}天付`
  } else {
    return ''
  }
}

const fetchOrderDetail = async () => {
  loading.value = true
  try {
    const res = await orderApi.getOrderDetail(route.params.id)
    order.value = res.data?.data || res.data || null
  } catch (error) {
    ElMessage.error('获取订单详情失败')
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.back()
}

const showPayDialog = () => {
  selectedPlatform.value = 'alipay'
  payResult.value = null
  stopPolling()
  payDialogVisible.value = true
}

const handlePay = async () => {
  if (!order.value?.trade_no || !currentPayPlatform.value) return

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

    const res = await orderApi.payOrder(order.value.trade_no, payData)
    const data = res.data?.data || res.data

    if (platform.value === 'paypal' && data?.url) {
      // PayPal: 打开默认浏览器
      window.electronAPI?.openExternal?.(data.url)
      payDialogVisible.value = false
      ElMessage.success('正在跳转到支付页面...')
      window.electronAPI?.notifyPaySuccess?.()
    } else if (data?.url || data?.qr_code) {
      // 支付宝等: 打开默认浏览器，轮询订单状态
      const payUrl = data?.url || data?.qr_code
      window.electronAPI?.openExternal?.(payUrl)
      ElMessage.success('正在跳转到支付页面...')
      startPolling()
    } else if (data?.url) {
      window.electronAPI?.openExternal?.(data.url)
      payDialogVisible.value = false
      ElMessage.success('正在跳转到支付页面...')
      window.electronAPI?.notifyPaySuccess?.()
    } else if (data?.content) {
      payDialogVisible.value = false
      ElMessage.info('支付信息已生成')
    } else {
      ElMessage.error('支付失败')
    }
  } catch (error) {
    const msg = error.response?.data?.message || '支付失败'
    ElMessage.error(msg)
  } finally {
    payLoading.value = false
  }
}

const startPolling = () => {
  stopPolling()
  pollTimer.value = setInterval(async () => {
    if (!order.value?.trade_no) return
    try {
      const res = await orderApi.getOrderDetail(order.value.trade_no)
      const data = res.data?.data || res.data
      if (data?.status === 'paid') {
        stopPolling()
        payDialogVisible.value = false
        payResult.value = null
        ElMessage.success('支付成功')
        fetchOrderDetail()
        window.electronAPI?.notifyPaySuccess?.()
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

const handleCancel = async () => {
  try {
    await ElMessageBox.confirm('确定要取消该订单吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const res = await orderApi.cancelOrder(order.value.trade_no)
    ElMessage.success('订单已取消')
    order.value = res.data?.data || res.data || order.value
    order.value.status = 'cancelled'
  } catch (error) {
    if (error !== 'cancel') {
      const msg = error.response?.data?.message || '取消订单失败'
      ElMessage.error(msg)
    }
  }
}

let isAlive = true
const onPaySuccess = () => {
  if (isAlive) {
    fetchOrderDetail()
  }
}

onMounted(() => {
  fetchOrderDetail()
  window.electronAPI?.onPaySuccess?.(onPaySuccess)
})

onUnmounted(() => {
  isAlive = false
  stopPolling()
})
</script>

<template>
  <div class="order-detail">
    <div class="detail-header">
      <el-button @click="goBack" :icon="ArrowLeft">返回</el-button>
      <span class="header-title">订单详情</span>
    </div>

    <el-card v-loading="loading">
      <template v-if="order">
        <!-- 订单状态 -->
        <div class="order-status">
          <div :class="['status-icon', getStatusType(order.status)]">
            <el-icon>
              <component :is="getStatusIcon(order.status)" />
            </el-icon>
          </div>
          <div class="status-text">{{ getStatusText(order.status) }}</div>
        </div>

        <!-- 套餐快照 -->
        <div class="section">
          <h3 class="section-title">套餐快照</h3>
          <div class="snapshot-card">
            <div class="snapshot-header">
              <div class="snapshot-name">{{ order.snapshot?.name || order.product?.name || '-' }}</div>
              <el-tag v-if="order.snapshot?.badge" type="warning" size="small">{{ order.snapshot?.badge }}</el-tag>
            </div>
            <div class="snapshot-desc">{{ order.snapshot?.description || formatDuration(order.product?.duration) || '' }}</div>
            <div v-if="order.snapshot?.features && order.snapshot.features.length > 0" class="snapshot-features">
              <div class="features-title">权益</div>
              <div v-for="(feature, index) in order.snapshot.features" :key="index" class="feature-item">
                {{ feature }}
              </div>
            </div>
          </div>
        </div>

        <!-- 产品信息 -->
        <div class="section">
          <h3 class="section-title">产品信息</h3>
          <div class="info-card">
            <div class="info-row">
              <span class="info-label">名称</span>
              <span class="info-value">{{ order.product?.name || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">时长</span>
              <span class="info-value">{{ formatDuration(order.product?.duration) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">价格</span>
              <span class="info-value price">¥{{ order.product?.price?.toFixed(2) || '0.00' }}</span>
            </div>
          </div>
        </div>

        <!-- 订单信息 -->
        <div class="section">
          <h3 class="section-title">订单信息</h3>
          <div class="info-card">
            <div class="info-row">
              <span class="info-label">订单号</span>
              <span class="info-value">{{ order.trade_no || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">订单状态</span>
              <span class="info-value">
                <el-tag :type="getStatusType(order.status)" size="small">
                  {{ getStatusText(order.status) }}
                </el-tag>
              </span>
            </div>
            <div v-if="order.cancelled_at" class="info-row">
              <span class="info-label">取消时间</span>
              <span class="info-value">{{ formatDate(order.cancelled_at) }}</span>
            </div>
            <div v-if="order.paid_at" class="info-row">
              <span class="info-label">支付时间</span>
              <span class="info-value">{{ formatDate(order.paid_at) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">创建时间</span>
              <span class="info-value">{{ formatDate(order.created_at) }}</span>
            </div>
          </div>
        </div>

        <!-- 合计价格 -->
        <div class="total-section">
          <div class="total-row">
            <span class="total-label">合计价格</span>
            <span class="total-price">¥{{ order.amount?.toFixed(2) || '0.00' }}</span>
          </div>
          <div v-if="order.status === 'unpaid'" class="pay-action">
            <el-button size="large" @click="handleCancel">取消订单</el-button>
            <el-button type="primary" size="large" @click="showPayDialog">
              立即支付
            </el-button>
          </div>
        </div>
      </template>

      <el-empty v-else-if="!loading" description="订单不存在" />
    </el-card>

    <!-- 支付对话框 -->
    <el-dialog
      v-model="payDialogVisible"
      title="选择支付方式"
      width="480px"
      :close-on-click-modal="false"
      @close="stopPolling"
    >
      <div class="pay-method-selection">
        <div class="order-info-bar">
          <span>订单号: {{ order?.trade_no }}</span>
          <span class="order-amount">¥{{ order?.amount?.toFixed(2) || '0.00' }}</span>
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

      <template #footer>
        <el-button @click="payDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handlePay" :loading="payLoading">
          确认支付
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.order-detail {
  padding: 0;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.order-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  margin-bottom: 30px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.status-icon {
  font-size: 80px;
  margin-bottom: 16px;
}

.status-icon :deep(.el-icon) {
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-icon.success {
  color: var(--el-color-success);
}

.status-icon.warning {
  color: var(--el-color-warning);
}

.status-icon.danger {
  color: var(--el-color-danger);
}

.status-text {
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.section {
  margin-bottom: 40px;
}

.section:last-of-type {
  margin-bottom: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 16px;
  padding-left: 8px;
  border-left: 4px solid var(--el-color-primary);
}

.snapshot-card {
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  padding: 20px;
}

.snapshot-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.snapshot-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.snapshot-desc {
  font-size: 14px;
  color: var(--el-text-color-regular);
  margin-bottom: 16px;
  line-height: 1.6;
}

.snapshot-features {
  border-top: 1px solid var(--el-border-color-lighter);
  padding-top: 16px;
}

.features-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-regular);
  margin-bottom: 12px;
}

.feature-item {
  font-size: 13px;
  color: var(--el-text-color-regular);
  padding: 6px 0;
  line-height: 1.6;
}

.info-card {
  background: var(--el-bg-color-page);
  border-radius: 8px;
  padding: 20px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.info-value {
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.info-value.price {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-color-danger);
}

.total-section {
  margin-top: 40px;
  padding-top: 30px;
  border-top: 2px solid var(--el-border-color);
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-label {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.total-price {
  font-size: 28px;
  font-weight: 600;
  color: var(--el-color-danger);
}

.pay-action {
  margin-top: 20px;
  display: flex;
  justify-content: space-between;
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
