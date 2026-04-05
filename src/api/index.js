import request from '@/utils/request'

/**
 * 用户认证相关
 */
export const authApi = {
  // 登录
  login(data) {
    return request.post('/login', data)
  },

  // 注册
  register(data) {
    return request.post('/register', data)
  },

  // 退出登录
  logout() {
    return request.post('/logout')
  },

  // 获取授权地址
  getOAuthUrl(provider) {
    return request.get(`/auth/oauth/${provider}/url`)
  },

  // OAuth登录
  oauthLogin(provider, data) {
    return request.post(`/auth/oauth/${provider}/login`, data)
  },

  // 绑定OAuth账号
  bindOAuth(provider, data) {
    return request.post(`/auth/oauth/${provider}/bind`, data)
  },

  // 解绑OAuth账号
  unbindOAuth(provider) {
    return request.delete(`/auth/oauth/${provider}`)
  },

  // 已绑定的第三方账号列表
  getOAuthList() {
    return request.get('/auth/oauth')
  }
}

/**
 * 验证码相关
 */
export const captchaApi = {
  // 发送短信验证码
  sendSmsCode(phone, captcha, captcha_key, country_code = 'cn', event = 'register') {
    return request.post('/sms/send', { phone, captcha, captcha_key, country_code, event })
  },

  // 发送邮件验证码
  sendEmailCode(email) {
    return request.post('/email/send', { email })
  },

  // 获取图形验证码
  getCaptcha() {
    return request.get('/captcha')
  }
}

/**
 * 用户信息相关
 */
export const userApi = {
  // 获取当前登录用户信息
  getUserInfo() {
    return request.get('/user/profile')
  },

  // 修改用户信息
  updateUserInfo(data) {
    return request.post('/user/profile', data)
  },

  // 修改密码
  changePassword(data) {
    return request.put('/user/password', data)
  },

  // 重置密码（手机号）
  resetPasswordByPhone(data) {
    return request.post('/auth/reset-password/phone', data)
  },

  // 重置密码（邮箱）
  resetPasswordByEmail(data) {
    return request.post('/auth/reset-password/email', data)
  },

  // 绑定/换绑手机号
  bindPhone(data) {
    return request.post('/user/bind-phone', data)
  },

  // 绑定/换绑邮箱
  bindEmail(data) {
    return request.post('/user/bind-email', data)
  },

  // 设置背景图片
  setBackground(data) {
    return request.post('/user/background', data)
  },

  // 移除背景图片
  removeBackground() {
    return request.delete('/user/background')
  },

  // 保存设置信息
  saveSetting(data) {
    return request.post('/user/setting', data)
  },

  // 获取用户权限
  getPermissions() {
    return request.get('/user/permissions')
  }
}

/**
 * 相册管理
 */
export const albumApi = {
  // 相册列表
  getAlbumList(params) {
    return request.get('/user/albums', { params })
  },

  // 相册详情
  getAlbumDetail(id) {
    return request.get(`/user/albums/${id}`)
  },

  // 添加相册
  createAlbum(data) {
    return request.post('/user/albums', data)
  },

  // 修改相册
  updateAlbum(id, data) {
    return request.put(`/user/albums/${id}`, data)
  },

  // 删除相册
  deleteAlbum(id) {
    return request.delete(`/user/albums/${id}`)
  },

  // 添加图片到相册
  addPhotosToAlbum(albumId, data) {
    return request.post(`/user/albums/${albumId}/photos`, data)
  },

  // 从相册移除图片
  removePhotosFromAlbum(albumId, data) {
    return request.delete(`/user/albums/${albumId}/photos`, { data })
  },

  // 附加标签
  addTag(albumId, data) {
    return request.post(`/user/albums/${albumId}/tags`, data)
  },

  // 移除标签
  removeTag(albumId, data) {
    return request.delete(`/user/albums/${albumId}/tags`, { data })
  }
}

/**
 * 图片管理
 */
export const photoApi = {
  // 图片列表
  getPhotoList(params) {
    return request.get('/user/photos', { params })
  },

  // 图片详情
  getPhotoDetail(id) {
    return request.get(`/user/photos/${id}`)
  },

  // 修改图片信息
  updatePhoto(id, data) {
    return request.put(`/user/photos/${id}`, data)
  },

  // 删除图片
  deletePhoto(id) {
    return request.delete('/user/photos', { data: { ids: [id] } })
  },

  // 批量删除图片
  batchDeletePhotos(ids) {
    return request.delete('/user/photos', { data: ids })
  },

  // 批量修改图片信息
  batchUpdatePhotos(data) {
    return request.put('/user/photos/batch', data)
  },

  // 附加标签
  addTag(photoId, data) {
    return request.post(`/user/photos/${photoId}/tags`, data)
  },

  // 移除标签
  removeTag(photoId, data) {
    return request.delete(`/user/photos/${photoId}/tags`, { data })
  },

  // 创建图片分享
  createShare(photoId, data) {
    return request.post('/user/shares', {
      type: 'photo',
      ids: [photoId],
      ...data
    })
  },

  // 获取图片分享
  getShare(photoId) {
    return request.get(`/user/shares?photo_id=${photoId}`)
  },

  // 删除图片分享
  deleteShare(shareId) {
    return request.delete('/user/shares', { data: { id: shareId } })
  }
}

/**
 * 分享管理
 */
export const shareApi = {
  // 分享列表
  getShareList(params) {
    return request.get('/user/shares', { params })
  },

  // 分享详情
  getShareDetail(id) {
    return request.get(`/share/${id}`)
  },

  // 创建分享
  createShare(data) {
    return request.post('/user/shares', data)
  },

  // 修改分享信息
  updateShare(id, data) {
    return request.put(`/user/shares/${id}`, data)
  },

  // 删除分享
  deleteShare(id) {
    return request.delete('/user/shares', { data: { id } })
  },

  // 获取公共分享详情
  getPublicShare(id) {
    return request.get(`/share/public/${id}`)
  },

  // 获取分享图片列表
  getSharePhotos(id, params) {
    return request.get(`/share/public/${id}/photos`, { params })
  }
}

/**
 * 订阅管理
 */
export const subscriptionApi = {
  // 角色组列表
  getRoleGroups() {
    return request.get('/user/groups')
  },

  // 删除角色组
  deleteRoleGroup(id) {
    return request.delete(`/user/subscription/role-groups/${id}`)
  },

  // 容量列表
  getCapacities() {
    return request.get('/user/capacities')
  },

  // 删除容量
  deleteCapacity(id) {
    return request.delete(`/user/subscription/capacities/${id}`)
  }
}

/**
 * 订单管理
 */
export const orderApi = {
  // 预览订单
  previewOrder(data) {
    return request.post('/user/orders/preview', data)
  },

  // 创建订单
  createOrder(data) {
    return request.post('/user/orders', data)
  },

  // 订单列表
  getOrderList(params) {
    return request.get('/user/orders', { params })
  },

  // 订单详情
  getOrderDetail(id) {
    return request.get(`/user/orders/${id}`)
  },

  // 取消订单
  cancelOrder(id) {
    return request.put(`/user/orders/${id}/cancel`)
  },

  // 删除订单
  deleteOrder(id) {
    return request.delete(`/user/orders/${id}`)
  },

  // 支付订单
  payOrder(tradeNo, data) {
    return request.post(`/user/orders/${tradeNo}/pay`, data)
  }
}

/**
 * 工单管理
 */
export const ticketApi = {
  // 工单列表
  getTicketList(params) {
    return request.get('/user/tickets', { params })
  },

  // 工单详情
  getTicketDetail(id) {
    return request.get(`/user/tickets/${id}`)
  },

  // 创建工单
  createTicket(data) {
    return request.post('/user/tickets', data)
  },

  // 工单回复列表
  getTicketReplies(id, params) {
    return request.get(`/user/tickets/${id}/replies`, { params })
  },

  // 回复工单
  replyTicket(id, data) {
    return request.post(`/user/tickets/${id}/reply`, data)
  },

  // 关闭工单
  closeTicket(id) {
    return request.put(`/user/tickets/${id}/close`)
  },

  // 删除工单
  deleteTicket(id) {
    return request.delete(`/user/tickets/${id}`)
  }
}

/**
 * Token管理
 */
export const tokenApi = {
  // Token列表
  getTokenList() {
    return request.get('/user/tokens')
  },

  // 获取系统支持的权限列表
  getPermissions() {
    return request.get('/token_permissions')
  },

  // 创建Token
  createToken(data) {
    return request.post('/user/tokens', data)
  },

  // 删除Token
  deleteToken(id) {
    return request.delete(`/user/tokens/${id}`)
  }
}

/**
 * 广场-图片
 */
export const squarePhotoApi = {
  // 图片列表
  getPhotoList(params) {
    return request.get('/explore/photos', { params })
  },

  // 图片详情
  getPhotoDetail(id) {
    return request.get(`/explore/photos/${id}`)
  },

  // 举报图片
  reportPhoto(id, data) {
    return request.post(`/explore/photos/${id}/report`, data)
  },

  // 点赞图片
  likePhoto(id) {
    return request.post(`/explore/photos/${id}/like`)
  },

  // 取消点赞图片
  unlikePhoto(id) {
    return request.delete(`/explore/photos/${id}/unlike`)
  },

  // 获取热门标签
  getHotTags() {
    return request.get('/explore/tags/popular')
  }
}

/**
 * 广场-用户
 */
export const squareUserApi = {
  // 用户主页信息
  getUserInfo(userId) {
    return request.get(`/square/users/${userId}`)
  },

  // 用户图片列表
  getUserPhotos(userId, params) {
    return request.get(`/square/users/${userId}/photos`, { params })
  },

  // 用户相册列表
  getUserAlbums(userId, params) {
    return request.get(`/square/users/${userId}/albums`, { params })
  },

  // 举报用户
  reportUser(userId, data) {
    return request.post(`/square/users/${userId}/report`, data)
  }
}

/**
 * 广场-相册
 */
export const squareAlbumApi = {
  // 相册列表
  getAlbumList(params) {
    return request.get('/explore/albums', { params })
  },

  // 相册详情
  getAlbumDetail(id) {
    return request.get(`/explore/albums/${id}`)
  },

  // 相册图片列表
  getAlbumPhotos(id, params) {
    return request.get(`/explore/albums/${id}/photos`, { params })
  },

  // 举报相册
  reportAlbum(id, data) {
    return request.post(`/explore/albums/${id}/report`, data)
  },

  // 点赞相册
  likeAlbum(id) {
    return request.post(`/explore/albums/${id}/like`)
  },

  // 取消点赞相册
  unlikeAlbum(id) {
    return request.delete(`/explore/albums/${id}/unlike`)
  }
}

/**
 * 套餐
 */
export const planApi = {
  // 套餐列表
  getPlanList() {
    return request.get('/plans')
  },

  // 套餐详情
  getPlanDetail(id) {
    return request.get(`/plans/${id}`)
  }
}

/**
 * 页面
 */
export const pageApi = {
  // 页面列表
  getPageList() {
    return request.get('/pages')
  },

  // 页面详情
  getPageDetail(slug) {
    return request.get(`/pages/${slug}`)
  }
}

/**
 * 公告
 */
export const announcementApi = {
  // 公告列表
  getAnnouncementList(params) {
    return request.get('/announcements', { params })
  },

  // 公告详情
  getAnnouncementDetail(id) {
    return request.get(`/announcements/${id}`)
  }
}

/**
 * 系统
 */
export const systemApi = {
  // 更新日志
  getChangelog() {
    return request.get('/changelog')
  },

  // 许可/免责声明
  getLicense() {
    return request.get('/license')
  },

  // 检测程序是否安装
  checkInstall() {
    return request.get('/install')
  },

  // 初始化配置
  initConfig(data) {
    return request.post('/install', data)
  },

  // 当前所在组信息
  getGroupInfo() {
    return request.get('/group')
  },

  // 上传图片（批量）
  uploadPhotos(files, options = {}, onProgress) {
    const formData = new FormData()
    
    // 添加所有文件
    files.forEach(file => {
      formData.append('file', file)
    })

    // 添加其他参数
    if (options.storage_id !== undefined) {
      formData.append('storage_id', options.storage_id)
    }
    if (options.album_id !== undefined) {
      formData.append('album_id', options.album_id)
    }
    if (options.expired_at) {
      formData.append('expired_at', options.expired_at)
    }
    if (options.tags && options.tags.length > 0) {
      options.tags.forEach(tag => {
        formData.append('tags[]', tag)
      })
    }
    if (options.is_public !== undefined) {
      formData.append('is_public', options.is_public)
    }
    if (options.is_remove_exif !== undefined) {
      formData.append('is_remove_exif', options.is_remove_exif)
    }
    if (options.intro) {
      formData.append('intro', options.intro)
    }

    return request.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100)
          onProgress(progress)
        }
      }
    })
  },

  // 上传单张图片（兼容旧接口）
  uploadPhoto(file, onProgress) {
    return this.uploadPhotos([file], {}, onProgress)
  },

  // 提交反馈与建议
  submitFeedback(data) {
    return request.post('/feedback', data)
  },

  // 生成二维码
  generateQrCode(data) {
    return request.post('/qrcode', data)
  },

  // 系统统计信息
  getSystemStats() {
    return request.get('/stats')
  },

  // 系统支持的所有令牌权限
  getTokenPermissions() {
    return request.get('/token-permissions')
  }
}
