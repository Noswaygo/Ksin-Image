/**
 * 发送系统通知
 * @param {Object} options - 通知选项
 * @param {string} options.title - 通知标题
 * @param {string} options.body - 通知内容
 * @param {string} options.icon - 通知图标（可选）
 */
export async function showNotification(options) {
  try {
    // 检查用户是否启用了通知
    const showNotification = localStorage.getItem('showNotification') !== 'false'
    if (!showNotification) {
      return false
    }

    // 检查是否在 Electron 环境中
    if (window.electronAPI?.showNotification) {
      const result = await window.electronAPI.showNotification({
        title: options.title,
        body: options.body,
        icon: options.icon
      })
      return result
    }

    // Web 环境使用浏览器通知 API
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon
      })
      return true
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        const notification = new Notification(options.title, {
          body: options.body,
          icon: options.icon
        })
        return true
      }
    }

    return false
  } catch (error) {
    console.error('发送通知失败:', error)
    return false
  }
}

/**
 * 上传成功通知
 */
export function showUploadSuccessNotification(count) {
  return showNotification({
    title: '上传成功',
    body: `成功上传了 ${count} 张图片`
  })
}

/**
 * 下载成功通知
 */
export function showDownloadSuccessNotification(filename) {
  return showNotification({
    title: '下载成功',
    body: `已下载: ${filename}`
  })
}

/**
 * 分享成功通知
 */
export function showShareSuccessNotification() {
  return showNotification({
    title: '分享成功',
    body: '分享链接已复制到剪贴板'
  })
}

/**
 * 错误通知
 */
export function showErrorNotification(message) {
  return showNotification({
    title: '错误',
    body: message
  })
}
