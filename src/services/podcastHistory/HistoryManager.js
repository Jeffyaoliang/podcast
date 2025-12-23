import { PodcastRecord } from './PodcastRecord'
import { StorageService } from './StorageService'

/**
 * 播客历史记录管理器（浏览器版本）
 */
export class HistoryManager {
  constructor() {
    this.storage = new StorageService()
    this.records = []
    this.loadRecords()
  }

  // 加载历史记录
  async loadRecords() {
    try {
      const data = await this.storage.load()
      this.records = data.map(item => PodcastRecord.fromJSON(item))
    } catch (error) {
      console.log('首次运行，创建新的历史记录')
      this.records = []
    }
  }

  // 添加播放记录
  async addRecord(recordData) {
    const record = new PodcastRecord(recordData)
    
    // 检查是否已存在相同记录，如果存在则更新
    const existingIndex = this.records.findIndex(r => {
      // 优先使用ID匹配，如果没有ID则使用标题和播客名称匹配
      if (r.id === record.id) return true
      if (record.episodeId && r.episodeId === record.episodeId && r.rssUrl === record.rssUrl) {
        return true
      }
      return r.episodeTitle === record.episodeTitle && 
             r.podcastName === record.podcastName
    })

    if (existingIndex !== -1) {
      // 更新现有记录
      this.records[existingIndex] = record
    } else {
      // 新记录添加到开头
      this.records.unshift(record)
    }

    await this.saveRecords()
    return record
  }

  // 保存记录到存储
  async saveRecords() {
    const data = this.records.map(record => record.toJSON())
    await this.storage.save(data)
  }

  // 搜索记录
  search(query, options = {}) {
    if (!query || !query.trim()) return this.records

    const {
      searchFields = ['episodeTitle', 'podcastName', 'description'],
      caseSensitive = false
    } = options

    const searchTerm = caseSensitive ? query : query.toLowerCase()

    return this.records.filter(record => {
      return searchFields.some(field => {
        const value = record[field] || ''
        const searchValue = caseSensitive ? value : value.toLowerCase()
        return searchValue.includes(searchTerm)
      })
    })
  }

  // 按日期范围过滤
  filterByDate(startDate, endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999) // 包含结束日期的全天

    return this.records.filter(record => {
      const recordDate = new Date(record.playedAt)
      return recordDate >= start && recordDate <= end
    })
  }

  // 按播客名称分组
  groupByPodcast() {
    const groups = {}
    this.records.forEach(record => {
      if (!groups[record.podcastName]) {
        groups[record.podcastName] = []
      }
      groups[record.podcastName].push(record)
    })
    return groups
  }

  // 获取播放统计
  getStats() {
    const totalRecords = this.records.length
    const completedRecords = this.records.filter(r => r.isCompleted()).length
    // 总播放时长 = 所有记录的 playedDuration 总和（秒）
    const totalPlayTimeSeconds = this.records.reduce((sum, r) => sum + (r.playedDuration || 0), 0)
    // 转换为小时（保留1位小数）
    const totalPlayTimeHours = totalPlayTimeSeconds / 3600
    const uniquePodcasts = new Set(this.records.map(r => r.podcastName)).size

    // 计算完成率：已完成记录数 / 总记录数 * 100%
    const completionRate = totalRecords > 0 ? Math.round((completedRecords / totalRecords) * 100) : 0

    // 开发环境下输出调试信息
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('统计信息:', {
        总记录数: totalRecords,
        已完成记录数: completedRecords,
        完成率: completionRate + '%',
        每条记录进度: this.records.map(r => ({
          标题: r.episodeTitle.substring(0, 30),
          进度: r.getProgress() + '%',
          是否完成: r.isCompleted()
        }))
      })
    }

    return {
      totalRecords,
      completedRecords,
      completionRate,
      totalPlayTime: totalPlayTimeHours, // 小时（保留小数）
      totalPlayTimeSeconds, // 也返回秒数，以备后用
      uniquePodcasts
    }
  }

  // 获取最近播放
  getRecent(limit = 10) {
    return this.records
      .sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt))
      .slice(0, limit)
  }

  // 删除记录
  async deleteRecord(recordId) {
    const index = this.records.findIndex(r => r.id === recordId)
    if (index !== -1) {
      this.records.splice(index, 1)
      await this.saveRecords()
      return true
    }
    return false
  }

  // 清空所有记录
  async clearAll() {
    this.records = []
    await this.storage.clear()
  }

  // 获取所有记录
  getAllRecords() {
    return this.records
  }
}

