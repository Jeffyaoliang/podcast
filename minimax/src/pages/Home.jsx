import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, Clock, Heart, Plus, X } from 'lucide-react'
import { getPopularRSSFeeds, parseRSS } from '../services/rssService'
import useRSSStore from '../store/rssStore'
import { stripHTML } from '../utils/helpers'

export default function Home() {
  const [featured, setFeatured] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const { subscriptions: rssSubscriptions, addRecentFeed, recentFeeds, blacklist } = useRSSStore()

  useEffect(() => {
    let cancelled = false
    
    const loadDataAsync = async () => {
      if (cancelled) return
      await loadData()
    }
    
    loadDataAsync()
    
    return () => {
      cancelled = true
    }
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // 加载热门 RSS 播客
      const popularFeeds = getPopularRSSFeeds()
      
      // 过滤掉黑名单中的播客
      const filteredFeeds = popularFeeds.filter(feed => !blacklist.includes(feed.rssUrl))
      
      // 先从 recentFeeds 缓存中提取图片信息（如果存在）
      const feedsWithCache = filteredFeeds.map(feed => {
        const cached = recentFeeds.find(rf => rf.rssUrl === feed.rssUrl)
        if (cached && cached.image) {
          return {
            ...feed,
            image: cached.image,
            title: cached.title || feed.title,
            description: cached.description || feed.description,
            author: cached.author || feed.author,
          }
        }
        // 如果feed本身有image属性（备用图片URL），使用它
        // 这样可以确保即使RSS Feed中没有图片，也能显示备用图片
        return {
          ...feed,
          image: feed.image || '', // 保留feed中定义的备用图片
        }
      })
      
      // 先显示列表（包含缓存数据），不阻塞页面加载
      setFeatured(feedsWithCache)
      setLoading(false)
      
      // 只异步加载前2个没有缓存的播客封面图（进一步减少网络请求）
      // 如果recentFeeds中已经有图片，完全跳过网络请求
      const feedsToLoad = popularFeeds.slice(0, 2).filter(feed => {
        const cached = recentFeeds.find(rf => rf.rssUrl === feed.rssUrl)
        // 只有当完全没有缓存或者缓存中没有图片时才加载
        return !cached || !cached.image
      })
      const batchSize = 1 // 进一步减少批次大小，一次只加载一个
      
      for (let i = 0; i < feedsToLoad.length; i += batchSize) {
        const batch = feedsToLoad.slice(i, i + batchSize)
        const batchPromises = batch.map(async (feed) => {
          try {
            // 增加超时控制到8秒，给RSS解析更多时间获取封面图
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('加载超时')), 8000)
            )
            
            const podcast = await Promise.race([parseRSS(feed.rssUrl), timeoutPromise])
            const result = {
              ...feed,
              // 优先使用RSS Feed中的图片
              image: podcast.image || feed.image || '',
              author: podcast.author || feed.author || '',
              title: podcast.title || feed.title,
              description: podcast.description || feed.description || '',
            }
            // 保存到 recentFeeds（用于下次快速显示封面图）
            if (result.image) {
              addRecentFeed({
                rssUrl: feed.rssUrl,
                title: result.title,
                description: result.description,
                image: result.image,
                author: result.author,
              })
            }
            // 静默处理，不输出日志（减少控制台噪音）
            return result
          } catch (error) {
            // 解析失败时保留原始数据（无图片），静默处理
            // 不输出错误日志，避免控制台噪音（这些错误是预期的，因为某些RSS无法访问）
            return {
              ...feed,
              image: '',
              author: feed.author || '',
            }
          }
        })
        
        const batchResults = await Promise.allSettled(batchPromises)
        const validResults = batchResults
          .filter(result => result.status === 'fulfilled' && result.value)
          .map(result => result.value)
        
        // 更新已加载的播客
        if (validResults.length > 0) {
          setFeatured(prev => {
            const updated = [...prev]
            validResults.forEach(result => {
              const index = updated.findIndex(f => f.rssUrl === result.rssUrl)
              if (index !== -1) {
                updated[index] = result
              }
            })
            return updated
          })
        }
        
        // 批次之间稍作延迟，避免过于频繁的更新
        if (i + batchSize < feedsToLoad.length) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }
      
      // 异步加载用户订阅的播客（只加载没有缓存的，最多1个，进一步减少加载）
      if (rssSubscriptions.length > 0) {
        const subsToLoad = rssSubscriptions.slice(0, 1).filter(sub => {
          const cached = recentFeeds.find(rf => rf.rssUrl === sub.rssUrl)
          return !cached || !cached.image
        })
        
        if (subsToLoad.length > 0) {
          Promise.allSettled(
            subsToLoad.map(sub => 
              Promise.race([
                parseRSS(sub.rssUrl),
                new Promise((_, reject) => setTimeout(() => reject(new Error('加载超时')), 3000))
              ]).then(podcast => ({
                ...podcast,
                rssUrl: sub.rssUrl, // 保留原始 RSS URL 用于链接
              })).catch(() => null)
            )
          ).then(parsedSubs => {
            const validSubs = parsedSubs
              .filter(result => result.status === 'fulfilled' && result.value)
              .map(result => result.value)
            if (validSubs.length > 0) {
              setSubscriptions(prev => {
                // 合并新加载的和已有的（包含缓存）
                const existingSubs = rssSubscriptions
                  .filter(sub => {
                    const cached = recentFeeds.find(rf => rf.rssUrl === sub.rssUrl)
                    return cached && cached.image
                  })
                  .map(sub => {
                    const cached = recentFeeds.find(rf => rf.rssUrl === sub.rssUrl)
                    return {
                      rssUrl: sub.rssUrl,
                      title: cached.title,
                      description: cached.description,
                      image: cached.image,
                      author: cached.author,
                    }
                  })
                return [...validSubs, ...existingSubs].slice(0, rssSubscriptions.length)
              })
            }
          }).catch(error => {
            console.error('加载订阅失败:', error)
          })
        } else {
          // 如果所有订阅都有缓存，直接使用缓存数据
          const cachedSubs = rssSubscriptions
            .map(sub => {
              const cached = recentFeeds.find(rf => rf.rssUrl === sub.rssUrl)
              if (cached && cached.image) {
                return {
                  rssUrl: sub.rssUrl,
                  title: cached.title,
                  description: cached.description,
                  image: cached.image,
                  author: cached.author,
                }
              }
              return null
            })
            .filter(Boolean)
          if (cachedSubs.length > 0) {
            setSubscriptions(cachedSubs)
          }
        }
      }
    } catch (error) {
      console.error('加载数据失败:', error)
      setLoading(false)
    }
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '--:--'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`
  }

  const PodcastCard = ({ podcast }) => {
    const [imageError, setImageError] = useState(false)
    const [imageLoading, setImageLoading] = useState(true)
    const { addToBlacklist, isBlacklisted } = useRSSStore()
    
    // 支持RSS播客（有rssUrl）和普通播客
    const linkUrl = podcast.rssUrl 
      ? `/rss/${encodeURIComponent(podcast.rssUrl)}`
      : `/show/${podcast.id || podcast.show_id}`
    
    const imageUrl = podcast.image || podcast.cover
    
    // 获取播客标题用于生成占位图
    const podcastTitle = podcast.title || podcast.name || '播客'
    
    // 生成 ui-avatars 备用图片
    const fallbackImageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(podcastTitle)}&background=6366f1&color=fff&size=200&bold=true&font-size=0.4&length=2`
    
    const handleBlacklist = (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (podcast.rssUrl && confirm(`确定要拉黑"${podcast.title || podcast.name}"吗？拉黑后该播客将不再出现在列表中。`)) {
        addToBlacklist(podcast.rssUrl)
        alert('已拉黑该播客')
      }
    }
    
    return (
      <div className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden relative">
        <Link
          to={linkUrl}
          className="block"
        >
        <div className="relative aspect-square bg-gray-100 overflow-hidden">
          {/* 占位符背景层 - 当图片加载失败或没有图片时显示首字母头像 */}
          <div className={`w-full h-full flex items-center justify-center absolute inset-0 ${imageUrl && !imageError && !imageLoading ? 'hidden' : ''}`}>
            {imageError || !imageUrl ? (
              <img
                src={fallbackImageUrl}
                alt={podcastTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center`}>
                <Play className="h-12 w-12 text-primary-600 opacity-50" />
              </div>
            )}
          </div>
          {/* 图片前景层 - 只有当有图片且没有错误且加载完成时才显示 */}
          {imageUrl && !imageError && (
            <img
              src={imageUrl}
              alt={podcast.title || podcast.name}
              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
              onError={() => setImageError(true)}
              onLoad={() => setImageLoading(false)}
              loading="lazy"
            />
          )}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center pointer-events-none">
            <Play className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1">
            {podcast.title || podcast.name}
          </h3>
          {podcast.author && (
            <p className="text-sm text-gray-500 mb-2">{podcast.author}</p>
          )}
          {podcast.description && (
            <p className="text-xs text-gray-500 line-clamp-2">{stripHTML(podcast.description)}</p>
          )}
        </div>
        </Link>
        {/* 拉黑按钮 - 仅对RSS播客显示 */}
        {podcast.rssUrl && (
          <button
            onClick={handleBlacklist}
            className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
            title="拉黑此播客"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        )}
      </div>
    )
  }

  const EpisodeCard = ({ episode }) => (
    <Link
      to={`/episode/${episode.id || episode.episode_id}`}
      className="flex bg-white rounded-lg p-4 hover:shadow-md transition-shadow gap-4"
    >
      <div className="relative w-24 h-24 flex-shrink-0 rounded-lg bg-gray-100 overflow-hidden">
        <img
          src={episode.cover || episode.image || '/placeholder.png'}
          alt={episode.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3C/svg%3E'
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 line-clamp-2 mb-1">
          {episode.title}
        </h4>
        {episode.show && (
          <p className="text-sm text-gray-500 mb-2">{episode.show.title}</p>
        )}
        <div className="flex items-center space-x-3 text-xs text-gray-400">
          {episode.duration && (
            <span className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {formatDuration(episode.duration)}
            </span>
          )}
          {episode.pub_date && (
            <span>{new Date(episode.pub_date * 1000).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </Link>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          听播客，上DreamEcho
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          发现更多精彩内容
        </p>
        <Link
          to="/search"
          className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          <Play className="h-5 w-5 mr-2" />
          开始探索
        </Link>
      </section>

      {/* 热门播客 */}
      {featured.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">热门播客</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {featured.map((feed) => (
              <Link
                key={feed.rssUrl}
                to={`/rss/${encodeURIComponent(feed.rssUrl)}`}
                className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="relative aspect-square bg-gray-100 overflow-hidden">
                  {feed.image ? (
                    <>
                      <img
                        src={feed.image}
                        alt={feed.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          // 图片加载失败时，使用默认占位图片
                          if (feed.image && !feed.image.includes('placeholder')) {
                            // 使用一个美观的占位图片服务
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(feed.title)}&background=6366f1&color=fff&size=300&bold=true&font-size=0.4`
                          }
                        }}
                        onLoad={() => {
                          // 静默处理，不输出日志
                        }}
                        loading="eager"
                      />
                      {/* 占位符（默认隐藏，图片加载失败时显示） */}
                      <div className="w-full h-full hidden items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200 absolute inset-0">
                        <Play className="h-12 w-12 text-primary-600 opacity-50" />
                      </div>
                    </>
                  ) : (
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(feed.title)}&background=6366f1&color=fff&size=300&bold=true&font-size=0.4`}
                      alt={feed.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center pointer-events-none">
                    <Play className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1">
                    {feed.title}
                  </h3>
                  {feed.author && (
                    <p className="text-sm text-gray-500 mb-2">{feed.author}</p>
                  )}
                  {feed.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {stripHTML(feed.description)}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 我的订阅 */}
      {subscriptions.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">我的订阅</h2>
            <Link
              to="/subscriptions"
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              查看全部
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {subscriptions.map((podcast) => (
              <PodcastCard key={podcast.rssUrl || podcast.id || podcast.show_id} podcast={podcast} />
            ))}
          </div>
        </section>
      )}

      {/* 无内容提示 */}
      {!loading && featured.length === 0 && subscriptions.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg p-8">
          <p className="text-gray-500 mb-4">
            暂无内容
          </p>
          <Link
            to="/search"
            className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            探索播客
          </Link>
        </div>
      )}
    </div>
  )
}

