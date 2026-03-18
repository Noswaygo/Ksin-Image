<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { orderApi } from '@/api'

const { t } = useI18n()
const router = useRouter()
const loading = ref(false)
const orders = ref([])

const fetchOrders = async () => {
  loading.value = true
  try {
    const res = await orderApi.getOrderList()
    orders.value = res.data?.data || []
  } catch (error) {
    ElMessage.error('获取订单列表失败')
  } finally {
    loading.value = false
  }
}

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
    unpaid: 'danger',
    paid: 'success',
    cancelled: 'info'
  }
  return typeMap[status] || ''
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

const handleRowClick = (row) => {
  router.push(`/orders/${row.trade_no}`)
}

onMounted(() => {
  fetchOrders()
})
</script>

<template>
  <div class="orders">
    <el-card v-loading="loading">
      <template #header>
      </template>

      <el-empty v-if="orders.length === 0" description="暂无订单" />

      <el-table v-else :data="orders" align="left" @row-click="handleRowClick" style="cursor: pointer;">
        <el-table-column prop="trade_no" label="订单号" width="220" show-overflow-tooltip />
        <el-table-column label="套餐信息" min-width="200">
          <template #default="{ row }">
            <div>{{ row.snapshot?.name || '-' }}</div>
            <div style="font-size: 12px; color: var(--el-text-color-secondary);">{{ row.product?.name || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="100">
          <template #default="{ row }">
            ¥{{ row.amount?.toFixed(2) || '0.00' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="支付时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.paid_at) }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.orders {
  padding: 0;
}

.orders :deep(.el-tag--warning) {
  background-color: var(--el-color-warning-light-9);
  color: var(--el-color-warning);
  border-color: var(--el-color-warning-light-7);
}

.orders :deep(.el-tag--info) {
  background-color: var(--el-color-info-light-9);
  color: var(--el-color-info);
  border-color: var(--el-color-info-light-7);
}

.orders :deep(.el-tag--success) {
  background-color: var(--el-color-success-light-9);
  color: var(--el-color-success);
  border-color: var(--el-color-success-light-7);
}

.orders :deep(.el-tag--danger) {
  background-color: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
  border-color: var(--el-color-danger-light-7);
}

.orders :deep(.el-table__row) {
  transition: background-color 0.2s;
}

.orders :deep(.el-table__row:hover) {
  background-color: var(--el-fill-color-light);
}

.order-detail {
  padding: 10px 0;
}
</style>
