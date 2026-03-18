<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { shareApi } from '@/api'
import { Edit } from '@element-plus/icons-vue'

const { t } = useI18n()
const loading = ref(false)
const shares = ref([])
const editingShare = ref(null)
const tempPassword = ref('')
const selectedShares = ref([])

const fetchShares = async () => {
  loading.value = true
  try {
    const res = await shareApi.getShareList()
    shares.value = res.data?.data || []
  } catch (error) {
    ElMessage.error('获取分享列表失败')
  } finally {
    loading.value = false
  }
}

const copyShareUrl = (share) => {
  const url = `https://img.ksinx.com/s/${share.slug}`
  navigator.clipboard.writeText(url).then(() => {
    ElMessage.success('复制成功')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

const handleDelete = async (share) => {
  try {
    console.log('删除分享对象:', share)
    console.log('使用ID:', share.id)
    await shareApi.deleteShare(share.id)
    ElMessage.success('删除成功')
    fetchShares()
  } catch (error) {
    console.error('删除失败:', error)
    ElMessage.error('删除失败')
  }
}

const handleSelectionChange = (selection) => {
  selectedShares.value = selection
}

const handleBatchDelete = async () => {
  if (selectedShares.value.length === 0) {
    ElMessage.warning('请选择要删除的分享')
    return
  }

  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedShares.value.length} 个分享吗？`, '提示', {
      type: 'warning'
    })

    // 逐个删除
    const deletePromises = selectedShares.value.map(share => shareApi.deleteShare(share.id))
    await Promise.all(deletePromises)

    ElMessage.success('删除成功')
    fetchShares()
    selectedShares.value = []
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const startEditPassword = (share) => {
  editingShare.value = share.id
  tempPassword.value = share.password || ''
  nextTick(() => {
    const input = document.querySelector('.el-input__inner')
    if (input) {
      input.focus()
    }
  })
}

const handlePasswordBlur = async (share) => {
  if (tempPassword.value !== share.password) {
    try {
      await shareApi.updateShare(share.id, { password: tempPassword.value })
      ElMessage.success('修改成功')
      share.password = tempPassword.value
    } catch (error) {
      ElMessage.error('修改失败')
      tempPassword.value = share.password || ''
    }
  }
  editingShare.value = null
}

const formatDate = (dateString) => {
  if (!dateString) return '永不过期'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  fetchShares()
})
</script>

<template>
  <div class="shares">
    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>我的分享</span>
          <el-button type="danger" size="small" @click="handleBatchDelete" :disabled="selectedShares.length === 0">
            批量删除 ({{ selectedShares.length }})
          </el-button>
        </div>
      </template>

      <el-empty v-if="shares.length === 0" description="暂无分享" />

      <el-table v-else :data="shares" align="left" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.type === 'photo' ? 'success' : 'primary'" size="small">
              {{ row.type === 'photo' ? '图片' : '相册' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="密码" width="180">
          <template #default="{ row }">
            <el-input
              v-if="editingShare === row.id"
              v-model="tempPassword"
              placeholder="输入密码"
              type="password"
              show-password
              @blur="handlePasswordBlur(row)"
              @keyup.enter="handlePasswordBlur(row)"
              size="small"
              style="width: 100%"
            />
            <div v-else
                 @click="startEditPassword(row)"
                 style="cursor: pointer; display: flex; align-items: center; gap: 4px; color: #409eff; transition: all 0.2s;">
              <el-icon><Edit /></el-icon>
              {{ row.password ? '••••••' : '无需密码' }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="view_count" label="浏览量" width="120" />
        <el-table-column label="到期时间" min-width="180">
          <template #default="{ row }">
            {{ formatDate(row.expired_at) }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" min-width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="copyShareUrl(row)">复制链接</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.shares {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.el-card {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.el-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.el-table {
  width: 100%;
}
</style>
