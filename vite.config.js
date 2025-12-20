import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // 监听所有网络接口
    port: 3000,
    open: true,
    proxy: {
      '/api/rss-proxy': {
        target: 'https://api.allorigins.win',
        changeOrigin: true,
        rewrite: (path) => {
          // 从查询参数中提取原始URL
          const urlMatch = path.match(/[?&]url=([^&]+)/)
          if (urlMatch) {
            // 提取URL（已经是编码的），直接使用
            const encodedUrl = urlMatch[1]
            return `/get?url=${encodedUrl}`
          }
          return '/get'
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            console.log('代理错误:', err)
          })
        }
      }
    }
  }
})

