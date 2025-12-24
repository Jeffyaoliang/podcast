import { Link, useLocation } from 'react-router-dom'
import { Home, Search, User, Headphones, Clock, Moon, Ban } from 'lucide-react'
import useAuthStore from '../store/authStore'

export default function Layout({ children }) {
  const location = useLocation()
  const { isAuthenticated, logout, user } = useAuthStore()

  const navItems = [
    { path: '/', icon: Home, label: '首页' },
    { path: '/search', icon: Search, label: '搜索' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-2">
              <Headphones className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">DreamEcho</span>
            </Link>

            <nav className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="flex items-center space-x-4">
              <Link
                to="/history"
                className="flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Clock className="h-5 w-5" />
                <span className="hidden sm:inline">收听历史</span>
              </Link>
              <Link
                to="/sleep-score"
                className="flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Moon className="h-5 w-5" />
                <span className="hidden sm:inline">睡眠评分</span>
              </Link>
              <Link
                to="/subscriptions"
                className="flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <User className="h-5 w-5" />
                <span className="hidden sm:inline">我的订阅</span>
              </Link>
              <Link
                to="/blacklist"
                className="flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Ban className="h-5 w-5" />
                <span className="hidden sm:inline">黑名单</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-200">
          <div className="flex items-center justify-around px-4 py-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-md ${
                    isActive ? 'text-primary-600' : 'text-gray-700'
                  }`}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-xs">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}

