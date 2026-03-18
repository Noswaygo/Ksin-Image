<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox, ElCollapse, ElCollapseItem, ElTooltip } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'
import { tokenApi } from '@/api'

const { t } = useI18n()
const loading = ref(false)
const tokens = ref([])
const showTokenDialog = ref(false)
const createdToken = ref('')
const permissionsList = ref([])
const loadingPermissions = ref(false)
const showCreateForm = ref(false)
const activeGroups = ref([])
const tokenForm = ref({
  name: '',
  permissions: [],
  expires_at: ''
})
const formRef = ref(null)
const permissionGroups = ref({})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入令牌名称', trigger: 'blur' }
  ]
}

// 获取权限详情
const getPermissionDetail = (permValue) => {
  return permissionsList.value.find(p => p.value === permValue)
}

// 获取分组标签
const getGroupLabel = (groupKey) => {
  const labels = {
    user: '用户管理',
    content: '内容管理',
    service: '服务管理',
    integration: '集成管理',
    basic: '基础功能'
  }
  return labels[groupKey] || groupKey
}

// 判断子组是否全选
const isSubGroupChecked = (subGroupPerms) => {
  return subGroupPerms.every(perm => tokenForm.value.permissions.includes(perm))
}

// 判断子组是否半选
const isSubGroupIndeterminate = (subGroupPerms) => {
  const selected = subGroupPerms.filter(perm => tokenForm.value.permissions.includes(perm))
  return selected.length > 0 && selected.length < subGroupPerms.length
}

// 处理子组选择
const handleSubGroupCheck = (subGroupPerms, checked) => {
  if (checked) {
    // 选中:添加该子组所有权限
    const currentPerms = [...tokenForm.value.permissions]
    subGroupPerms.forEach(perm => {
      if (!currentPerms.includes(perm)) {
        currentPerms.push(perm)
      }
    })
    tokenForm.value.permissions = currentPerms
  } else {
    // 取消选中:移除该子组所有权限
    const currentPerms = tokenForm.value.permissions.filter(perm => !subGroupPerms.includes(perm))
    tokenForm.value.permissions = currentPerms
  }
}

// 处理子组选择(v-model版本)
const handleSubGroupCheckModelValue = (subGroupPerms, value) => {
  handleSubGroupCheck(subGroupPerms, value)
}

// 判断主组是否全选
const isMainGroupChecked = (mainGroup) => {
  const allPerms = Object.values(mainGroup).flat()
  return allPerms.every(perm => tokenForm.value.permissions.includes(perm))
}

// 判断主组是否半选
const isMainGroupIndeterminate = (mainGroup) => {
  const allPerms = Object.values(mainGroup).flat()
  const selected = allPerms.filter(perm => tokenForm.value.permissions.includes(perm))
  return selected.length > 0 && selected.length < allPerms.length
}

// 处理主组选择
const handleMainGroupCheck = (mainGroup, checked) => {
  const allPerms = Object.values(mainGroup).flat()
  handleSubGroupCheck(allPerms, checked)
}

// 处理主组选择(v-model版本)
const handleMainGroupCheckModelValue = (mainGroup, value) => {
  handleMainGroupCheck(mainGroup, value)
}

// 切换单个权限
const togglePermission = (perm, checked) => {
  const index = tokenForm.value.permissions.indexOf(perm)
  if (checked && index === -1) {
    tokenForm.value.permissions.push(perm)
  } else if (!checked && index > -1) {
    tokenForm.value.permissions.splice(index, 1)
  }
}

// 获取所有权限
const getAllPermissions = () => {
  const allPerms = []
  Object.values(permissionGroups.value).forEach(subGroups => {
    Object.values(subGroups).forEach(perms => {
      allPerms.push(...perms)
    })
  })
  return allPerms
}

// 判断是否全部选中
const isAllChecked = () => {
  const allPerms = getAllPermissions()
  return allPerms.length > 0 && allPerms.every(perm => tokenForm.value.permissions.includes(perm))
}

// 判断是否半选
const isAllIndeterminate = () => {
  const allPerms = getAllPermissions()
  const selected = allPerms.filter(perm => tokenForm.value.permissions.includes(perm))
  return selected.length > 0 && selected.length < allPerms.length
}

// 全选/取消全选
const handleSelectAll = (checked) => {
  if (checked) {
    // 全选:获取所有权限并一次性设置
    const allPerms = getAllPermissions()
    tokenForm.value.permissions = [...allPerms]
  } else {
    // 取消全选:清空数组
    tokenForm.value.permissions = []
  }
}

const fetchTokens = async () => {
  loading.value = true
  try {
    const res = await tokenApi.getTokenList()
    tokens.value = res.data?.data || []
  } catch (error) {
    ElMessage.error('获取令牌列表失败')
  } finally {
    loading.value = false
  }
}

const fetchPermissions = async () => {
  loadingPermissions.value = true
  try {
    const res = await tokenApi.getPermissions()
    permissionsList.value = res.data?.permissions || []
    permissionGroups.value = res.data?.groups || {}
  } catch (error) {
    ElMessage.error('获取权限列表失败')
  } finally {
    loadingPermissions.value = false
  }
}

const handleCreate = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) {
      return false
    }

    // 检查权限
    if (!tokenForm.value.permissions || tokenForm.value.permissions.length === 0) {
      ElMessage.warning('请至少选择一个权限')
      return false
    }

    try {
      const res = await tokenApi.createToken(tokenForm.value)
      console.log('创建令牌响应:', res)
      const token = res.data?.data?.token || res.data?.token || res.token || ''
      createdToken.value = token
      if (!token) {
        ElMessage.warning('令牌创建成功,但未返回token值')
      } else {
        ElMessage.success(t('token.tokenCreated'))
      }
      showCreateForm.value = false
      tokenForm.value = { name: '', permissions: [], expires_at: '' }
      showTokenDialog.value = true
      fetchTokens()
    } catch (error) {
      console.error('创建令牌失败:', error)
      ElMessage.error('创建失败: ' + (error.message || '未知错误'))
    }
  })
}

const handleCancelCreate = () => {
  showCreateForm.value = false
  tokenForm.value = { name: '', permissions: [], expires_at: '' }
}

const handleDelete = async (token) => {
  try {
    await ElMessageBox.confirm(
      '删除后，使用该令牌登录的客户端登录状态将失效，确定要删除吗？',
      '删除令牌',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    await tokenApi.deleteToken(token.id)
    ElMessage.success(t('token.tokenDeleted'))
    fetchTokens()
  } catch (error) {
    if (error !== 'cancel' && error !== 'canceled') {
      ElMessage.error('删除失败')
    }
  }
}

const handleTokenDialogClose = () => {
  showTokenDialog.value = false
  createdToken.value = ''
}

// 复制令牌到剪贴板
const handleCopyToken = async () => {
  try {
    await navigator.clipboard.writeText(createdToken.value)
    ElMessage.success('令牌已复制到剪贴板')
    // 复制成功后自动关闭弹窗
    handleTokenDialogClose()
  } catch (error) {
    ElMessage.error('复制失败')
  }
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

onMounted(() => {
  fetchTokens()
  fetchPermissions()
})
</script>

<template>
  <div class="tokens">
    <!-- 创建表单 -->
    <el-card v-if="showCreateForm" style="margin-bottom: 20px;">
      <template #header>
        <div class="card-header">
          <span>{{ t('token.createToken') }}</span>
        </div>
      </template>
      <el-form :model="tokenForm" label-width="100px" :rules="formRules" ref="formRef">
        <el-form-item :label="t('token.tokenName')" prop="name">
          <el-input v-model="tokenForm.name" placeholder="请输入令牌名称" />
        </el-form-item>
        <el-form-item :label="t('token.permissions')">
          <div class="permissions-header" v-if="!loadingPermissions">
            <el-checkbox
              :indeterminate="isAllIndeterminate()"
              :model-value="isAllChecked()"
              @update:model-value="handleSelectAll"
              class="select-all-checkbox"
            >
              <span class="select-all-label">全选权限</span>
            </el-checkbox>
          </div>
          <div class="permissions-container" style="width: 100%;">
            <div v-if="loadingPermissions">加载权限...</div>
            <el-collapse v-else v-model="activeGroups" class="permissions-collapse">
              <el-collapse-item
                v-for="(subGroups, mainGroup) in permissionGroups"
                :key="mainGroup"
                :name="mainGroup"
                class="main-collapse-item"
              >
                <template #title>
                  <div class="collapse-title">
                    <span class="main-label">{{ getGroupLabel(mainGroup) }}</span>
                    <el-checkbox
                      :indeterminate="isMainGroupIndeterminate(subGroups)"
                      :model-value="isMainGroupChecked(subGroups)"
                      @update:model-value="(val) => handleMainGroupCheckModelValue(subGroups, val)"
                      @click.stop
                      class="group-checkbox"
                    />
                  </div>
                </template>
                <div class="sub-groups-container">
                  <div v-for="(perms, subGroupName) in subGroups" :key="subGroupName" class="sub-group">
                    <div class="sub-group-header">
                      <el-checkbox
                        :indeterminate="isSubGroupIndeterminate(perms)"
                        :model-value="isSubGroupChecked(perms)"
                        @update:model-value="(val) => handleSubGroupCheckModelValue(perms, val)"
                        class="sub-checkbox"
                      >
                        <span class="sub-label">{{ subGroupName }}</span>
                      </el-checkbox>
                    </div>
                    <div class="permissions-list">
                      <div
                        v-for="perm in perms"
                        :key="perm"
                        :class="['permission-item', { 'is-checked': tokenForm.permissions.includes(perm) }]"
                      >
                        <el-checkbox
                          :model-value="tokenForm.permissions.includes(perm)"
                          @update:model-value="(val) => togglePermission(perm, val)"
                        >
                          <span class="perm-label">{{ getPermissionDetail(perm)?.label || perm }}</span>
                        </el-checkbox>
                        <el-tooltip :content="getPermissionDetail(perm)?.detail || ''" placement="top" :show-after="200">
                          <el-icon class="info-icon">
                            <InfoFilled />
                          </el-icon>
                        </el-tooltip>
                      </div>
                    </div>
                  </div>
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>
        </el-form-item>
        <el-form-item label="失效时间" prop="expires_at">
          <el-date-picker
            v-model="tokenForm.expires_at"
            type="datetime"
            placeholder="选择失效时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleCreate">确定</el-button>
          <el-button @click="handleCancelCreate">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 令牌列表 -->
    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <el-button v-if="!showCreateForm" type="primary" @click="showCreateForm = true">
            {{ t('token.createToken') }}
          </el-button>
        </div>
      </template>

      <el-empty v-if="tokens.length === 0" description="暂无令牌" />

      <el-table v-else :data="tokens">
        <el-table-column prop="name" :label="t('token.tokenName')" />
        <el-table-column prop="token" :label="t('token.tokenKey')" width="300">
          <template #default="{ row }">
            <span style="letter-spacing: 2px;">••••••••••••••••••••••••••••••••</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" :label="t('token.createTime')" width="160">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="expires_at" label="失效时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.expires_at) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('common.actions')">
          <template #default="{ row }">
            <el-button size="small" type="danger" @click="handleDelete(row)">
              {{ t('token.deleteToken') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="showTokenDialog" title="令牌创建成功" width="500px" :close-on-click-modal="false">
      <el-alert type="warning" :closable="false" style="margin-bottom: 20px;">
        <template #title>
          请立即复制您的令牌,它只会显示这一次!
        </template>
      </el-alert>
      <el-input
        v-model="createdToken"
        type="textarea"
        :rows="4"
        readonly
      >
        <template #append>
          <el-button @click="handleCopyToken">复制</el-button>
        </template>
      </el-input>
    </el-dialog>
  </div>
</template>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tokens :deep(.el-card__body) {
  overflow-x: hidden;
}

.tokens :deep(.el-table) {
  width: 100%;
}

.permissions-header {
  margin-bottom: 12px;
  padding: 8px 12px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

.select-all-checkbox {
  display: flex;
  align-items: center;
}

.select-all-label {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.permissions-container {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
  background: var(--el-bg-color);
}

.permissions-collapse {
  border: none;
}

.tokens :deep(.el-collapse-item__header) {
  padding: 0 20px;
  height: 48px;
  line-height: 48px;
}

.tokens :deep(.el-collapse-item__wrap) {
  border: none;
}

.main-collapse-item {
  border-bottom: 1px solid var(--el-border-color-light);
}

.main-collapse-item:last-child {
  border-bottom: none;
}

.collapse-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-right: 8px;
}

.main-label {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.group-checkbox {
  flex-shrink: 0;
}

.sub-groups-container {
  padding: 8px 20px 16px 20px;
}

.sub-group {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.sub-group:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.sub-group-header {
  margin-bottom: 10px;
  padding-left: 0;
}

.sub-checkbox {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
}

.sub-label {
  font-weight: 500;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.permissions-list {
  padding-left: 0;
  margin-left: 24px;
}

.permission-item {
  display: flex;
  align-items: center;
  margin-bottom: 0;
  padding: 10px 12px;
  border-radius: 4px;
  transition: background-color 0.2s;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.permission-item:last-child {
  border-bottom: none;
}

.permission-item :deep(.el-checkbox) {
  flex: 1;
  margin: 0;
  height: auto;
  line-height: 1.5;
}

.permission-item :deep(.el-checkbox__label) {
  display: flex;
  align-items: center;
  width: 100%;
  padding-left: 8px;
  white-space: nowrap;
}

.perm-label {
  font-weight: 400;
  color: var(--el-text-color-regular);
  font-size: 13px;
  flex: 1;
}

.info-icon {
  color: var(--el-text-color-placeholder);
  cursor: help;
  font-size: 14px;
  margin-left: 8px;
  flex-shrink: 0;
  opacity: 0.6;
  transition: opacity 0.2s, color 0.2s;
}

.info-icon:hover {
  color: var(--el-color-primary);
  opacity: 1;
}
</style>
