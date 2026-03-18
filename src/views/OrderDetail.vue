<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Clock, CircleCheck, CircleClose } from '@element-plus/icons-vue'
import { orderApi } from '@/api'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const order = ref(null)

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

onMounted(() => {
  fetchOrderDetail()
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
        </div>
      </template>

      <el-empty v-else-if="!loading" description="订单不存在" />
    </el-card>
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
</style>
