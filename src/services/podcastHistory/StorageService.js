/**
 * 数据存储服务（浏览器版本，使用localStorage）
 */
export class StorageService {
  constructor() {
    this.storageKey = 'podcast_history'
  }

  // 保存数据
  async save(data) {
    try {
      const jsonData = JSON.stringify(data, null, 2)
      localStorage.setItem(this.storageKey, jsonData)
      return true
    } catch (error) {
      console.error('保存数据失败:', error)
      // 如果localStorage空间不足，尝试清理旧数据
      if (error.name === 'QuotaExceededError') {
        console.warn('存储空间不足，尝试清理旧数据')
        try {
          // 只保留最近100条记录
          const sortedData = [...data].sort((a, b) => 
            new Date(b.playedAt) - new Date(a.playedAt)
          )
          const limitedData = sortedData.slice(0, 100)
          localStorage.setItem(this.storageKey, JSON.stringify(limitedData))
          return true
        } catch (retryError) {
          console.error('清理后仍无法保存:', retryError)
          throw retryError
        }
      }
      throw error
    }
  }

  // 加载数据
  async load() {
    try {
      const data = localStorage.getItem(this.storageKey)
      if (!data) {
        return []
      }
      return JSON.parse(data)
    } catch (error) {
      console.error('加载数据失败:', error)
      // 如果数据损坏，返回空数组
      return []
    }
  }

  // 清空数据
  async clear() {
    try {
      localStorage.removeItem(this.storageKey)
      return true
    } catch (error) {
      console.error('清空数据失败:', error)
      throw error
    }
  }

  // 获取存储大小（估算）
  getStorageSize() {
    try {
      const data = localStorage.getItem(this.storageKey)
      if (!data) return 0
      return new Blob([data]).size
    } catch {
      return 0
    }
  }
}

