import { useNavigate, Link } from 'react-router-dom'
import { Headphones, Rss, ArrowRight, CheckCircle } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <Rss className="h-8 w-8 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">RSS 播客</h1>
          <p className="text-gray-600">无需登录，直接使用</p>
        </div>

        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-900 mb-1">无需登录</h3>
                <p className="text-sm text-green-700">
                  本应用基于 RSS 技术，不需要登录即可使用所有功能
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">如何使用：</h3>
            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-medium mr-3">
                  1
                </span>
                <span>点击"搜索"菜单，找到"添加 RSS 订阅"</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-medium mr-3">
                  2
                </span>
                <span>输入 RSS 链接（如 BBC News、NPR 等）</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-medium mr-3">
                  3
                </span>
                <span>开始收听你订阅的播客！</span>
              </li>
            </ol>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <Link
              to="/search"
              className="w-full flex items-center justify-center space-x-2 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              <span>开始使用</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/"
              className="block text-center mt-3 text-sm text-gray-600 hover:text-primary-600"
            >
              返回首页
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-gray-500">
          <p>⚠️ 本项目仅供学习使用</p>
          <p className="mt-1">基于 RSS 技术，支持所有标准 RSS Feed</p>
        </div>
      </div>
    </div>
  )
}

