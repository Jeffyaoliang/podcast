/**
 * 搜索工具类（浏览器版本）
 */
export class SearchUtils {
  // 模糊搜索算法 - 计算字符串相似度
  static calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const distance = this.levenshteinDistance(longer, shorter)
    return (longer.length - distance) / longer.length
  }

  // 计算编辑距离（Levenshtein距离）
  static levenshteinDistance(str1, str2) {
    const matrix = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  // 智能搜索 - 支持模糊匹配
  static smartSearch(records, query, options = {}) {
    const {
      threshold = 0.3, // 相似度阈值
      maxResults = 50
    } = options

    if (!query || !query.trim()) return records

    const searchTerm = query.trim().toLowerCase()

    const results = records.map(record => {
      let maxScore = 0
      
      // 检查标题匹配（权重最高）
      const titleScore = this.calculateSimilarity(
        record.episodeTitle.toLowerCase(),
        searchTerm
      )
      maxScore = Math.max(maxScore, titleScore)
      
      // 检查播客名称匹配
      const podcastScore = this.calculateSimilarity(
        record.podcastName.toLowerCase(),
        searchTerm
      )
      maxScore = Math.max(maxScore, podcastScore * 0.9) // 播客名称权重稍低
      
      // 检查描述匹配（权重最低）
      if (record.description) {
        const descScore = this.calculateSimilarity(
          record.description.toLowerCase(),
          searchTerm
        )
        maxScore = Math.max(maxScore, descScore * 0.7) // 描述权重较低
      }
      
      // 精确匹配额外加分
      if (record.episodeTitle.toLowerCase().includes(searchTerm)) {
        maxScore = Math.max(maxScore, 1.0)
      }
      if (record.podcastName.toLowerCase().includes(searchTerm)) {
        maxScore = Math.max(maxScore, 0.95)
      }
      
      return {
        record,
        score: maxScore
      }
    })
    .filter(item => item.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(item => item.record)

    return results
  }

  // 高亮搜索关键词
  static highlightKeywords(text, keywords) {
    if (!keywords || !text) return text
    
    const keywordArray = Array.isArray(keywords) ? keywords : [keywords]
    let result = text
    
    keywordArray.forEach(keyword => {
      const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
      result = result.replace(regex, '<mark>$1</mark>')
    })
    
    return result
  }

  // 提取搜索建议
  static getSuggestions(records, query, limit = 5) {
    const suggestions = new Set()
    
    if (!query || query.length < 2) return []
    
    const queryLower = query.toLowerCase()
    
    records.forEach(record => {
      // 从标题中提取词汇
      const titleWords = record.episodeTitle.split(/\s+/)
      titleWords.forEach(word => {
        if (word.length > 2 && word.toLowerCase().includes(queryLower)) {
          suggestions.add(word)
        }
      })
      
      // 从播客名称中提取
      if (record.podcastName.toLowerCase().includes(queryLower)) {
        suggestions.add(record.podcastName)
      }
    })
    
    return Array.from(suggestions).slice(0, limit)
  }
}

