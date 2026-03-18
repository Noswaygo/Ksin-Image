<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { subscriptionApi, planApi } from '@/api'

const { t } = useI18n()
const loading = ref(false)
const roleGroups = ref([])
const capacities = ref([])
const plans = ref([])
const activeTab = ref('vip')
const planDetailVisible = ref(false)
const selectedPlan = ref(null)
const selectedPrice = ref(null)
const planDetailLoading = ref(false)

const vipPlans = computed(() => plans.value.filter(p => p.type === 'vip'))
const capacityPlans = computed(() => plans.value.filter(p => p.type === 'storage'))

// 根据 ID 查找价格对象
const getSelectedPriceObject = computed(() => {
  if (!selectedPrice.value || !selectedPlan.value?.prices) return null
  return selectedPlan.value.prices.find(p => p.id === selectedPrice.value)
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

const handleBuy = async () => {
  if (!selectedPrice.value) {
    ElMessage.warning('请选择套餐时长')
    return
  }
  const priceObj = getSelectedPriceObject.value
  ElMessage.success(`购买：${priceObj?.name} - ¥${priceObj?.price}`)
  // TODO: 实际购买逻辑
}

onMounted(() => {
  fetchMySubscriptions()
  fetchPlans()
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
        <el-button @click="planDetailVisible = false">取消</el-button>
        <el-button type="primary" @click="handleBuy" :disabled="!getSelectedPriceObject">购买</el-button>
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
</style>
