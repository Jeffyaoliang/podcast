import { PodcastContentAnalyzer } from './podcastContentAnalyzer'

/**
 * 睡眠评分计算器
 * 综合播客内容分析（元数据）和播放行为分析（使用习惯）
 */
export class SleepScoreCalculator {
  /**
   * 计算单次播放的睡眠评分（综合内容分析和行为分析）
   * @param {Object} record 播放记录
   * @returns {Object} 评分详情
   */
  static calculateRecordScore(record) {
    // 1. 内容分析（基于播客元数据）- 权重60%
    const contentAnalysis = PodcastContentAnalyzer.analyzeContent({
      title: record.episodeTitle || '',
      description: record.description || '',
      podcastName: record.podcastName || '',
      duration: record.duration || 0
    })
    const contentScore = contentAnalysis.score // 0-100分

    // 2. 行为分析（基于播放习惯）- 权重40%
    const behaviorScore = this.calculateBehaviorScore(record) // 0-100分

    // 综合评分：内容60% + 行为40%
    const totalScore = Math.round(contentScore * 0.6 + behaviorScore * 0.4)

    return {
      contentScore,        // 内容分析分数
      behaviorScore,       // 行为分析分数
      totalScore,          // 综合总分
      contentAnalysis,     // 内容分析详情
      behaviorDetails: this.getBehaviorDetails(record) // 行为分析详情
    }
  }

  /**
   * 计算播放行为评分（0-100分）
   * @param {Object} record 播放记录
   * @returns {number} 行为评分
   */
  static calculateBehaviorScore(record) {
    let score = 0
    const maxScore = 100

    // 1. 时间段评分（0-40分）
    const playTime = new Date(record.playedAt)
    const hour = playTime.getHours()
    
    if (hour >= 20 || hour < 6) {
      // 晚上或凌晨播放，加分
      if (hour >= 22 || hour < 2) {
        score += 40 // 深夜播放，满分
      } else if (hour >= 20 || (hour >= 2 && hour < 6)) {
        score += 30 // 晚上或凌晨，高分
      }
    } else if (hour >= 6 && hour < 12) {
      score += 10 // 早上播放，低分
    } else {
      score += 0 // 白天播放，不加分
    }

    // 2. 播放时长评分（0-40分）
    // 理想睡眠时间：15-60分钟
    const durationMinutes = record.playedDuration / 60
    
    if (durationMinutes >= 15 && durationMinutes <= 60) {
      score += 40 // 理想时长范围，满分
    } else if (durationMinutes >= 10 && durationMinutes < 15) {
      score += 25 // 较短，但还可以
    } else if (durationMinutes > 60 && durationMinutes <= 90) {
      score += 30 // 稍长，但仍然可以
    } else if (durationMinutes > 90) {
      score += 15 // 太长，可能影响睡眠质量
    } else {
      score += 0 // 太短，无法判断
    }

    // 3. 完成度评分（0-20分）
    const progress = record.getProgress()
    if (progress >= 50) {
      score += 20 // 播放超过一半
    } else if (progress >= 30) {
      score += 15
    } else if (progress >= 15) {
      score += 10
    } else {
      score += 0
    }

    return Math.min(maxScore, score)
  }

  /**
   * 获取行为分析详情
   * @param {Object} record 播放记录
   * @returns {Object} 行为详情
   */
  static getBehaviorDetails(record) {
    const playTime = new Date(record.playedAt)
    const hour = playTime.getHours()
    const durationMinutes = record.playedDuration / 60
    const progress = record.getProgress()

    return {
      playHour: hour,
      durationMinutes: Math.round(durationMinutes * 10) / 10,
      progress,
      isNightTime: hour >= 20 || hour < 6,
      isIdealDuration: durationMinutes >= 15 && durationMinutes <= 60
    }
  }

  /**
   * 计算一段时间内的睡眠评分统计
   * @param {Array} records 播放记录数组
   * @param {Date} startDate 开始日期
   * @param {Date} endDate 结束日期
   * @returns {Object} 睡眠评分统计
   */
  static calculatePeriodScore(records, startDate = null, endDate = null) {
    // 过滤指定时间范围内的记录
    let filteredRecords = records
    
    if (startDate || endDate) {
      filteredRecords = records.filter(record => {
        const recordDate = new Date(record.playedAt)
        if (startDate && recordDate < startDate) return false
        if (endDate && recordDate > endDate) return false
        return true
      })
    }

    if (filteredRecords.length === 0) {
      return {
        totalRecords: 0,
        averageScore: 0,
        totalScore: 0,
        scoreDistribution: [],
        dailyScores: [],
        recommendations: []
      }
    }

    // 计算每条记录的评分
    const scores = filteredRecords.map(record => {
      const scoreDetails = this.calculateRecordScore(record)
      return {
        record,
        score: scoreDetails,
        totalScore: scoreDetails.totalScore // 用于排序和统计
      }
    })

    // 计算平均分
    const totalScore = scores.reduce((sum, item) => sum + item.totalScore, 0)
    const averageScore = Math.round(totalScore / scores.length)

    // 计算内容分析平均分和行为分析平均分
    const avgContentScore = Math.round(
      scores.reduce((sum, item) => sum + item.score.contentScore, 0) / scores.length
    )
    const avgBehaviorScore = Math.round(
      scores.reduce((sum, item) => sum + item.score.behaviorScore, 0) / scores.length
    )

    // 评分分布（0-49: 差, 50-69: 一般, 70-84: 良好, 85-100: 优秀）
    const distribution = {
      poor: scores.filter(item => item.totalScore <= 49).length,
      fair: scores.filter(item => item.totalScore > 49 && item.totalScore <= 69).length,
      good: scores.filter(item => item.totalScore > 69 && item.totalScore <= 84).length,
      excellent: scores.filter(item => item.totalScore > 84).length
    }

    // 按日期分组计算每日平均分
    const dailyScoresMap = new Map()
    scores.forEach(item => {
      const date = new Date(item.record.playedAt).toDateString()
      if (!dailyScoresMap.has(date)) {
        dailyScoresMap.set(date, { date, scores: [], count: 0 })
      }
      dailyScoresMap.get(date).scores.push(item.totalScore)
      dailyScoresMap.get(date).count++
    })

    const dailyScores = Array.from(dailyScoresMap.values()).map(item => ({
      date: item.date,
      averageScore: Math.round(item.scores.reduce((sum, s) => sum + s, 0) / item.scores.length),
      count: item.count
    })).sort((a, b) => new Date(b.date) - new Date(a.date))

    // 生成建议
    const recommendations = this.generateRecommendations(scores, averageScore)

    return {
      totalRecords: filteredRecords.length,
      averageScore,
      avgContentScore,      // 内容分析平均分
      avgBehaviorScore,     // 行为分析平均分
      totalScore,
      scoreDistribution: distribution,
      dailyScores,
      recommendations,
      records: scores
    }
  }

  /**
   * 生成睡眠建议
   * @param {Array} scores 评分数组
   * @param {number} averageScore 平均分
   * @returns {Array} 建议列表
   */
  static generateRecommendations(scores, averageScore) {
    const recommendations = []

    if (averageScore < 50) {
      recommendations.push({
        type: 'warning',
        message: '平均睡眠评分较低，建议选择更适合睡眠的播客内容'
      })
    }

    // 分析内容评分
    const lowContentScores = scores.filter(item => item.score.contentScore < 50)
    if (lowContentScores.length / scores.length > 0.3) {
      recommendations.push({
        type: 'warning',
        message: '部分播客内容可能不适合睡眠（如脱口秀、辩论等），建议选择冥想、故事、历史类播客'
      })
    }

    // 分析时间段
    const nightRecords = scores.filter(item => {
      const hour = new Date(item.record.playedAt).getHours()
      return hour >= 20 || hour < 6
    })

    if (nightRecords.length / scores.length < 0.5) {
      recommendations.push({
        type: 'info',
        message: '建议在晚上8点后或凌晨播放，有助于提高睡眠质量'
      })
    }

    // 分析时长
    const avgDuration = scores.reduce((sum, item) => sum + (item.record.playedDuration / 60), 0) / scores.length
    if (avgDuration < 15) {
      recommendations.push({
        type: 'info',
        message: '建议每次播放至少15分钟，有助于更好地放松'
      })
    } else if (avgDuration > 90) {
      recommendations.push({
        type: 'warning',
        message: '播放时间过长可能影响睡眠质量，建议控制在90分钟以内'
      })
    }

    return recommendations
  }
}

