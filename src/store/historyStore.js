import { create } from 'zustand'
import { HistoryManager } from '../services/podcastHistory/HistoryManager'
import { SearchUtils } from '../services/podcastHistory/SearchUtils'

const historyManager = new HistoryManager()

const useHistoryStore = create((set, get) => ({
  records: [],
  loading: false,

  // 初始化加载记录
  init: async () => {
    set({ loading: true })
    try {
      await historyManager.loadRecords()
      set({ records: historyManager.getAllRecords() })
    } catch (error) {
      console.error('加载历史记录失败:', error)
    } finally {
      set({ loading: false })
    }
  },

  // 添加播放记录
  addRecord: async (recordData) => {
    try {
      const record = await historyManager.addRecord(recordData)
      set({ records: historyManager.getAllRecords() })
      return record
    } catch (error) {
      console.error('添加历史记录失败:', error)
      throw error
    }
  },

  // 搜索记录
  search: (query, options = {}) => {
    return historyManager.search(query, options)
  },

  // 智能搜索
  smartSearch: (query, options = {}) => {
    const records = historyManager.getAllRecords()
    return SearchUtils.smartSearch(records, query, options)
  },

  // 按日期过滤
  filterByDate: (startDate, endDate) => {
    return historyManager.filterByDate(startDate, endDate)
  },

  // 获取最近播放
  getRecent: (limit = 10) => {
    return historyManager.getRecent(limit)
  },

  // 获取统计信息
  getStats: () => {
    return historyManager.getStats()
  },

  // 按播客分组
  groupByPodcast: () => {
    return historyManager.groupByPodcast()
  },

  // 删除记录
  deleteRecord: async (recordId) => {
    try {
      await historyManager.deleteRecord(recordId)
      set({ records: historyManager.getAllRecords() })
      return true
    } catch (error) {
      console.error('删除历史记录失败:', error)
      return false
    }
  },

  // 清空所有记录
  clearAll: async () => {
    try {
      await historyManager.clearAll()
      set({ records: [] })
      return true
    } catch (error) {
      console.error('清空历史记录失败:', error)
      return false
    }
  },

  // 刷新记录列表
  refresh: () => {
    set({ records: historyManager.getAllRecords() })
  },

  // 根据episodeId和rssUrl获取历史记录
  getRecordByEpisode: (rssUrl, episodeId) => {
    const records = historyManager.getAllRecords()
    return records.find(record => 
      record.rssUrl === rssUrl && record.episodeId === episodeId
    )
  }
}))

export default useHistoryStore

