/**
 * Go 后端 API 配置
 * 如果设置为 true，前端将直接调用 Go 后端而不是使用浏览器端解析
 */
export const config = {
  // 使用 Go 后端（开发环境）
  useGoBackend: true,
  
  // Go 后端地址
  goBackendURL: 'http://localhost:8080',
  
  // 是否使用本地缓存
  enableCache: true,
}

// 导出便捷方法
export const getBackendURL = () => config.goBackendURL
export const isUsingGoBackend = () => config.useGoBackend

