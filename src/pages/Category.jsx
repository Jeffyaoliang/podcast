import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Clock, Heart } from 'lucide-react'
import { discoveryAPI } from '../services/api'

export default function Category() {
  const { id } = useParams()
  const [category, setCategory] = useState(null)
  const [shows, setShows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadCategoryData()
    }
  }, [id])

  const loadCategoryData = async () => {
    try {
      setLoading(true)
      const response = await discoveryAPI.getCategoryContent(id)
      setShows(response.data.data || [])
      // 假设返回的数据中包含分类信息
      setCategory(response.data.category || { name: '分类' })
    } catch (error) {
      console.error('加载分类数据失败:', error)
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {category?.name || '分类'}
        </h1>
      </div>

      {shows.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {shows.map((show) => (
            <Link
              key={show.id || show.show_id}
              to={`/show/${show.id || show.show_id}`}
              className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              <div className="relative aspect-square bg-gray-100 overflow-hidden">
                <img
                  src={show.cover || show.image || '/placeholder.png'}
                  alt={show.title || show.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1">
                  {show.title || show.name}
                </h3>
                {show.author && (
                  <p className="text-sm text-gray-500 mb-2">{show.author}</p>
                )}
                {show.stats && (
                  <div className="flex items-center space-x-4 text-xs text-gray-400">
                    {show.stats.subscribed && (
                      <span className="flex items-center">
                        <Heart className="h-3 w-3 mr-1" />
                        {show.stats.subscribed}
                      </span>
                    )}
                    {show.stats.episodes && (
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {show.stats.episodes}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg text-gray-500">
          该分类下暂无内容
        </div>
      )}
    </div>
  )
}

