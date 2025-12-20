/**
 * 播客内容分析器
 * 基于播客元数据（标题、描述、时长）分析睡眠友好度
 */
export class PodcastContentAnalyzer {
  // 不适合睡眠的关键词（扣15分）
  static NEGATIVE_KEYWORDS = [
    // 中文
    '脱口秀', '吐槽', '爆笑', '笑声', '音乐', '辩论', '激动', '激烈',
    '争论', '吵架', '尖叫', '惊悚', '恐怖', '悬疑', '刺激',
    // 英文
    'comedy', 'music', 'debate', 'exciting', 'laugh', 'funny', 'thriller',
    'horror', 'suspense', 'exciting', 'intense'
  ]

  // 适合睡眠的关键词（加10分）
  static POSITIVE_KEYWORDS = [
    // 中文
    '冥想', 'asmr', '睡眠', '放松', '平静', '舒缓', '轻柔', '故事',
    '朗读', '诗歌', '散文', '历史', '科普', '知识',
    // 英文
    'meditation', 'sleep', 'relax', 'calm', 'story', 'read', 'history',
    'asmr', 'peaceful', 'gentle', 'soft'
  ]

  // 情绪激烈词汇（扣10分）
  static INTENSE_EMOTION_KEYWORDS = [
    '兴奋', '激动', '热烈', '疯狂', '狂欢', 'exciting', 'exciting',
    'intense', 'frenzy'
  ]

  // 平静氛围词汇（加5分）
  static CALM_KEYWORDS = [
    '平静', '安静', '温和', '柔和', '舒适', 'calm', 'quiet', 'gentle',
    'soft', 'comfortable', 'peaceful'
  ]

  /**
   * 分析播客内容的睡眠友好度（0-100分）
   * @param {Object} podcast 播客信息
   * @param {string} podcast.title 播客标题
   * @param {string} podcast.description 播客描述
   * @param {string} podcast.podcastName 播客名称
   * @param {number} podcast.duration 播客时长（秒）
   * @returns {Object} 分析结果
   */
  static analyzeContent(podcast) {
    let score = 100 // 基础分100分
    const details = {
      baseScore: 100,
      durationDeduction: 0,
      negativeKeywords: [],
      positiveKeywords: [],
      intenseEmotions: [],
      calmKeywords: [],
      finalScore: 100
    }

    const title = (podcast.title || '').toLowerCase()
    const description = (podcast.description || '').toLowerCase()
    const podcastName = (podcast.podcastName || '').toLowerCase()
    const durationMinutes = (podcast.duration || 0) / 60

    // 合并所有文本用于搜索
    const allText = `${title} ${description} ${podcastName}`

    // 1. 时长分析
    if (durationMinutes > 120) {
      // 超过2小时：扣20分
      details.durationDeduction = -20
      score -= 20
    } else if (durationMinutes >= 90) {
      // 1.5-2小时：扣10分
      details.durationDeduction = -10
      score -= 10
    }

    // 2. 检查不适合睡眠的关键词（只扣一次）
    let hasNegativeKeyword = false
    for (const keyword of this.NEGATIVE_KEYWORDS) {
      if (allText.includes(keyword.toLowerCase())) {
        if (!hasNegativeKeyword) {
          details.negativeKeywords.push(keyword)
          score -= 15
          hasNegativeKeyword = true
        } else {
          details.negativeKeywords.push(keyword)
        }
        break // 找到第一个就停止（只扣一次）
      }
    }

    // 3. 检查适合睡眠的关键词（只加一次）
    let hasPositiveKeyword = false
    for (const keyword of this.POSITIVE_KEYWORDS) {
      if (allText.includes(keyword.toLowerCase())) {
        if (!hasPositiveKeyword) {
          details.positiveKeywords.push(keyword)
          score += 10
          hasPositiveKeyword = true
        } else {
          details.positiveKeywords.push(keyword)
        }
        break // 找到第一个就停止（只加一次）
      }
    }

    // 4. 检查情绪激烈词汇（只扣一次）
    let hasIntenseEmotion = false
    for (const keyword of this.INTENSE_EMOTION_KEYWORDS) {
      if (description.includes(keyword.toLowerCase())) {
        if (!hasIntenseEmotion) {
          details.intenseEmotions.push(keyword)
          score -= 10
          hasIntenseEmotion = true
        } else {
          details.intenseEmotions.push(keyword)
        }
        break
      }
    }

    // 5. 检查平静氛围词汇（只加一次）
    let hasCalmKeyword = false
    for (const keyword of this.CALM_KEYWORDS) {
      if (description.includes(keyword.toLowerCase())) {
        if (!hasCalmKeyword) {
          details.calmKeywords.push(keyword)
          score += 5
          hasCalmKeyword = true
        } else {
          details.calmKeywords.push(keyword)
        }
        break
      }
    }

    // 确保分数在0-100范围内
    score = Math.max(0, Math.min(100, score))

    // 如果有多项负面因素，额外扣分（体现叠加效应）
    const negativeCount = (hasNegativeKeyword ? 1 : 0) + 
                         (hasIntenseEmotion ? 1 : 0) + 
                         (durationMinutes > 120 ? 1 : 0)
    if (negativeCount >= 2) {
      // 多项负面因素，额外扣5-15分
      const extraPenalty = Math.min(15, negativeCount * 5)
      score -= extraPenalty
      details.extraPenalty = -extraPenalty
    }

    // 再次确保分数在0-100范围内
    score = Math.max(0, Math.min(100, score))

    details.finalScore = Math.round(score)

    return {
      score: details.finalScore,
      details,
      level: this.getScoreLevel(score),
      durationMinutes: Math.round(durationMinutes * 10) / 10
    }
  }

  /**
   * 根据分数获取等级
   * @param {number} score 分数（0-100）
   * @returns {Object} 等级信息
   */
  static getScoreLevel(score) {
    if (score >= 85) {
      return {
        level: 'excellent',
        label: '极度适合',
        icon: '🌙',
        color: 'green',
        description: '非常适合睡眠，内容平和舒缓'
      }
    } else if (score >= 70) {
      return {
        level: 'good',
        label: '较为适合',
        icon: '😴',
        color: 'blue',
        description: '较为适合睡眠，内容相对平稳'
      }
    } else if (score >= 50) {
      return {
        level: 'fair',
        label: '一般',
        icon: '🤔',
        color: 'yellow',
        description: '可能有一定起伏，建议调低音量'
      }
    } else {
      return {
        level: 'poor',
        label: '不适合',
        icon: '⚠️',
        color: 'red',
        description: '内容较为激烈或刺激，不建议睡前听'
      }
    }
  }

  /**
   * 获取分析结果的详细说明
   * @param {Object} analysisResult 分析结果
   * @returns {Array} 说明列表
   */
  static getAnalysisExplanation(analysisResult) {
    const explanations = []
    const { details, durationMinutes } = analysisResult

    // 时长说明
    if (durationMinutes > 120) {
      explanations.push({
        type: 'warning',
        text: `播客时长 ${Math.round(durationMinutes)} 分钟，超过2小时，可能中途醒来`
      })
    } else if (durationMinutes >= 90) {
      explanations.push({
        type: 'info',
        text: `播客时长 ${Math.round(durationMinutes)} 分钟，稍长，建议睡前听完`
      })
    }

    // 关键词说明
    if (details.negativeKeywords.length > 0) {
      explanations.push({
        type: 'warning',
        text: `检测到不适合睡眠的内容：${details.negativeKeywords.join('、')}`
      })
    }

    if (details.positiveKeywords.length > 0) {
      explanations.push({
        type: 'success',
        text: `检测到适合睡眠的内容：${details.positiveKeywords.join('、')}`
      })
    }

    if (details.intenseEmotions.length > 0) {
      explanations.push({
        type: 'warning',
        text: `包含情绪激烈词汇：${details.intenseEmotions.join('、')}`
      })
    }

    if (details.calmKeywords.length > 0) {
      explanations.push({
        type: 'success',
        text: `包含平静氛围词汇：${details.calmKeywords.join('、')}`
      })
    }

    return explanations
  }
}

