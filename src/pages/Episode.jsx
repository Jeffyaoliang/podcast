import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Play, Clock, MessageCircle, Heart, Share2 } from 'lucide-react'
import { podcastAPI, commentAPI } from '../services/api'
import useAuthStore from '../store/authStore'

export default function Episode() {
  const { id } = useParams()
  const [episode, setEpisode] = useState(null)
  const [comments, setComments] = useState([])
  const [audioUrl, setAudioUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (id) {
      loadEpisodeData()
    }
  }, [id])

  const loadEpisodeData = async () => {
    try {
      setLoading(true)
      const [episodeRes, commentsRes, audioRes] = await Promise.all([
        podcastAPI.getEpisode(id).catch(() => ({ data: { data: null } })),
        commentAPI.getComments(id).catch(() => ({ data: { data: [] } })),
        podcastAPI.getAudio(id).catch(() => ({ data: { data: null } })),
      ])

      setEpisode(episodeRes.data.data)
      setComments(commentsRes.data.data || [])
      setAudioUrl(audioRes.data.data?.url || audioRes.data.data?.audio_url)
    } catch (error) {
      console.error('加载单集数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleComment = async () => {
    if (!isAuthenticated) {
      alert('请先登录')
      return
    }

    if (!commentText.trim()) {
      return
    }

    try {
      await commentAPI.createComment(id, commentText)
      setCommentText('')
      loadEpisodeData()
    } catch (error) {
      console.error('发表评论失败:', error)
      alert('发表失败，请重试')
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

  if (!episode) {
    return (
      <div className="text-center py-12 text-gray-500">
        单集不存在
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Episode Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          <div className="w-48 h-48 md:w-64 md:h-64 flex-shrink-0 rounded-xl bg-gray-100 overflow-hidden">
            <img
              src={episode.cover || episode.image || '/placeholder.png'}
              alt={episode.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <Link
              to={episode.show ? `/show/${episode.show.id || episode.show.show_id}` : '#'}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium mb-2 inline-block"
            >
              {episode.show?.title || episode.show?.name}
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {episode.title}
            </h1>
            <div className="flex items-center space-x-4 text-gray-600 mb-4">
              {episode.duration && (
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  <span>{formatDuration(episode.duration)}</span>
                </div>
              )}
              {episode.pub_date && (
                <span>{new Date(episode.pub_date * 1000).toLocaleDateString()}</span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                <Play className="h-5 w-5" />
                <span>{isPlaying ? '暂停' : '播放'}</span>
              </button>
              <button className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Share2 className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Audio Player */}
        {audioUrl && (
          <div className="mt-6">
            <audio
              src={audioUrl}
              controls
              className="w-full"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </div>
        )}

        {/* Description */}
        {episode.description && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">简介</h3>
            <p className="text-gray-700 whitespace-pre-line">{episode.description}</p>
          </div>
        )}
      </div>

      {/* Comments */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <MessageCircle className="h-6 w-6 mr-2" />
            评论 {comments.length > 0 && `(${comments.length})`}
          </h2>
        </div>

        {isAuthenticated && (
          <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="写下你的想法..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none resize-none"
              rows="4"
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={handleComment}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                发表评论
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  {comment.user?.avatar ? (
                    <img
                      src={comment.user.avatar}
                      alt={comment.user.nickname}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-500 text-sm">
                      {comment.user?.nickname?.[0] || 'U'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-gray-900">
                      {comment.user?.nickname || '匿名用户'}
                    </span>
                    {comment.created_at && (
                      <span className="text-xs text-gray-400">
                        {new Date(comment.created_at * 1000).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 mb-2">{comment.content}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    {comment.like_count > 0 && (
                      <button className="flex items-center hover:text-primary-600">
                        <Heart className="h-4 w-4 mr-1" />
                        {comment.like_count}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {comments.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-white rounded-lg">
            暂无评论，快来发表第一条吧
          </div>
        )}
      </section>
    </div>
  )
}

