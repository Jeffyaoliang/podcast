import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Clock, CheckCircle2, PlayCircle, Trash2, X, Calendar } from 'lucide-react'
import useHistoryStore from '../store/historyStore'
import useRSSStore from '../store/rssStore'
import { stripHTML } from '../utils/helpers'

export default function History() {
  const { 
    records, 
    loading, 
    init, 
    search, 
    smartSearch, 
    getRecent, 
    getStats, 
    deleteRecord,
    refresh 
  } = useHistoryStore()
  
  const { recentFeeds } = useRSSStore()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState('all') // all, recent, completed, inProgress
  const [filteredRecords, setFilteredRecords] = useState([])
  const [stats, setStats] = useState(null)

  useEffect(() => {
    init()
  }, [])

  useEffect(() => {
    updateDisplayedRecords()
  }, [records, searchQuery, filter, recentFeeds])

  const updateDisplayedRecords = () => {
    let result = [...records]

    // 应用搜索
    if (searchQuery.trim()) {
      // 构建播客描述映射，用于在搜索时同时搜索播客级别的描述
      // 这样即使历史记录中只保存了单集描述，也能通过播客描述找到结果
      const podcastDescriptions = {}
      recentFeeds.forEach(feed => {
        if (feed.rssUrl && feed.description) {
          podcastDescriptions[feed.rssUrl] = feed.description
        }
      })
      
      result = smartSearch(searchQuery.trim(), { 
        maxResults: 100,
        podcastDescriptions // 传入播客描述映射
      })
    }

    // 应用过滤器
    switch (filter) {
      case 'recent':
        result = getRecent(20)
        break
      case 'completed':
        result = result.filter(r => r.getProgress() >= 90)
        break
      case 'inProgress':
        result = result.filter(r => r.getProgress() < 90 && r.playedDuration > 0)
        break
      default:
        // all - 保持原样
        break
    }

    // 按播放时间倒序排序
    result.sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt))

    setFilteredRecords(result)
    setStats(getStats())
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '--:--'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return h > 0 
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`
  }

  const formatDate = (date) => {
    const d = new Date(date)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (d.toDateString() === today.toDateString()) {
      return '今天'
    } else if (d.toDateString() === yesterday.toDateString()) {
      return '昨天'
    } else {
      return d.toLocaleDateString('zh-CN')
    }
  }

  const handleDelete = async (recordId, e) => {
    e.stopPropagation()
    if (confirm('确定要删除这条历史记录吗？')) {
      await deleteRecord(recordId)
      refresh()
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">收听历史</h1>
        <p className="text-gray-600 mt-2">
          {stats ? `${stats.totalRecords} 条记录` : '加载中...'}
        </p>
      </div>

      {/* 搜索框 */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索播客标题、节目名称..."
            className="w-full pl-12 pr-10 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* 过滤器 */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setFilter('recent')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'recent'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            最近播放
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'completed'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            已完成
          </button>
          <button
            onClick={() => setFilter('inProgress')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'inProgress'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            进行中
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-gray-900">{stats.totalRecords}</div>
            <div className="text-sm text-gray-600 mt-1">总记录数</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-gray-900">
              {stats.totalPlayTime.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600 mt-1">总时长(小时)</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-gray-900">{stats.completionRate}%</div>
            <div className="text-sm text-gray-600 mt-1">完成率</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-gray-900">{stats.uniquePodcasts}</div>
            <div className="text-sm text-gray-600 mt-1">不同播客</div>
          </div>
        </div>
      )}

      {/* 历史记录列表 */}
      <div className="space-y-3">
        {filteredRecords.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <PlayCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchQuery ? '没有找到相关记录' : '还没有播放历史'}
            </p>
            {!searchQuery && (
              <Link
                to="/"
                className="inline-block mt-4 text-primary-600 hover:text-primary-700 font-medium"
              >
                去发现精彩内容 →
              </Link>
            )}
          </div>
        ) : (
          filteredRecords.map((record) => {
            const progress = record.getProgress()
            const isCompleted = record.isCompleted()
            const episodeUrl = record.rssUrl && record.episodeId
              ? `/rss/${encodeURIComponent(record.rssUrl)}/${encodeURIComponent(record.episodeId)}`
              : record.rssUrl
              ? `/rss/${encodeURIComponent(record.rssUrl)}`
              : '#'

            return (
              <div
                key={record.id}
                className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex gap-4">
                  {/* 封面图 */}
                  <Link to={episodeUrl} className="flex-shrink-0">
                    <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 overflow-hidden flex items-center justify-center">
                      {record.coverImage ? (
                        <img
                          src={record.coverImage}
                          alt={record.episodeTitle}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none'
                          }}
                        />
                      ) : (
                        <PlayCircle className="h-10 w-10 text-primary-600" />
                      )}
                    </div>
                  </Link>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <Link to={episodeUrl} className="flex-1">
                        <h3 className="font-semibold text-gray-900 line-clamp-2 hover:text-primary-600">
                          {record.episodeTitle}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">{record.podcastName}</p>
                      </Link>
                      <button
                        onClick={(e) => handleDelete(record.id, e)}
                        className="ml-2 p-2 text-gray-400 hover:text-red-500 transition-colors"
                        title="删除记录"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* 进度条 */}
                    {record.duration > 0 && (
                      <div className="mb-2">
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-600 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                          <span>
                            {isCompleted ? (
                              <span className="flex items-center text-green-600">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                已完成
                              </span>
                            ) : (
                              <span className="flex items-center">
                                <PlayCircle className="h-3 w-3 mr-1" />
                                进行中
                              </span>
                            )}
                          </span>
                          <span>{progress}%</span>
                        </div>
                      </div>
                    )}

                    {/* 元信息 */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDuration(record.playedDuration)} / {formatDuration(record.duration)}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(record.playedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

