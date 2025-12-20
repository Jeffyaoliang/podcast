import axios from 'axios'

// 配置API基础URL，默认使用本地xyz API服务
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:23020'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器 - 添加token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    // 对于需要token的API，即使token为空也尝试发送（后端会验证）
    // 但大部分API都需要token，所以总是尝试发送
    if (token) {
      config.headers['x-jike-access-token'] = token
    } else {
      // 对于需要token的API，如果没有token，后端会返回400
      // 我们在响应拦截器中处理这种情况
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 处理token刷新和错误
api.interceptors.response.use(
  (response) => {
    // 统一处理响应数据格式
    if (response.data?.data) {
      return response
    }
    return response
  },
  async (error) => {
    // 400错误可能是参数问题或缺少token
    if (error.response?.status === 400) {
      const msg = error.response?.data?.msg || '请求失败'
      // 如果是缺少token导致的错误，提供更友好的提示
      if (msg.includes('token') || !localStorage.getItem('token')) {
        console.warn('API需要登录token:', error.response?.data)
        // 不在这里跳转，让调用方处理
      } else {
        console.error('API请求参数错误:', error.response?.data)
      }
      return Promise.reject(error)
    }
    
    if (error.response?.status === 401) {
      // token过期，尝试刷新
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/refresh_token`, {
            refresh_token: refreshToken,
          })
          const data = response.data?.data || {}
          const token = data.token || data.accessToken
          if (token) {
            localStorage.setItem('token', token)
            error.config.headers['x-jike-access-token'] = token
            return api.request(error.config)
          }
        } catch (refreshError) {
          // 刷新失败，清除token
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
          // 只有在需要登录的页面才跳转
          if (window.location.pathname !== '/login') {
            console.warn('Token已过期，请重新登录')
          }
        }
      }
    }
    return Promise.reject(error)
  }
)

// API方法
export const authAPI = {
  // 发送验证码
  sendCode: (phone) => api.post('/sendCode', { 
    mobilePhoneNumber: phone,
    areaCode: '+86'
  }),
  
  // 短信登录
  login: (phone, code) => api.post('/login', { 
    mobilePhoneNumber: phone,
    verifyCode: code,
    areaCode: '+86'
  }),
  
  // 刷新token
  refreshToken: (refreshToken) => api.post('/refresh_token', { refresh_token: refreshToken }),
}

export const searchAPI = {
  // 搜索 - type: SHOW, EPISODE, USER
  search: (keyword, type = 'SHOW', loadMoreKey = null) => {
    const params = { 
      keyword,
      type,
      pid: ''
    }
    if (loadMoreKey) {
      params.loadMoreKey = loadMoreKey
    }
    return api.post('/search', params)
  },
  
  // 你可能想搜的内容（不需要参数）
  suggest: () => api.post('/search_preset', {}),
}

export const podcastAPI = {
  // 获取节目详情
  getShow: (showId) => api.post('/podcast_detail', { id: showId }),
  
  // 获取单集详情
  getEpisode: (episodeId) => api.post('/episode_detail', { id: episodeId }),
  
  // 获取节目单集列表
  getShowEpisodes: (showId, page = 1, limit = 20) =>
    api.post('/episode_list', { id: showId, page, limit }),
  
  // 获取最受欢迎单集
  getPopularEpisodes: (showId, limit = 10) =>
    api.post('/episode_list_by_filter', { id: showId, limit }),
  
  // 获取音频链接（在episode_detail中已包含）
  getAudio: (episodeId) => api.post('/episode_detail', { id: episodeId }),
  
  // 获取相关推荐
  getRelatedShows: (showId) => api.post('/podcast_related', { id: showId }),
}

export const userAPI = {
  // 获取我的信息
  getProfile: () => api.post('/get_profile', {}),
  
  // 获取我的订阅
  getSubscriptions: (page = 1, limit = 20) =>
    api.post('/subscription', { page, limit }),
  
  // 订阅/取消订阅（通过subscription_update接口）
  subscribe: (showId) => api.post('/subscription_update', { action: 'subscribe', id: showId }),
  unsubscribe: (showId) => api.post('/subscription_update', { action: 'unsubscribe', id: showId }),
  
  // 获取收听历史
  getHistory: (page = 1, limit = 20) =>
    api.post('/episode_played_history_list', { page, limit }),
  
  // 获取我的收藏
  getFavorites: (page = 1, limit = 20) =>
    api.post('/favorite_episode_list', { page, limit }),
}

export const commentAPI = {
  // 获取评论
  getComments: (episodeId, page = 1, limit = 20) =>
    api.post('/comment_primary', { id: episodeId, page, limit }),
  
  // 创建评论
  createComment: (episodeId, content, replyTo = null) =>
    api.post('/comment_create', {
      id: episodeId,
      content,
      reply_to: replyTo,
    }),
  
  // 删除评论
  deleteComment: (commentId) => api.post('/comment_remove', { id: commentId }),
  
  // 点赞/取消点赞
  likeComment: (commentId) => api.post('/comment_like_update', { id: commentId, action: 'like' }),
  unlikeComment: (commentId) => api.post('/comment_like_update', { id: commentId, action: 'unlike' }),
}

export const discoveryAPI = {
  // 获取榜单 - category: HOT, ROCK, NEW
  getRanking: (category = 'HOT', limit = 20) =>
    api.post('/top_list', { category }),
  
  // 获取精选（通过discovery接口）
  getFeatured: (loadMoreKey = '') =>
    api.post('/discovery', { loadMoreKey }),
  
  // 获取推荐（通过discovery接口）
  getRecommendations: (loadMoreKey = '') =>
    api.post('/discovery', { loadMoreKey }),
  
  // 获取分类
  getCategories: () => api.post('/category_list', {}),
  
  // 获取分类内容
  getCategoryContent: (categoryId, page = 1, limit = 20) =>
    api.post('/category_podcast_list', { id: categoryId, page, limit }),
}

export default api

