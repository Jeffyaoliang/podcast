/**
 * 搜索工具类（浏览器版本）
 */

// 辅助函数：移除HTML标签，提取纯文本
function stripHTMLTags(html) {
  if (!html) return ''
  // 创建临时DOM元素来解析HTML
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

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
      threshold = 0.25, // 相似度阈值（降低阈值，让关键词匹配更容易通过）
      maxResults = 50,
      podcastDescriptions = {} // 可选的播客描述映射 { rssUrl: description }
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
      
      // 检查描述匹配（改进：支持关键词搜索）
      // 1. 先检查单集描述
      if (record.description) {
        // 先移除HTML标签，只搜索纯文本内容
        const descText = stripHTMLTags(record.description).trim()
        const descLower = descText.toLowerCase()
        
        // 关键词匹配（描述中包含搜索词）- 最直接的方式，优先使用
        if (descLower.includes(searchTerm)) {
          // 如果描述中包含完整的关键词，给予足够高的分数以确保通过阈值
          maxScore = Math.max(maxScore, 0.9) // 提高分数，确保能通过阈值
          
          // 如果是多个词的搜索，检查是否都出现在描述中
          const searchWords = searchTerm.split(/\s+/).filter(w => w.length > 1)
          if (searchWords.length > 1) {
            const allWordsFound = searchWords.every(word => descLower.includes(word))
            if (allWordsFound) {
              maxScore = Math.max(maxScore, 0.95) // 多个关键词都匹配时分数更高
            }
          }
        } else {
          // 如果没有完全匹配，尝试整体相似度匹配
          const descScore = this.calculateSimilarity(descLower, searchTerm)
          maxScore = Math.max(maxScore, descScore * 0.7) // 描述权重较低
        }
      }
      
      // 2. 如果单集描述中没有匹配，且提供了播客描述映射，也搜索播客描述
      if (record.rssUrl && podcastDescriptions[record.rssUrl] && maxScore < 0.85) {
        const podcastDescText = stripHTMLTags(podcastDescriptions[record.rssUrl]).trim()
        const podcastDescLower = podcastDescText.toLowerCase()
        
        if (podcastDescLower.includes(searchTerm)) {
          // 播客描述匹配，给予较高分数
          maxScore = Math.max(maxScore, 0.88) // 播客描述匹配分数略低于单集描述
        }
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
    .filter(item => {
      // 调试信息（仅在开发环境，帮助排查搜索问题）
      if (import.meta.env.DEV) {
        const desc = item.record.description ? stripHTMLTags(item.record.description).substring(0, 50) : '(无描述)'
        if (item.score >= threshold || item.record.podcastName.toLowerCase().includes('teahour')) {
          console.log(`搜索 "${searchTerm}": ${item.record.podcastName} - 分数: ${item.score.toFixed(2)}, 描述: ${desc}...`)
        }
      }
      return item.score >= threshold
    })
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

