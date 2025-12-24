/**
 * Go 后端音频代理工具
 * 用于解决音频播放的跨域问题
 */

// 配置
const CONFIG = {
  GO_BACKEND_URL: 'http://localhost:8080',
  USE_GO_BACKEND: true,
}

/**
 * 获取音频代理 URL
 * 如果启用了 Go 后端，返回代理 URL，否则返回原始 URL
 * @param {string} audioUrl 原始音频 URL
 * @returns {string} 代理后的音频 URL
 */
export const getAudioProxyUrl = (audioUrl) => {
  if (!audioUrl) return ''
  
  // 如果没有启用 Go 后端，直接返回原始 URL
  if (!CONFIG.USE_GO_BACKEND) {
    return audioUrl
  }
  
  // 构造代理 URL
  return `${CONFIG.GO_BACKEND_URL}/api/proxy/audio?url=${encodeURIComponent(audioUrl)}`
}

/**
 * 检查是否为代理 URL
 * @param {string} url URL
 * @returns {boolean}
 */
export const isProxyUrl = (url) => {
  return url && url.includes('/api/proxy/audio?url=')
}

/**
 * 从代理 URL 中提取原始 URL
 * @param {string} proxyUrl 代理 URL
 * @returns {string} 原始 URL
 */
export const getOriginalUrl = (proxyUrl) => {
  if (!proxyUrl) return ''
  
  const match = proxyUrl.match(/[?&]url=([^&]+)/)
  if (match) {
    return decodeURIComponent(match[1])
  }
  return proxyUrl
}

export default {
  getAudioProxyUrl,
  isProxyUrl,
  getOriginalUrl,
}

