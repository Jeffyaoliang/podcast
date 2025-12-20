import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search as SearchIcon, Rss, Plus, Check, Play } from 'lucide-react'
import { searchPodcasts, getPopularRSSFeeds, validateRSSUrl } from '../services/rssService'
import useRSSStore from '../store/rssStore'

export default function Search() {
  const [keyword, setKeyword] = useState('')
  const [rssUrl, setRssUrl] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)
  const searchInputRef = useRef(null)
  const rssInputRef = useRef(null)
  const { addSubscription, subscriptions, recentFeeds } = useRSSStore()
  const navigate = useNavigate()

  // 从缓存中获取图片信息的辅助函数
  const enrichFeedsWithCache = (feeds) => {
    return feeds.map(feed => {
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
      return feed
    })
  }

  useEffect(() => {
    // 加载热门播客作为默认结果，并从缓存中获取图片信息
    const popularFeeds = getPopularRSSFeeds()
    setResults(enrichFeedsWithCache(popularFeeds))
  }, [recentFeeds])

  const handleSearch = async (searchKeyword = keyword) => {
    if (!searchKeyword.trim()) {
      const popularFeeds = getPopularRSSFeeds()
      setResults(enrichFeedsWithCache(popularFeeds))
      return
    }

    try {
      setLoading(true)
      const searchResults = await searchPodcasts(searchKeyword)
      const results = searchResults.length > 0 ? searchResults : getPopularRSSFeeds()
      setResults(enrichFeedsWithCache(results))
    } catch (error) {
      console.error('搜索失败:', error)
      const popularFeeds = getPopularRSSFeeds()
      setResults(enrichFeedsWithCache(popularFeeds))
    } finally {
      setLoading(false)
    }
  }

  const handleAddRSS = async () => {
    if (!rssUrl.trim()) {
      alert('请输入 RSS 链接')
      return
    }

    try {
      setValidating(true)
      const isValid = await validateRSSUrl(rssUrl)
      if (isValid) {
        // 解析 RSS 获取基本信息
        const { parseRSS } = await import('../services/rssService')
        const podcast = await parseRSS(rssUrl)
        addSubscription({
          rssUrl,
          title: podcast.title,
          description: podcast.description,
          image: podcast.image,
        })
        alert('订阅成功！')
        setRssUrl('')
        navigate(`/rss/${encodeURIComponent(rssUrl)}`)
      } else {
        alert('无效的 RSS 链接，请检查后重试')
      }
    } catch (error) {
      console.error('添加 RSS 失败:', error)
      alert('无法验证 RSS 链接: ' + error.message)
    } finally {
      setValidating(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* RSS 订阅输入 */}
      <div className="mb-8 bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Rss className="h-5 w-5 mr-2 text-primary-600" />
          添加 RSS 订阅
        </h3>
        <div className="flex gap-3">
          <input
            ref={rssInputRef}
            type="text"
            value={rssUrl}
            onChange={(e) => setRssUrl(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddRSS()}
            placeholder="输入 RSS 链接，例如：https://example.com/podcast.rss"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
          <button
            onClick={handleAddRSS}
            disabled={validating}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
          >
            {validating ? '验证中...' : (
              <>
                <Plus className="h-5 w-5 mr-2" />
                添加
              </>
            )}
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          提示：大多数播客网站都提供 RSS 链接，通常在页面底部或设置中可以找到
        </p>
      </div>

      {/* 搜索框 */}
      <div className="mb-8">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索热门播客..."
            className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:outline-none"
          />
          <button
            onClick={() => handleSearch()}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            搜索
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-6">
          <div className="text-sm text-gray-600">
            找到 {results.length} 个播客
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((feed) => {
              const isSubscribed = subscriptions.some(sub => sub.rssUrl === feed.rssUrl)
              return (
                <div
                  key={feed.rssUrl}
                  className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 overflow-hidden flex items-center justify-center">
                      {feed.image ? (
                        <img
                          src={feed.image}
                          alt={feed.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            if (e.target.parentElement) {
                              e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="h-10 w-10 text-primary-600" fill="currentColor" viewBox="0 0 20 20"><path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"/></svg></div>'
                            }
                          }}
                          loading="lazy"
                        />
                      ) : (
                        <Play className="h-10 w-10 text-primary-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <Link
                          to={`/rss/${encodeURIComponent(feed.rssUrl)}`}
                          className="flex-1"
                        >
                          <h3 className="font-semibold text-gray-900 line-clamp-2 hover:text-primary-600">
                            {feed.title}
                          </h3>
                        </Link>
                        {isSubscribed && (
                          <Check className="h-5 w-5 text-green-500 flex-shrink-0 ml-2" />
                        )}
                      </div>
                      {feed.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                          {feed.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/rss/${encodeURIComponent(feed.rssUrl)}`}
                          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                          查看详情
                        </Link>
                        {!isSubscribed && (
                          <button
                            onClick={() => {
                              addSubscription(feed)
                              alert('订阅成功！')
                            }}
                            className="text-sm text-gray-600 hover:text-primary-600"
                          >
                            订阅
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!loading && keyword && results.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-gray-500 mb-2">没有找到相关结果</p>
          <p className="text-sm text-gray-400">
            试试直接输入 RSS 链接添加订阅
          </p>
        </div>
      )}

      {!loading && !keyword && results.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          输入关键词开始搜索
        </div>
      )}
    </div>
  )
}
