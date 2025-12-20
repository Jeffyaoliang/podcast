// 使用浏览器兼容的 RSS 解析方式
// 由于 rss-parser 依赖 Node.js 模块，我们使用 fetch + DOMParser

/**
 * RSS Feed 缓存管理
 */
const RSS_CACHE_KEY = 'rss-feed-cache'
const CACHE_EXPIRE_TIME = 24 * 60 * 60 * 1000 // 24小时过期（播客内容更新不频繁）

const getCache = () => {
  try {
    const cached = localStorage.getItem(RSS_CACHE_KEY)
    if (!cached) return {}
    const data = JSON.parse(cached)
    // 清理过期缓存
    const now = Date.now()
    const validCache = {}
    for (const [url, item] of Object.entries(data)) {
      if (item.timestamp && (now - item.timestamp) < CACHE_EXPIRE_TIME) {
        validCache[url] = item
      }
    }
    // 如果清理了过期数据，更新缓存
    if (Object.keys(validCache).length !== Object.keys(data).length) {
      localStorage.setItem(RSS_CACHE_KEY, JSON.stringify(validCache))
    }
    return validCache
  } catch (e) {
    return {}
  }
}

const setCache = (url, data) => {
  try {
    const cache = getCache()
    cache[url] = {
      data,
      timestamp: Date.now(),
    }
    // 只保留最近100个缓存项
    const entries = Object.entries(cache)
    if (entries.length > 100) {
      const sorted = entries.sort((a, b) => b[1].timestamp - a[1].timestamp)
      const limited = Object.fromEntries(sorted.slice(0, 100))
      localStorage.setItem(RSS_CACHE_KEY, JSON.stringify(limited))
    } else {
      localStorage.setItem(RSS_CACHE_KEY, JSON.stringify(cache))
    }
  } catch (e) {
    // 忽略存储错误（如存储空间不足）
  }
}

const getCachedData = (url) => {
  const cache = getCache()
  return cache[url]?.data || null
}

/**
 * 使用 CORS 代理或直接 fetch（如果支持）
 */
const fetchRSS = async (url) => {
  // 由于CORS限制，直接使用代理
  // 优先使用本地开发服务器代理（开发环境）
  const devProxy = `/api/rss-proxy?url=${encodeURIComponent(url)}`
  
  // 尝试多个代理服务（优先使用可靠的代理）
  // 注意：本地代理可能不稳定，直接使用外部代理
  const proxies = [
    `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    // 本地代理作为备用（可能不稳定）
    devProxy,
    // corsproxy.io 经常返回403，放到最后
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ]
  
  // 尝试使用代理
  for (const proxyUrl of proxies) {
    try {
      const response = await fetch(proxyUrl, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
        },
      })
      
      if (!response.ok) {
        continue
      }
      
      // 先获取响应文本
      const text = await response.text()
      
      if (!text || text.trim().length === 0) {
        continue
      }
      
      // 尝试解析为JSON（allorigins.win或codetabs返回JSON）
      if (text.trim().startsWith('{')) {
        try {
          const data = JSON.parse(text)
          if (data.contents) {
            let content = data.contents
            
            // 检查是否是base64编码的data URI（codetabs.com格式）
            if (content.startsWith('data:application/rss+xml')) {
              // 提取base64部分: data:application/rss+xml; charset=UTF-8;base64,<base64content>
              const base64Match = content.match(/base64,(.+)$/)
              if (base64Match) {
                try {
                  // 解码base64，然后转换为UTF-8字符串
                  const binaryString = atob(base64Match[1])
                  // 将二进制字符串转换为UTF-8字符串
                  const bytes = new Uint8Array(binaryString.length)
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i)
                  }
                  content = new TextDecoder('utf-8').decode(bytes)
                  if (content.trim().startsWith('<')) {
                    return content
                  }
                } catch (base64Error) {
                  if (import.meta.env.DEV) {
                    console.log('base64解码失败:', base64Error)
                  }
                }
              }
            }
            
            // 直接是XML字符串（JSON.parse应该已经正确处理了UTF-8）
            if (content && typeof content === 'string') {
              const trimmed = content.trim()
              if (trimmed.startsWith('<')) {
                // 确保XML内容是正确的UTF-8字符串
                // 如果content已经是正确的JavaScript字符串（UTF-16），直接返回即可
                return content
              }
            }
          }
          if (data.status && data.status.http_code !== 200) {
            // 移除日志，减少控制台输出
            continue
          }
        } catch (jsonError) {
          // 不是JSON，继续处理
        }
      }
      
      // 直接返回XML文本
      if (text.trim().startsWith('<')) {
        return text
      }
      
    } catch (error) {
      // 静默处理代理错误，继续尝试下一个
      continue
    }
  }
  
  // 检查是否是已知无法访问的域名
  if (url.includes('feeds.xyzfm.app')) {
    throw new Error('小宇宙的 RSS 链接无法通过代理访问。请尝试使用其他 RSS 链接，如 BBC News 或 NPR News')
  }
  
  throw new Error(`无法获取RSS Feed，已尝试所有代理服务。该 RSS 链接可能暂时无法访问，请稍后重试或尝试使用其他 RSS 链接。\n\nRSS链接: ${url}`)
}

/**
 * 解析 RSS XML
 */
const parseRSSXML = (xmlText) => {
  if (!xmlText || !xmlText.trim()) {
    throw new Error('RSS XML 内容为空')
  }
  
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml')
  
      // 检查解析错误
      const parseError = xmlDoc.querySelector('parsererror')
      if (parseError) {
        const errorText = parseError.textContent || '未知解析错误'
        // 检查是否是 HTML 页面而不是 XML（常见于重定向）
        if (xmlDoc.documentElement && xmlDoc.documentElement.tagName.toLowerCase() === 'html') {
          // 不输出警告日志，因为这是预期行为（某些RSS Feed无法通过CORS代理访问）
          throw new Error('RSS Feed 无法访问：返回了 HTML 页面而非 XML')
        }
        if (import.meta.env.DEV) {
          console.error('XML解析错误:', errorText)
          console.error('XML内容前500字符:', xmlText.substring(0, 500))
        }
        throw new Error('RSS 解析失败: ' + errorText)
      }
  
  // 尝试查找channel（RSS 2.0）或feed（Atom）
  let channel = xmlDoc.querySelector('channel')
  let isAtom = false
  
  if (!channel) {
    // 尝试Atom格式
    const feed = xmlDoc.querySelector('feed')
    if (feed) {
      // 检查是否是Atom格式（通过命名空间或标签名判断）
      const namespace = feed.namespaceURI || ''
      if (namespace.includes('atom') || feed.tagName === 'feed') {
        isAtom = true
        channel = feed
      } else {
        // feed存在但不是atom格式，当作错误处理
        if (import.meta.env.DEV) {
          console.error('找到feed元素但不是Atom格式')
        }
        throw new Error('无效的 RSS Feed：找不到 channel 或 feed 元素')
      }
    } else {
      if (import.meta.env.DEV) {
        console.error('找不到channel元素，XML结构:', xmlDoc.documentElement ? xmlDoc.documentElement.tagName : '无根元素')
        console.error('XML内容前500字符:', xmlText.substring(0, 500))
      }
      throw new Error('无效的 RSS Feed：找不到 channel 或 feed 元素')
    }
  }
  
  // 解析频道信息
  const getText = (selector) => {
    const el = channel.querySelector(selector)
    return el ? el.textContent : ''
  }
  
  const getAttribute = (selector, attr) => {
    const el = channel.querySelector(selector)
    return el ? el.getAttribute(attr) : ''
  }
  
  // RSS 2.0 和 Atom 格式的字段映射
  const title = getText('title')
  const description = isAtom 
    ? (getText('subtitle') || getText('summary') || getText('content')) 
    : getText('description')
  
  // Atom的link是自闭合标签，需要特殊处理
  let link = ''
  if (isAtom) {
    const linkEl = channel.querySelector('link')
    if (linkEl) {
      link = linkEl.getAttribute('href') || linkEl.textContent
    }
  } else {
    link = getText('link')
  }
  
  // 尝试多种方式获取图片
  let image = ''
  
  // 方法1: iTunes 图片（优先，因为通常质量更好）
  const itunesImage = channel.querySelector('itunes\\:image')
  if (itunesImage) {
    image = (itunesImage.getAttribute('href') || itunesImage.textContent || '').trim()
  }
  
  // 方法2: RSS 2.0 的 <image><url> 结构
  if (!image) {
    const imageUrlEl = channel.querySelector('image > url')
    if (imageUrlEl) {
      image = imageUrlEl.textContent.trim()
    }
  }
  
  // 方法3: RSS 2.0 的 <image> 标签中的 url 属性
  if (!image) {
    const imageEl = channel.querySelector('image')
    if (imageEl) {
      const urlAttr = imageEl.getAttribute('url')
      if (urlAttr) {
        image = urlAttr.trim()
      } else {
        // 尝试查找嵌套的url元素
        const urlEl = imageEl.querySelector('url')
        if (urlEl) {
          image = urlEl.textContent.trim()
        }
      }
    }
  }
  
  // 方法4: Atom 格式的 logo
  if (!image && isAtom) {
    const logoEl = channel.querySelector('logo')
    if (logoEl) {
      image = logoEl.textContent.trim()
    }
  }
  
  // 方法5: Atom 格式的 icon
  if (!image && isAtom) {
    const iconEl = channel.querySelector('icon')
    if (iconEl) {
      image = iconEl.textContent.trim()
    }
  }
  
  // 方法6: 从第一个item中提取itunes:image（某些RSS只在item中有图片）
  if (!image) {
    const firstItem = channel.querySelector(isAtom ? 'entry' : 'item')
    if (firstItem) {
      const firstItemItunesImage = firstItem.querySelector('itunes\\:image')
      if (firstItemItunesImage) {
        image = (firstItemItunesImage.getAttribute('href') || firstItemItunesImage.textContent || '').trim()
      }
      
      // 方法7: 尝试media:thumbnail
      if (!image) {
        const mediaThumbnail = firstItem.querySelector('media\\:thumbnail')
        if (mediaThumbnail) {
          image = mediaThumbnail.getAttribute('url') || ''
        }
      }
      
      // 方法8: 尝试media:content (medium="image")
      if (!image) {
        const mediaContentImage = firstItem.querySelector('media\\:content[medium="image"]')
        if (mediaContentImage) {
          image = mediaContentImage.getAttribute('url') || ''
        }
      }
    }
  }
  
  // 方法9: 尝试从description中提取图片URL（某些RSS在描述中嵌入图片）
  if (!image) {
    const descText = description
    const imgMatch = descText.match(/<img[^>]+src=["']([^"']+)["']/i)
    if (imgMatch && imgMatch[1]) {
      image = imgMatch[1].trim()
    }
  }
  
  // 调试日志（仅在开发环境）
  if (import.meta.env.DEV && image) {
    console.log('✅ 提取到播客封面:', image)
  } else if (import.meta.env.DEV && !image) {
    console.warn('⚠️ 未找到播客封面图片')
  }
  
  const author = getText('itunes\\:author') || getText('author') || getText('managingEditor')
  const language = getText('language') || 'zh'
  
  // 解析单集（RSS 2.0的item或Atom的entry）
  const itemsSelector = isAtom ? 'entry' : 'item'
  const items = Array.from(channel.querySelectorAll(itemsSelector)).map((item, index) => {
    const getItemText = (sel) => {
      const el = item.querySelector(sel)
      return el ? el.textContent : ''
    }
    
    const getItemAttribute = (sel, attr) => {
      const el = item.querySelector(sel)
      return el ? el.getAttribute(attr) : ''
    }
    
    const itemTitle = getItemText('title')
    const itemDescription = isAtom 
      ? (getItemText('summary') || getItemText('content')) 
      : (getItemText('description') || getItemText('content\\:encoded'))
    
    // Atom的link是自闭合标签，需要特殊处理
    let itemLink = ''
    if (isAtom) {
      const linkEl = item.querySelector('link')
      if (linkEl) {
        itemLink = linkEl.getAttribute('href') || linkEl.textContent
      }
    } else {
      itemLink = getItemText('link')
    }
    
    const itemGuid = isAtom 
      ? (getItemText('id') || itemLink || `${link}-${index}`)
      : (getItemText('guid') || itemLink || `${link}-${index}`)
    
    const pubDate = isAtom 
      ? (getItemText('published') || getItemText('updated'))
      : getItemText('pubDate')
    
    // 获取音频链接
    let audioUrl = ''
    if (isAtom) {
      // Atom格式：查找type为audio的link
      const audioLinks = Array.from(item.querySelectorAll('link'))
      const audioLink = audioLinks.find(link => {
        const type = link.getAttribute('type') || ''
        return type.startsWith('audio/')
      })
      audioUrl = audioLink ? audioLink.getAttribute('href') : ''
    } else {
      // RSS 2.0格式：查找enclosure
      const enclosure = item.querySelector('enclosure')
      audioUrl = enclosure ? enclosure.getAttribute('url') : ''
    }
    
    // 获取时长
    const durationStr = getItemText('itunes\\:duration')
    const duration = parseDuration(durationStr)
    
    // 获取单集图片（多种方式）
    let itemImage = ''
    // 方法1: itunes:image (href属性)
    const itemItunesImage = item.querySelector('itunes\\:image')
    if (itemItunesImage) {
      itemImage = itemItunesImage.getAttribute('href') || itemItunesImage.textContent || ''
      itemImage = itemImage.trim()
    }
    
    // 方法2: media:thumbnail
    if (!itemImage) {
      const mediaThumbnail = item.querySelector('media\\:thumbnail')
      if (mediaThumbnail) {
        itemImage = mediaThumbnail.getAttribute('url') || ''
      }
    }
    
    // 方法3: media:content (medium="image")
    if (!itemImage) {
      const mediaContentImage = item.querySelector('media\\:content[medium="image"]')
      if (mediaContentImage) {
        itemImage = mediaContentImage.getAttribute('url') || ''
      }
    }
    
    // 方法4: 如果单集没有图片，使用播客的图片
    if (!itemImage) {
      itemImage = image
    }
    
    return {
      id: itemGuid,
      title: itemTitle,
      description: itemDescription,
      pubDate: pubDate ? new Date(pubDate).getTime() / 1000 : null,
      duration,
      audioUrl,
      image: itemImage,
      link: itemLink,
    }
  })
  
  return {
    title,
    description,
    link,
    image,
    author,
    language,
    items,
  }
}

/**
 * 解析 RSS Feed（带缓存）
 * @param {string} url RSS Feed URL
 * @param {boolean} forceRefresh 强制刷新，忽略缓存
 * @returns {Promise} 解析后的播客数据
 */
export const parseRSS = async (url, forceRefresh = false) => {
  // 优先从缓存读取（除非强制刷新）
  if (!forceRefresh) {
    const cached = getCachedData(url)
    if (cached) {
      // 检查标题是否包含乱码（简单检查：如果包含非ASCII字符但不包含常见的中文字符范围）
      // 乱码通常表现为类似 "åæ ¸æä¸" 这样的字符组合
      if (cached.title && /[^\x00-\x7F]/.test(cached.title)) {
        // 包含非ASCII字符，检查是否包含常见的中文字符
        const hasChineseChars = /[\u4e00-\u9fa5]/.test(cached.title)
        if (!hasChineseChars) {
          // 可能是乱码，强制刷新
          if (import.meta.env.DEV) {
            console.log(`⚠️ 检测到可能的乱码，清除缓存并重新加载: ${cached.title}`)
          }
          // 清除这个URL的缓存
          try {
            const cache = getCache()
            delete cache[url]
            localStorage.setItem(RSS_CACHE_KEY, JSON.stringify(cache))
          } catch (e) {
            // 忽略清除缓存的错误
          }
          // 继续执行，重新获取
        } else {
          // 包含中文字符，应该是正常的，使用缓存
          if (import.meta.env.DEV) {
            console.log(`✅ 从缓存加载: ${cached.title}`)
          }
          return cached
        }
      } else {
        // 纯ASCII或空标题，使用缓存
        if (import.meta.env.DEV) {
          console.log(`✅ 从缓存加载: ${cached.title || url}`)
        }
        return cached
      }
    }
  }
  
  try {
    const xmlText = await fetchRSS(url)
    const feed = parseRSSXML(xmlText)
    
    // 标准化数据格式
    const result = {
      id: feed.link || url,
      title: feed.title || '未知播客',
      description: feed.description || '',
      author: feed.author || '',
      image: feed.image || '',
      link: feed.link || url,
      language: feed.language || 'zh',
      episodes: feed.items || [],
    }
    
    // 保存到缓存
    setCache(url, result)
    
    return result
  } catch (error) {
    // 如果解析失败，尝试从缓存读取旧数据（即使过期）
    const cache = getCache()
    const staleCache = cache[url]
    if (staleCache?.data) {
      if (import.meta.env.DEV) {
        console.warn(`⚠️ RSS 解析失败，使用缓存数据: ${url}`, error.message)
      }
      return staleCache.data
    }
    
    // 仅在开发环境下输出详细错误日志（但不包括已知的无法访问的RSS）
    if (import.meta.env.DEV) {
      // 对于HTML页面错误，减少日志输出（这些是预期的）
      if (!error.message.includes('HTML 页面')) {
        console.error('RSS 解析失败:', error)
      }
    }
    throw new Error(`无法解析 RSS Feed: ${error.message}`)
  }
}

/**
 * 解析时长字符串（如 "01:23:45" 或 "83:45" 或 "83"）
 * @param {string} durationStr 时长字符串
 * @returns {number} 秒数
 */
function parseDuration(durationStr) {
  if (!durationStr) return 0
  
  const parts = durationStr.split(':').map(Number).reverse()
  let seconds = 0
  
  if (parts.length >= 1) seconds += parts[0] || 0
  if (parts.length >= 2) seconds += (parts[1] || 0) * 60
  if (parts.length >= 3) seconds += (parts[2] || 0) * 3600
  
  return seconds
}

/**
 * 验证 RSS URL 是否有效
 * @param {string} url RSS URL
 * @returns {Promise<boolean>}
 */
export const validateRSSUrl = async (url) => {
  try {
    const xmlText = await fetchRSS(url)
    const feed = parseRSSXML(xmlText)
    return !!feed.title
  } catch {
    return false
  }
}

/**
 * 获取热门播客 RSS 列表（示例）
 * 实际项目中可以从配置文件或 API 获取
 */
export const getPopularRSSFeeds = () => {
  return [
    // 中文播客（仅保留可通过代理访问的）
    // 注意：许多中文播客的 RSS Feed 可能无法通过 CORS 代理访问
    // 如果某个播客无法加载，您可以在搜索页面手动添加其他可用的 RSS Feed
    // 
    // 由于CORS限制，许多中文播客平台的RSS Feed无法通过代理访问
    // 建议用户直接在搜索页面手动添加可用的RSS链接
    // 
    // 以下保留一些可能可以访问的中文播客（如果无法访问会自动跳过）
    // 注意：由于CORS限制，许多中文播客的RSS Feed无法通过浏览器代理访问
    // 如果某个RSS无法访问，系统会自动跳过，不会影响其他播客的显示
    
    {
      title: '博物志',
      rssUrl: 'https://bowuzhi.fm/episodes/feed.xml',
      description: '博物馆和文化类播客',
    },
    {
      title: '内核恐慌',
      rssUrl: 'https://pan.icu/feed',
      description: '一档号称硬核却没什么干货的信息技术主题娱乐节目',
    },
    {
      title: 'IT公论',
      rssUrl: 'https://itgonglun.com/feed',
      description: 'IT公论播客',
    },
    {
      title: 'Teahour',
      rssUrl: 'https://feeds.fireside.fm/teahour/rss',
      description: '聚焦于程序、创业以及一切 Geek 话题的中文播客',
    },
    
    // 注意：getpodcast.xyz 的RSS链接格式需要通过实际测试确认
    // 由于无法确认确切的URL格式，暂时不添加，避免大量无法访问的链接
    // 用户可以访问 https://getpodcast.xyz/ 查找具体播客的RSS链接，然后在搜索页面手动添加
    
    // 注意：许多中文播客平台（如喜马拉雅、小宇宙、荔枝FM等）的RSS Feed
    // 都有严格的CORS限制，无法通过浏览器代理访问
    // 建议用户在播客的官方网站查找RSS链接，或使用其他播客平台
    // 更多中文播客RSS链接可访问: https://getpodcast.xyz/
    // 英文播客
    {
      title: 'NPR News Now',
      rssUrl: 'https://feeds.npr.org/500005/podcast.xml',
      description: 'The latest news in five minutes. Updated hourly.',
    },
    {
      title: 'How I Built This',
      rssUrl: 'https://feeds.npr.org/510313/podcast.xml',
      description: 'NPR采访创业者和企业家',
    },
    {
      title: 'Fresh Air',
      rssUrl: 'https://feeds.npr.org/381444908/podcast.xml',
      description: 'NPR深度访谈节目',
    },
    {
      title: 'The Indicator from Planet Money',
      rssUrl: 'https://feeds.npr.org/510325/podcast.xml',
      description: 'NPR经济类访谈播客',
    },
    {
      title: 'TED Radio Hour',
      rssUrl: 'https://feeds.npr.org/510298/podcast.xml',
      description: 'NPR和TED合作的访谈节目',
    },
    {
      title: 'Freakonomics Radio',
      rssUrl: 'https://feeds.feedburner.com/freakonomicsradio',
      description: '探索隐藏的经济学原理',
    },
    {
      title: 'Wait Wait... Don\'t Tell Me!',
      rssUrl: 'https://feeds.npr.org/344098539/podcast.xml',
      description: 'NPR的新闻问答访谈节目',
    },
  ]
}

/**
 * 搜索播客 RSS（通过播客搜索引擎）
 * 注意：这是一个简化版本，实际需要使用播客搜索 API
 */
export const searchPodcasts = async (keyword) => {
  // 这里可以集成播客搜索 API，比如：
  // - Podcast Index API
  // - Listen Notes API
  // - Apple Podcasts API
  
  // 目前返回示例数据
  const popularFeeds = getPopularRSSFeeds()
  return popularFeeds.filter(feed => 
    feed.title.toLowerCase().includes(keyword.toLowerCase()) ||
    feed.description.toLowerCase().includes(keyword.toLowerCase())
  )
}

export default {
  parseRSS,
  validateRSSUrl,
  getPopularRSSFeeds,
  searchPodcasts,
}


