// 下载图片工具函数

import { useSettingStore } from '@/stores/setting'

// 扩展名映射
const extensionMap = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/bmp': '.bmp',
  'image/svg+xml': '.svg',
  'image/tiff': '.tiff',
  'image/x-icon': '.ico'
}

/**
 * 根据MIME类型获取扩展名
 * @param {string} mimeType 
 * @returns {string}
 */
function getExtensionFromMime(mimeType) {
  return extensionMap[mimeType] || '.jpg'
}

/**
 * 从URL中提取文件名
 * @param {string} url 
 * @param {string} mimeType - 可选的MIME类型
 * @returns {string}
 */
export function getFilenameFromUrl(url, mimeType = '') {
  try {
    const urlObj = new URL(url)
    // 尝试从路径中获取文件名
    const pathname = urlObj.pathname
    let filename = pathname.split('/').pop()
    
    // 处理带有后缀参数的文件名，如: xxx.jpg@976w_550h_!web-home-carousel-cover
    if (filename && filename.includes('@')) {
      // 去掉 @ 后面的部分
      filename = filename.split('@')[0]
    }
    
    // 如果处理后没有扩展名，根据MIME类型添加
    if (filename && !filename.includes('.')) {
      const ext = getExtensionFromMime(mimeType)
      return filename + ext
    }
    
    return filename || `image_${Date.now()}.jpg`
  } catch {
    return `image_${Date.now()}.jpg`
  }
}

/**
 * 下载图片到指定目录
 * @param {string} url - 图片URL
 * @param {string} filename - 文件名
 * @param {string} savePath - 保存目录（可选，默认使用设置的下载目录）
 * @param {string} mimeType - 可选的MIME类型
 */
export async function downloadImage(url, filename, savePath, mimeType = '') {
  try {
    // 如果没有指定保存目录，优先使用设置中的下载目录
    if (!savePath) {
      const settingStore = useSettingStore()
      savePath = settingStore.downloadDirectory
    }

    // 如果设置中也没有，使用系统默认下载目录
    if (!savePath) {
      savePath = await window.electronAPI?.getDownloadDirectory?.()
    }

    if (!savePath) {
      throw new Error('无法获取下载目录')
    }

    // 如果文件名没有扩展名，尝试根据MIME类型添加
    if (filename && !filename.includes('.')) {
      const ext = getExtensionFromMime(mimeType)
      filename = filename + ext
    }

    // 使用 electron API 下载文件
    const result = await window.electronAPI?.downloadFile?.(url, filename, savePath)

    if (result?.success) {
      return { success: true, path: result.path }
    } else {
      throw new Error(result?.error || '下载失败')
    }
  } catch (error) {
    console.error('下载图片失败:', error)
    return { success: false, error: error.message }
  }
}