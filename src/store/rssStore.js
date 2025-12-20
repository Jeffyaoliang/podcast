import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useRSSStore = create(
  persist(
    (set, get) => ({
      subscriptions: [], // 订阅的播客列表
      recentFeeds: [], // 最近访问的 RSS（用于快速显示封面图）

      // 添加订阅
      addSubscription: (podcast) => {
        const { subscriptions } = get()
        const exists = subscriptions.find(sub => sub.rssUrl === podcast.rssUrl)
        if (!exists) {
          set({
            subscriptions: [...subscriptions, {
              ...podcast,
              addedAt: Date.now(),
            }],
          })
        }
      },

      // 移除订阅
      removeSubscription: (rssUrl) => {
        const { subscriptions } = get()
        set({
          subscriptions: subscriptions.filter(sub => sub.rssUrl !== rssUrl),
        })
      },

      // 更新订阅信息
      updateSubscription: (rssUrl, updates) => {
        const { subscriptions } = get()
        set({
          subscriptions: subscriptions.map(sub =>
            sub.rssUrl === rssUrl ? { ...sub, ...updates } : sub
          ),
        })
      },

      // 添加到最近访问
      addRecentFeed: (podcast) => {
        const { recentFeeds } = get()
        const filtered = recentFeeds.filter(feed => feed.rssUrl !== podcast.rssUrl)
        set({
          recentFeeds: [podcast, ...filtered].slice(0, 20), // 最多保存20个
        })
      },
    }),
    {
      name: 'rss-storage',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          return str ? JSON.parse(str) : null
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value))
        },
        removeItem: (name) => {
          localStorage.removeItem(name)
        },
      },
    }
  )
)

export default useRSSStore

