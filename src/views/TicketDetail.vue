<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Lock } from '@element-plus/icons-vue'
import { ticketApi } from '@/api'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const ticket = ref(null)
const replies = ref([])
const newReply = ref('')
const isNotify = ref(true)
const submitting = ref(false)
const messagesList = ref(null)

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

const fetchTicketDetail = async () => {
  loading.value = true
  try {
    const res = await ticketApi.getTicketDetail(route.params.id)
    ticket.value = res.data?.data || res.data
  } catch (error) {
    ElMessage.error('获取工单详情失败')
  } finally {
    loading.value = false
  }
}

const fetchReplies = async () => {
  try {
    console.log('调用工单回复API, ID:', route.params.id)
    const res = await ticketApi.getTicketReplies(route.params.id)
    console.log('工单回复响应:', res)
    replies.value = res.data?.data || []
  } catch (error) {
    console.error('获取回复失败:', error)
    replies.value = []
  }
}

const submitReply = async () => {
  if (!newReply.value.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }

  submitting.value = true
  try {
    await ticketApi.replyTicket(route.params.id, { content: newReply.value, is_notify: isNotify.value })
    ElMessage.success('回复成功')
    newReply.value = ''
    await fetchReplies()
    scrollToBottom()
  } catch (error) {
    ElMessage.error('回复失败')
  } finally {
    submitting.value = false
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesList.value) {
      messagesList.value.scrollTop = messagesList.value.scrollHeight
    }
  })
}

const goBack = () => {
  router.back()
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

const isCurrentUser = (reply) => {
  return reply.user?.id === userStore.userInfo?.id
}

onMounted(async () => {
  console.log('工单ID:', route.params.id)
  if (route.params.id) {
    await fetchTicketDetail()
    await fetchReplies()
    scrollToBottom()
  }
})
</script>

<template>
  <div class="ticket-detail">
    <el-page-header @back="goBack" title="返回">
      <template #content>
        <span class="page-title">{{ ticket?.title || '工单详情' }}</span>
      </template>
    </el-page-header>

    <div v-loading="loading" class="chat-container">
      <div v-if="ticket" class="ticket-header">
        <div class="header-item">
          <span class="label">工单号：</span>
          <span class="value">{{ ticket.issue_no }}</span>
        </div>
        <div class="header-item">
          <span class="label">状态：</span>
          <el-tag :type="getStatusType(ticket.status)" size="small">
            {{ getStatusLabel(ticket.status) }}
          </el-tag>
        </div>
        <div class="header-item">
          <span class="label">级别：</span>
          <el-tag :type="getPriorityType(ticket.level)" size="small">
            {{ getPriorityLabel(ticket.level) }}
          </el-tag>
        </div>
      </div>

      <div ref="messagesList" class="messages-list">
        <div v-if="ticket && ticket.content" class="message-item message-self">
          <div class="message-body">
            <el-avatar :size="40" :src="userStore.userInfo?.avatar_url" class="avatar avatar-right">
              {{ userStore.userInfo?.name?.charAt(0) || 'U' }}
            </el-avatar>
            <div class="message-text-wrapper">
              <div class="message-content">
                {{ ticket.content }}
              </div>
              <div class="message-time">{{ formatDate(ticket.created_at) }}</div>
            </div>
          </div>
        </div>

        <div
          v-for="reply in replies"
          :key="reply.id"
          class="message-item"
          :class="isCurrentUser(reply) ? 'message-self' : 'message-other'"
        >
          <div class="message-body">
            <el-avatar :size="40" :src="reply.user?.avatar_url" class="avatar" :class="isCurrentUser(reply) ? 'avatar-right' : 'avatar-left'">
              {{ reply.user?.name?.charAt(0) || 'U' }}
            </el-avatar>
            <div class="message-text-wrapper">
              <div class="message-author">{{ reply.user?.name || (isCurrentUser(reply) ? '我' : '客服') }}</div>
              <div class="message-content">
                {{ reply.content }}
              </div>
              <div class="message-time">{{ formatDate(reply.created_at) }}</div>
            </div>
          </div>
        </div>

        <div v-if="!ticket" class="no-messages">
          暂无消息
        </div>
      </div>

      <div v-if="ticket" class="input-section" :class="{ 'disabled': ticket.status === 'completed' }">
        <div v-if="ticket.status === 'completed'" class="closed-notice">
          <el-icon><Lock /></el-icon>
          <span>工单已关闭</span>
        </div>
        <div class="input-wrapper">
          <el-input
            v-model="newReply"
            type="textarea"
            :rows="3"
            placeholder="请输入消息..."
            :disabled="ticket.status === 'completed'"
            resize="none"
            @keydown.ctrl.enter="submitReply"
          />
        </div>
        <div class="input-actions">
          <div class="input-options">
            <span class="switch-label">接收通知：</span>
            <el-switch v-model="isNotify" size="small" :disabled="ticket.status === 'completed'" />
            <span class="switch-text">{{ isNotify ? '是' : '否' }}</span>
          </div>
          <div class="send-btn">
            <el-button
              type="primary"
              :disabled="!newReply.trim() || ticket.status === 'completed'"
              :loading="submitting"
              @click="submitReply"
            >
              发送 (Ctrl+Enter)
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ticket-detail {
  height: calc(100vh - 48px - 64px);
  display: flex;
  flex-direction: column;
  background-color: var(--el-bg-color);
  overflow: hidden;
}

.ticket-detail :deep(.el-page-header) {
  flex-shrink: 0;
  height: 50px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--el-border-color);
  box-sizing: border-box;
}

.page-title {
  font-size: 16px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
  min-height: 0;
}

.ticket-header {
  padding: 8px 16px;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  flex-shrink: 0;
  min-height: 40px;
}

.header-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.header-item .label {
  color: var(--el-text-color-secondary);
}

.header-item .value {
  color: var(--el-text-color-regular);
}

.messages-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 0;
  box-sizing: border-box;
}

.messages-list::-webkit-scrollbar {
  width: 6px;
}

.messages-list::-webkit-scrollbar-track {
  background: transparent;
}

.messages-list::-webkit-scrollbar-thumb {
  background-color: var(--el-border-color-darker);
  border-radius: 3px;
}

.messages-list::-webkit-scrollbar-thumb:hover {
  background-color: var(--el-text-color-placeholder);
}

.message-item {
  display: flex;
  width: 100%;
}

.message-self {
  justify-content: flex-end;
}

.message-other {
  justify-content: flex-start;
}

.message-body {
  display: flex;
  gap: 10px;
  max-width: 70%;
}

.message-self .message-body {
  flex-direction: row-reverse;
  gap: 0;
}

.avatar {
  flex-shrink: 0;
}

.avatar-left {
  margin-right: 10px;
}

.avatar-right {
  margin-left: 0;
  margin-right: -4px;
}

.message-text-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 100%;
  align-items: flex-start;
}

.message-self .message-text-wrapper {
  align-items: flex-start;
}

.message-author {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 2px;
}

.message-content {
  padding: 12px 16px;
  border-radius: 12px;
  word-break: break-word;
  white-space: pre-wrap;
  line-height: 1.5;
  font-size: 14px;
  max-width: 100%;
}

.message-self .message-content {
  background-color: var(--el-color-primary);
  color: #fff;
  border-bottom-right-radius: 4px;
  border-top-right-radius: 4px;
}

.message-other .message-content {
  background-color: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  border-bottom-left-radius: 4px;
  border-top-left-radius: 4px;
}

.message-time {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  margin-top: 2px;
}

.no-messages {
  text-align: center;
  padding: 60px 0;
  color: var(--el-text-color-secondary);
}

.input-section {
  padding: 8px 16px 16px;
  border-top: 1px solid var(--el-border-color);
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
  box-sizing: border-box;
  margin-bottom: 16px;
}

.input-section.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.closed-notice {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  padding: 4px 0;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.input-options {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.switch-label {
  color: var(--el-text-color-regular);
}

.switch-text {
  color: var(--el-text-color-secondary);
  min-width: 20px;
}

.input-wrapper {
  flex: 0 0 auto;
}

.input-wrapper :deep(.el-textarea) {
  height: auto !important;
}

.input-wrapper :deep(.el-textarea__inner) {
  height: 56px !important;
  resize: none;
  padding: 6px 12px;
  font-size: 14px;
}

.chat-container :deep(.el-tag--warning) {
  background-color: var(--el-color-warning-light-9);
  color: var(--el-color-warning);
  border-color: var(--el-color-warning-light-7);
}

.chat-container :deep(.el-tag--info) {
  background-color: var(--el-color-info-light-9);
  color: var(--el-color-info);
  border-color: var(--el-color-info-light-7);
}

.chat-container :deep(.el-tag--success) {
  background-color: var(--el-color-success-light-9);
  color: var(--el-color-success);
  border-color: var(--el-color-success-light-7);
}

.chat-container :deep(.el-tag--danger) {
  background-color: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
  border-color: var(--el-color-danger-light-7);
}


</style>
