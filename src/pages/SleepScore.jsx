import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Moon, TrendingUp, Clock, Calendar, AlertCircle, Info } from 'lucide-react'
import useHistoryStore from '../store/historyStore'
import { SleepScoreCalculator } from '../services/sleepScore/sleepScoreCalculator'

export default function SleepScore() {
  const { records, init } = useHistoryStore()
  const [stats, setStats] = useState(null)
  const [selectedPeriod, setSelectedPeriod] = useState('week') // week, month, all
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    init()
  }, [])

  useEffect(() => {
    if (records.length > 0) {
      calculateStats()
    } else {
      setLoading(false)
    }
  }, [records, selectedPeriod])

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

  const scoreLevel = getScoreLevel(stats.averageScore)

  return (
    <div className="space-y-6">
      {/* 标题和筛选 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Moon className="h-8 w-8 mr-3 text-primary-600" />
            睡眠评分
          </h1>
          <p className="text-gray-600 mt-2">基于您的播客播放历史计算</p>
        </div>
        
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
  )
}

