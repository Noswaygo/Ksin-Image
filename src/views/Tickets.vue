<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { ticketApi } from '@/api'

const { t } = useI18n()
const loading = ref(false)
const tickets = ref([])
const dialogVisible = ref(false)
const ticketForm = ref({
  title: '',
  content: '',
  level: 'medium',
  is_notify: true
})

const fetchTickets = async () => {
  loading.value = true
  try {
    const res = await ticketApi.getTicketList()
    tickets.value = res.data?.data || []
  } catch (error) {
    ElMessage.error('获取工单列表失败')
  } finally {
    loading.value = false
  }
}

const handleCreate = async () => {
  try {
    await ticketApi.createTicket(ticketForm.value)
    ElMessage.success('创建成功')
    dialogVisible.value = false
    ticketForm.value = { title: '', content: '', level: 'medium', is_notify: true }
    fetchTickets()
  } catch (error) {
    ElMessage.error('创建失败')
  }
}

const handleCloseTicket = async (ticket) => {
  if (ticket.status === 'completed') {
    ElMessage.warning('工单已完成，无需关闭')
    return
  }

  try {
    await ticketApi.closeTicket(ticket.issue_no)
    ElMessage.success('工单已关闭')
    await fetchTickets()
  } catch (error) {
    ElMessage.error('关闭工单失败')
  }
}

const handleDeleteTicket = async (ticket) => {
  if (ticket.status !== 'completed') {
    ElMessage.warning('请先关闭工单再删除')
    return
  }

  try {
    await ticketApi.deleteTicket(ticket.issue_no)
    ElMessage.success('删除成功')
    await fetchTickets()
  } catch (error) {
    ElMessage.error('删除失败')
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getStatusLabel = (status) => {
  const labels = {
    in_progress: '进行中',
    completed: '已完成'
  }
  return labels[status] || status
}

const getStatusType = (status) => {
  const types = {
    in_progress: 'warning',
    completed: 'success'
  }
  return types[status] || 'info'
}

const getPriorityLabel = (level) => {
  const labels = {
    low: '低',
    medium: '中',
    high: '高'
  }
  return labels[level] || level
}

const getPriorityType = (level) => {
  const types = {
    low: 'info',
    medium: 'warning',
    high: 'danger'
  }
  return types[level] || 'info'
}

onMounted(() => {
  fetchTickets()
})
</script>

<template>
  <div class="tickets">
    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <el-button type="primary" @click="dialogVisible = true">
            {{ t('ticket.createTicket') }}
          </el-button>
        </div>
      </template>

      <el-empty v-if="tickets.length === 0" description="暂无工单" />

      <el-table v-else :data="tickets">
        <el-table-column prop="issue_no" label="工单号" width="200" />
        <el-table-column prop="title" :label="t('ticket.ticketTitle')" />
        <el-table-column :label="t('ticket.status')" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('ticket.priority')" width="100">
          <template #default="{ row }">
            <el-tag :type="getPriorityType(row.level)">
              {{ getPriorityLabel(row.level) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('ticket.createTime')" width="120">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('common.actions')" width="180">
          <template #default="{ row }">
            <el-button size="small" @click="$router.push(`/tickets/${row.issue_no}`)">{{ t('ticket.viewDetail') }}</el-button>
            <el-button
              v-if="row.status !== 'completed'"
              size="small"
              type="warning"
              @click="handleCloseTicket(row)"
            >
              关闭工单
            </el-button>
            <el-button
              v-if="row.status === 'completed'"
              size="small"
              type="danger"
              @click="handleDeleteTicket(row)"
            >
              {{ t('ticket.deleteTicket') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="t('ticket.createTicket')">
      <el-form :model="ticketForm" label-width="80px">
        <el-form-item :label="t('ticket.ticketTitle')">
          <el-input v-model="ticketForm.title" />
        </el-form-item>
        <el-form-item label="级别">
          <el-select v-model="ticketForm.level">
            <el-option label="低" value="low" />
            <el-option label="中" value="medium" />
            <el-option label="高" value="high" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="ticketForm.content" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="接收通知">
          <el-switch v-model="ticketForm.is_notify" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreate">确定</el-button>
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

.tickets :deep(.el-tag--warning) {
  background-color: var(--el-color-warning-light-9);
  color: var(--el-color-warning);
  border-color: var(--el-color-warning-light-7);
}

.tickets :deep(.el-tag--info) {
  background-color: var(--el-color-info-light-9);
  color: var(--el-color-info);
  border-color: var(--el-color-info-light-7);
}

.tickets :deep(.el-tag--success) {
  background-color: var(--el-color-success-light-9);
  color: var(--el-color-success);
  border-color: var(--el-color-success-light-7);
}

.tickets :deep(.el-tag--danger) {
  background-color: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
  border-color: var(--el-color-danger-light-7);
}
</style>
