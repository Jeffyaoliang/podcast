import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Play, Clock, Heart, Plus, Check, MessageCircle } from 'lucide-react'
import { podcastAPI, userAPI } from '../services/api'
import useAuthStore from '../store/authStore'

export default function Show() {
  const { id } = useParams()
  const [show, setShow] = useState(null)
  const [episodes, setEpisodes] = useState([])
  const [popularEpisodes, setPopularEpisodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [subscribed, setSubscribed] = useState(false)
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (id) {
      loadShowData()
    }
  }, [id])

  const loadShowData = async () => {
    try {
      setLoading(true)
      const [showRes, episodesRes, popularRes] = await Promise.all([
        podcastAPI.getShow(id).catch(() => ({ data: { data: null } })),
        podcastAPI.getShowEpisodes(id, 1, 20).catch(() => ({ data: { data: [] } })),
        podcastAPI.getPopularEpisodes(id, 10).catch(() => ({ data: { data: [] } })),
      ])
      
      setShow(showRes.data.data)
      setEpisodes(episodesRes.data.data || [])
      setPopularEpisodes(popularRes.data.data || [])
    } catch (error) {
      console.error('加载节目数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      alert('请先登录')
      return
    }

    try {
      if (subscribed) {
        await userAPI.unsubscribe(id)
        setSubscribed(false)
      } else {
        await userAPI.subscribe(id)
        setSubscribed(true)
      }
    } catch (error) {
      console.error('订阅操作失败:', error)
      alert('操作失败，请重试')
    }
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '--:--'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!show) {
    return (
      <div className="text-center py-12 text-gray-500">
        节目不存在
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Show Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-48 h-48 md:w-64 md:h-64 flex-shrink-0 rounded-xl bg-gray-100 overflow-hidden">
            <img
              src={show.cover || show.image || '/placeholder.png'}
              alt={show.title || show.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {show.title || show.name}
            </h1>
            {show.author && (
              <p className="text-lg text-gray-600 mb-4">作者：{show.author}</p>
            )}
            {show.description && (
              <p className="text-gray-700 mb-6 line-clamp-4">{show.description}</p>
            )}
            <div className="flex items-center space-x-4 mb-6">
              {show.stats && (
                <>
                  {show.stats.subscribed && (
                    <div className="flex items-center text-gray-600">
                      <Heart className="h-5 w-5 mr-2" />
                      <span>{show.stats.subscribed} 订阅</span>
                    </div>
                  )}
                  {show.stats.episodes && (
                    <div className="flex items-center text-gray-600">
                      <Play className="h-5 w-5 mr-2" />
                      <span>{show.stats.episodes} 集</span>
                    </div>
                  )}
                </>
              )}
            </div>
            {isAuthenticated && (
              <button
                onClick={handleSubscribe}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                  subscribed
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {subscribed ? (
                  <>
                    <Check className="h-5 w-5" />
                    <span>已订阅</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    <span>订阅</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Popular Episodes */}
      {popularEpisodes.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">最受欢迎</h2>
          <div className="space-y-3">
            {popularEpisodes.map((episode) => (
              <Link
                key={episode.id || episode.episode_id}
                to={`/episode/${episode.id || episode.episode_id}`}
                className="flex bg-white rounded-lg p-4 hover:shadow-md transition-shadow gap-4"
              >
                <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-gray-100 overflow-hidden">
                  <img
                    src={episode.cover || episode.image || '/placeholder.png'}
                    alt={episode.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
                    {episode.title}
                  </h3>
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
                    {episode.comment_count && (
                      <span className="flex items-center">
                        <MessageCircle className="h-3 w-3 mr-1" />
                        {episode.comment_count}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* All Episodes */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">全部单集</h2>
        <div className="space-y-3">
          {episodes.map((episode) => (
            <Link
              key={episode.id || episode.episode_id}
              to={`/episode/${episode.id || episode.episode_id}`}
              className="flex bg-white rounded-lg p-4 hover:shadow-md transition-shadow gap-4"
            >
              <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-gray-100 overflow-hidden">
                <img
                  src={episode.cover || episode.image || '/placeholder.png'}
                  alt={episode.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
                  {episode.title}
                </h3>
                {episode.description && (
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {episode.description}
                  </p>
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
          ))}
        </div>
        {episodes.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            暂无单集
          </div>
        )}
      </section>
    </div>
  )
}

