import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Heart, Clock, Headphones, Settings } from 'lucide-react'
import { userAPI } from '../services/api'
import useAuthStore from '../store/authStore'

export default function Profile() {
  const { user, updateUser } = useAuthStore()
  const [profile, setProfile] = useState(null)
  const [subscriptions, setSubscriptions] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      setLoading(true)
      const [profileRes, subsRes, historyRes] = await Promise.all([
        userAPI.getProfile().catch(() => ({ data: { data: null } })),
        userAPI.getSubscriptions().catch(() => ({ data: { data: [] } })),
        userAPI.getHistory().catch(() => ({ data: { data: [] } })),
      ])

      const userData = profileRes.data.data || user
      setProfile(userData)
      if (userData) {
        updateUser(userData)
      }
      setSubscriptions(subsRes.data.data || [])
      setHistory(historyRes.data.data || [])
    } catch (error) {
      console.error('加载用户数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const displayUser = profile || user

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* User Info */}
      <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
        <div className="flex items-start space-x-6">
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
            {displayUser?.avatar ? (
              <img
                src={displayUser.avatar}
                alt={displayUser.nickname}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="h-12 w-12 text-gray-400" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {displayUser?.nickname || '用户'}
            </h1>
            {displayUser?.bio && (
              <p className="text-gray-600 mb-4">{displayUser.bio}</p>
            )}
            <div className="flex items-center space-x-6 text-gray-600">
              {displayUser?.stats && (
                <>
                  {displayUser.stats.subscriptions && (
                    <div className="flex items-center">
                      <Heart className="h-5 w-5 mr-2" />
                      <span>{displayUser.stats.subscriptions} 订阅</span>
                    </div>
                  )}
                  {displayUser.stats.history && (
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 mr-2" />
                      <span>{displayUser.stats.history} 收听</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/subscriptions"
          className="flex items-center space-x-4 bg-white rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
            <Headphones className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">我的订阅</h3>
            <p className="text-sm text-gray-500">{subscriptions.length} 个播客</p>
          </div>
        </Link>

        <Link
          to="#"
          className="flex items-center space-x-4 bg-white rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <Clock className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">收听历史</h3>
            <p className="text-sm text-gray-500">{history.length} 个单集</p>
          </div>
        </Link>
      </div>

      {/* Recent Subscriptions */}
      {subscriptions.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">我的订阅</h2>
            <Link
              to="/subscriptions"
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              查看全部
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {subscriptions.slice(0, 10).map((sub) => (
              <Link
                key={sub.id || sub.show_id}
                to={`/show/${sub.id || sub.show_id}`}
                className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="relative aspect-square bg-gray-100 overflow-hidden">
                  <img
                    src={sub.cover || sub.image || '/placeholder.png'}
                    alt={sub.title || sub.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
                    {sub.title || sub.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent History */}
      {history.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">最近收听</h2>
          <div className="space-y-3">
            {history.slice(0, 10).map((item) => (
              <Link
                key={item.id || item.episode_id}
                to={`/episode/${item.id || item.episode_id}`}
                className="flex bg-white rounded-lg p-4 hover:shadow-md transition-shadow gap-4"
              >
                <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-gray-100 overflow-hidden">
                  <img
                    src={item.cover || item.image || '/placeholder.png'}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
                    {item.title}
                  </h3>
                  {item.show && (
                    <p className="text-sm text-gray-500">{item.show.title}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

