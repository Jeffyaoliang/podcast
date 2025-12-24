import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Moon, TrendingUp, Clock, Calendar, AlertCircle, Info, Play } from 'lucide-react'
import useHistoryStore from '../store/historyStore'
import useRSSStore from '../store/rssStore'
import { SleepScoreCalculator } from '../services/sleepScore/sleepScoreCalculator'
import { PodcastContentAnalyzer } from '../services/sleepScore/podcastContentAnalyzer'
import { getPopularRSSFeeds, parseRSS } from '../services/rssService'
import { stripHTML } from '../utils/helpers'

export default function SleepScore() {
  const { records, init } = useHistoryStore()
  const { recentFeeds } = useRSSStore()
  const [stats, setStats] = useState(null)
  const [selectedPeriod, setSelectedPeriod] = useState('week') // week, month, all
  const [loading, setLoading] = useState(true)
  const [podcastScores, setPodcastScores] = useState([])
  const [loadingPodcasts, setLoadingPodcasts] = useState(true)
  const [activeTab, setActiveTab] = useState('recommendations') // recommendations, history

  useEffect(() => {
    init()
    loadPodcastScores()
  }, [])

  useEffect(() => {
    if (records.length > 0) {
      calculateStats()
    } else {
      setLoading(false)
    }
  }, [records, selectedPeriod])

  // 加载热门播客的睡眠友好度评分
  const loadPodcastScores = async () => {
    try {
      setLoadingPodcasts(true)
      const popularFeeds = getPopularRSSFeeds()
      
      // 并行加载所有播客信息（但限制并发数，避免过多请求）
      const batchSize = 3
      const allScores = []
      
      for (let i = 0; i < popularFeeds.length; i += batchSize) {
        const batch = popularFeeds.slice(i, i + batchSize)
        const batchPromises = batch.map(async (feed) => {
          try {
            // 先从缓存中获取
            const cached = recentFeeds.find(rf => rf.rssUrl === feed.rssUrl)
            if (cached && cached.title && cached.description) {
              // 使用缓存的数据计算评分
              const analysis = PodcastContentAnalyzer.analyzeContent({
                title: cached.title,
                description: cached.description,
                podcastName: cached.title,
                duration: 0 // 播客级别的评分不考虑单集时长
              })
              
              return {
                ...cached,
                score: analysis.score,
                analysis,
                rssUrl: cached.rssUrl || feed.rssUrl
              }
            }
            
            // 如果缓存中没有，尝试解析RSS（但只解析前3个，避免过多请求）
            if (i < 3) {
              const podcastData = await parseRSS(feed.rssUrl)
              if (podcastData && podcastData.title) {
                const analysis = PodcastContentAnalyzer.analyzeContent({
                  title: podcastData.title,
                  description: podcastData.description || '',
                  podcastName: podcastData.title,
                  duration: 0
                })
                
                return {
                  title: podcastData.title,
                  description: podcastData.description || '',
                  image: podcastData.image || feed.image || '',
                  rssUrl: feed.rssUrl,
                  score: analysis.score,
                  analysis
                }
              }
            }
            
            // 如果无法获取数据，使用feed的基本信息
            const analysis = PodcastContentAnalyzer.analyzeContent({
              title: feed.title || '',
              description: feed.description || '',
              podcastName: feed.title || '',
              duration: 0
            })
            
            return {
              title: feed.title || '',
              description: feed.description || '',
              image: feed.image || '',
              rssUrl: feed.rssUrl,
              score: analysis.score,
              analysis
            }
          } catch (error) {
            console.error(`加载播客评分失败 ${feed.rssUrl}:`, error)
            // 返回默认评分
            return {
              title: feed.title || '',
              description: feed.description || '',
              image: feed.image || '',
              rssUrl: feed.rssUrl,
              score: 50, // 默认中等分数
              analysis: null
            }
          }
        })
        
        const batchResults = await Promise.all(batchPromises)
        allScores.push(...batchResults)
      }
      
      // 按照评分从高到低排序
      allScores.sort((a, b) => b.score - a.score)
      
      setPodcastScores(allScores)
    } catch (error) {
      console.error('加载播客评分失败:', error)
    } finally {
      setLoadingPodcasts(false)
    }
  }

  const calculateStats = () => {
    setLoading(true)
    
    let startDate = null
    const endDate = new Date()
    
    switch (selectedPeriod) {
      case 'week':
        startDate = new Date()
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'month':
        startDate = new Date()
        startDate.setMonth(startDate.getMonth() - 1)
        break
      case 'all':
      default:
        startDate = null
        break
    }

    const sleepStats = SleepScoreCalculator.calculatePeriodScore(records, startDate, endDate)
    setStats(sleepStats)
    setLoading(false)
  }

  const getScoreLevel = (score) => {
    if (score >= 85) return { level: '极度适合', icon: '🌙', color: 'text-green-600', bgColor: 'bg-green-100' }
    if (score >= 70) return { level: '较为适合', icon: '😴', color: 'text-blue-600', bgColor: 'bg-blue-100' }
    if (score >= 50) return { level: '一般', icon: '🤔', color: 'text-yellow-600', bgColor: 'bg-yellow-100' }
    return { level: '不适合', icon: '⚠️', color: 'text-red-600', bgColor: 'bg-red-100' }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return '今天'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨天'
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!stats || stats.totalRecords === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg">
        <Moon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">还没有睡眠播放记录</p>
        <p className="text-sm text-gray-400 mb-4">
          开始播放播客，系统会自动计算您的睡眠质量评分
        </p>
        <Link
          to="/"
          className="inline-block mt-4 text-primary-600 hover:text-primary-700 font-medium"
        >
          去发现精彩内容 →
        </Link>
      </div>
    )
  }

  const scoreLevel = getScoreLevel(stats?.averageScore || 0)

  return (
    <div className="space-y-6">
      {/* 标题和标签页 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Moon className="h-8 w-8 mr-3 text-primary-600" />
            睡眠评分
          </h1>
          <p className="text-gray-600 mt-2">
            {activeTab === 'recommendations' ? '发现适合睡前听的播客' : '基于您的播客播放历史计算'}
          </p>
        </div>
        
        {/* 标签页切换 */}
        <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'recommendations'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            推荐播客
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            历史记录
          </button>
        </div>
      </div>

      {/* 推荐播客列表 */}
      {activeTab === 'recommendations' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              适合睡前听的播客推荐
              <span className="text-sm font-normal text-gray-500 ml-2">
                （按睡眠友好度评分从高到低排序）
              </span>
            </h2>
            
            {loadingPodcasts ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : podcastScores.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                暂无播客数据
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {podcastScores.map((podcast, index) => {
                  const podcastScoreLevel = getScoreLevel(podcast.score)
                  const encodedRssUrl = encodeURIComponent(podcast.rssUrl)
                  
                  return (
                    <Link
                      key={podcast.rssUrl || index}
                      to={`/rss/${encodedRssUrl}`}
                      className="group relative bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-primary-500 transition-all hover:shadow-lg"
                    >
                      <div className="p-4">
                        {/* 封面和评分 */}
                        <div className="flex items-start gap-4 mb-3">
                          <div className="relative flex-shrink-0">
                            <div className="w-20 h-20 rounded-lg bg-gray-100 overflow-hidden">
                              {podcast.image ? (
                                <img
                                  src={podcast.image}
                                  alt={podcast.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    if (podcast.image && !podcast.image.includes('ui-avatars.com')) {
                                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(podcast.title)}&background=6366f1&color=fff&size=200&bold=true&font-size=0.4`
                                    }
                                  }}
                                />
                              ) : (
                                <img
                                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(podcast.title)}&background=6366f1&color=fff&size=200&bold=true&font-size=0.4`}
                                  alt={podcast.title}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            {/* 评分徽章 */}
                            <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full ${podcastScoreLevel.bgColor} flex items-center justify-center text-xs font-bold ${podcastScoreLevel.color} shadow-md`}>
                              {podcast.score}
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1 group-hover:text-primary-600 transition-colors">
                              {podcast.title}
                            </h3>
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${podcastScoreLevel.bgColor} ${podcastScoreLevel.color}`}>
                              <span>{podcastScoreLevel.icon}</span>
                              <span>{podcastScoreLevel.level}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* 描述 */}
                        {podcast.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                            {stripHTML(podcast.description)}
                          </p>
                        )}
                        
                        {/* 分析详情 */}
                        {podcast.analysis && podcast.analysis.details && (
                          <div className="flex flex-wrap gap-1 text-xs">
                            {podcast.analysis.details.positiveKeywords.length > 0 && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                                {podcast.analysis.details.positiveKeywords.slice(0, 2).join('、')}
                              </span>
                            )}
                            {podcast.analysis.details.calmKeywords.length > 0 && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                {podcast.analysis.details.calmKeywords.slice(0, 2).join('、')}
                              </span>
                            )}
                            {podcast.analysis.details.negativeKeywords.length > 0 && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
                                含{podcast.analysis.details.negativeKeywords[0]}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 历史记录统计 */}
      {activeTab === 'history' && stats && stats.totalRecords > 0 && (
        <div className="space-y-6">
          {/* 时间段选择 */}
          <div className="flex gap-2">
          <button
            onClick={() => setSelectedPeriod('week')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedPeriod === 'week'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            最近7天
          </button>
          <button
            onClick={() => setSelectedPeriod('month')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedPeriod === 'month'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            最近30天
          </button>
          <button
            onClick={() => setSelectedPeriod('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedPeriod === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            全部
          </button>
          </div>

          {/* 总体评分卡片 */}
      <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-100 text-sm mb-2">平均睡眠评分</p>
            <div className="flex items-baseline gap-3">
              <span className="text-6xl font-bold">{stats.averageScore}</span>
              <span className="text-2xl text-primary-200">/ 100</span>
            </div>
            <div className={`mt-4 inline-block px-4 py-2 rounded-full ${scoreLevel.bgColor} ${scoreLevel.color} font-medium`}>
              {scoreLevel.icon} {scoreLevel.level}
            </div>
          </div>
          <div className="text-right">
            <p className="text-primary-100 text-sm mb-2">总记录数</p>
            <p className="text-3xl font-bold">{stats.totalRecords}</p>
          </div>
        </div>
      </div>

      {/* 评分分布 */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-4">评分分布</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">{stats.scoreDistribution.poor}</div>
            <div className="text-sm text-gray-600 mt-1">较差 (0-30)</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">{stats.scoreDistribution.fair}</div>
            <div className="text-sm text-gray-600 mt-1">一般 (31-60)</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.scoreDistribution.good}</div>
            <div className="text-sm text-gray-600 mt-1">良好 (61-80)</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{stats.scoreDistribution.excellent}</div>
            <div className="text-sm text-gray-600 mt-1">优秀 (81-100)</div>
          </div>
        </div>
      </div>

      {/* 建议 */}
      {stats.recommendations.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">改善建议</h2>
          <div className="space-y-3">
            {stats.recommendations.map((rec, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-4 rounded-lg ${
                  rec.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' : 'bg-blue-50 border border-blue-200'
                }`}
              >
                {rec.type === 'warning' ? (
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                )}
                <p className={`text-sm ${rec.type === 'warning' ? 'text-yellow-800' : 'text-blue-800'}`}>
                  {rec.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 每日评分趋势 */}
      {stats.dailyScores.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">每日评分趋势</h2>
          <div className="space-y-4">
            {stats.dailyScores.slice(0, 7).map((day, index) => {
              const dayScoreLevel = getScoreLevel(day.averageScore)
              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-700">{formatDate(day.date)}</span>
                    <span className="text-sm text-gray-500">({day.count} 条记录)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${dayScoreLevel.bgColor}`}
                        style={{ width: `${day.averageScore}%` }}
                      />
                    </div>
                    <span className={`font-bold ${dayScoreLevel.color} w-12 text-right`}>
                      {day.averageScore}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

          {/* 最近播放记录详情 */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">最近播放记录</h2>
            <div className="space-y-3">
              {stats.records.slice(0, 10).map((item, index) => {
                const recordScoreLevel = getScoreLevel(item.totalScore)
                const playTime = new Date(item.record.playedAt)
                return (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 line-clamp-1">
                        {item.record.episodeTitle}
                      </h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {Math.round(item.record.playedDuration / 60)}分钟
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {playTime.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className={`text-2xl font-bold ${recordScoreLevel.color}`}>
                        {item.totalScore}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        内容: {item.score.contentScore} | 行为: {item.score.behaviorScore}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* 历史记录为空时的提示 */}
      {activeTab === 'history' && (!stats || stats.totalRecords === 0) && (
        <div className="text-center py-12 bg-white rounded-lg">
          <Moon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">还没有睡眠播放记录</p>
          <p className="text-sm text-gray-400 mb-4">
            开始播放播客，系统会自动计算您的睡眠质量评分
          </p>
          <Link
            to="/"
            className="inline-block mt-4 text-primary-600 hover:text-primary-700 font-medium"
          >
            去发现精彩内容 →
          </Link>
        </div>
      )}
    </div>
  )
}

