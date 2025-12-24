import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { X, Play, RotateCcw } from 'lucide-react'
import useRSSStore from '../store/rssStore'
import { parseRSS } from '../services/rssService'
import { stripHTML } from '../utils/helpers'

export default function Blacklist() {
  const { blacklist, removeFromBlacklist, recentFeeds } = useRSSStore()
  const [blacklistedPodcasts, setBlacklistedPodcasts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBlacklistedPodcasts()
  }, [blacklist])

  const loadBlacklistedPodcasts = async () => {
    try {
      setLoading(true)
      
      // 从缓存中获取黑名单播客信息
      const podcasts = blacklist.map(rssUrl => {
        const cached = recentFeeds.find(rf => rf.rssUrl === rssUrl)
        if (cached) {
          return {
            rssUrl,
            title: cached.title,
            description: cached.description,
            image: cached.image,
            author: cached.author,
          }
        }
        return { rssUrl, title: rssUrl, description: '', image: '', author: '' }
      })
      
      setBlacklistedPodcasts(podcasts)
      
      // 对于没有缓存的播客，尝试加载
      const urlsToLoad = blacklist.filter(rssUrl => 
        !recentFeeds.find(rf => rf.rssUrl === rssUrl)
      )
      
      if (urlsToLoad.length > 0) {
        // 只加载前5个，避免过多请求
        const toLoad = urlsToLoad.slice(0, 5)
        const loaded = await Promise.allSettled(
          toLoad.map(async (rssUrl) => {
            try {
              const data = await parseRSS(rssUrl)
              return {
                rssUrl,
                title: data.title,
                description: data.description,
                image: data.image,
                author: data.author,
              }
            } catch (error) {
              return {
                rssUrl,
                title: rssUrl,
                description: '',
                image: '',
                author: '',
              }
            }
          })
        )
        
        const validPodcasts = loaded
          .filter(result => result.status === 'fulfilled')
          .map(result => result.value)
        
        setBlacklistedPodcasts(prev => {
          const existing = prev.map(p => p.rssUrl)
          const newPodcasts = validPodcasts.filter(p => !existing.includes(p.rssUrl))
          return [...prev, ...newPodcasts]
        })
      }
    } catch (error) {
      console.error('加载黑名单播客失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFromBlacklist = (rssUrl, title) => {
    if (confirm(`确定要从黑名单移除"${title || rssUrl}"吗？移除后该播客将重新出现在列表中。`)) {
      removeFromBlacklist(rssUrl)
      setBlacklistedPodcasts(prev => prev.filter(p => p.rssUrl !== rssUrl))
      alert('已从黑名单移除')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">黑名单管理</h1>
        <p className="text-gray-600 mt-2">
          {blacklist.length > 0 
            ? `共 ${blacklist.length} 个被拉黑的播客` 
            : '当前没有拉黑的播客'}
        </p>
      </div>

      {blacklistedPodcasts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {blacklistedPodcasts.map((podcast) => {
            const imageUrl = podcast.image
            const showImage = imageUrl
            
            return (
              <div
                key={podcast.rssUrl}
                className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden relative"
              >
                <Link to={`/rss/${encodeURIComponent(podcast.rssUrl)}`}>
                  <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden flex items-center justify-center">
                    {showImage ? (
                      <img
                        src={imageUrl}
                        alt={podcast.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.style.display = 'none'
                          if (e.target.parentElement) {
                            e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="h-16 w-16 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"/></svg></div>'
                          }
                        }}
                        loading="lazy"
                      />
                    ) : (
                      <Play className="h-16 w-16 text-gray-400" />
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center pointer-events-none">
                      <Play className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1">
                      {podcast.title}
                    </h3>
                    {podcast.author && (
                      <p className="text-sm text-gray-500 mb-2">{podcast.author}</p>
                    )}
                    {podcast.description && (
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {stripHTML(podcast.description)}
                      </p>
                    )}
                  </div>
                </Link>
                {/* 移除黑名单按钮 */}
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleRemoveFromBlacklist(podcast.rssUrl, podcast.title)
                  }}
                  className="absolute top-2 right-2 p-2 bg-green-600 hover:bg-green-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  title="从黑名单移除"
                >
                  <RotateCcw className="h-4 w-4 text-white" />
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg p-8">
          <X className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">
            当前没有拉黑的播客
          </p>
          <Link
            to="/search"
            className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            去搜索播客
          </Link>
        </div>
      )}
    </div>
  )
}

