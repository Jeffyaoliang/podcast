import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Rss, Trash2, Play } from 'lucide-react'
import useRSSStore from '../store/rssStore'

export default function Subscriptions() {
  const { subscriptions, removeSubscription, recentFeeds } = useRSSStore()
  const [loading, setLoading] = useState(false)
  
  // 从缓存中获取图片信息
  const getSubscriptionWithImage = (sub) => {
    const cached = recentFeeds.find(rf => rf.rssUrl === sub.rssUrl)
    if (cached && cached.image) {
      return {
        ...sub,
        image: cached.image,
        title: cached.title || sub.title,
        description: cached.description || sub.description,
        author: cached.author || sub.author,
      }
    }
    return sub
  }

  useEffect(() => {
    // RSS订阅存储在localStorage中，不需要加载
    setLoading(false)
  }, [])

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
        <h1 className="text-3xl font-bold text-gray-900">我的订阅</h1>
        <p className="text-gray-600 mt-2">{subscriptions.length} 个播客</p>
      </div>

      {subscriptions.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {subscriptions.map((sub) => {
            const subWithImage = getSubscriptionWithImage(sub)
            return (
            <div
              key={sub.rssUrl}
              className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden relative"
            >
              <Link to={`/rss/${encodeURIComponent(sub.rssUrl)}`}>
                <div className="relative aspect-square bg-gradient-to-br from-primary-100 to-primary-200 overflow-hidden flex items-center justify-center">
                  {subWithImage.image ? (
                    <img
                      src={subWithImage.image}
                      alt={subWithImage.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        if (e.target.parentElement) {
                          e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="h-16 w-16 text-primary-600" fill="currentColor" viewBox="0 0 20 20"><path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"/></svg></div>'
                        }
                      }}
                      loading="lazy"
                    />
                  ) : (
                    <Play className="h-16 w-16 text-primary-600" />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1">
                    {subWithImage.title}
                  </h3>
                  {subWithImage.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {subWithImage.description}
                    </p>
                  )}
                </div>
              </Link>
              <button
                onClick={() => {
                  if (confirm('确定要取消订阅吗？')) {
                    removeSubscription(sub.rssUrl)
                  }
                }}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                title="取消订阅"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg">
          <Rss className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">还没有订阅任何播客</p>
          <Link
            to="/search"
            className="inline-block mt-4 text-primary-600 hover:text-primary-700 font-medium"
          >
            去发现精彩内容 →
          </Link>
        </div>
      )}
    </div>
  )
}

