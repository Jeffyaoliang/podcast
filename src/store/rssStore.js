import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useRSSStore = create(
  persist(
    (set, get) => ({
      subscriptions: [], // 订阅的播客列表
      recentFeeds: [], // 最近访问的 RSS（用于快速显示封面图）
      blacklist: [], // 黑名单（拉黑的播客列表）

      // 添加订阅
      addSubscription: (podcast) => {
        const { subscriptions, blacklist } = get()
        const exists = subscriptions.find(sub => sub.rssUrl === podcast.rssUrl)
        if (!exists) {
          // 如果播客在黑名单中，先从黑名单移除
          const isBlacklisted = blacklist.includes(podcast.rssUrl)
          set({
            subscriptions: [...subscriptions, {
              ...podcast,
              addedAt: Date.now(),
            }],
            blacklist: isBlacklisted ? blacklist.filter(url => url !== podcast.rssUrl) : blacklist,
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

      // 添加到黑名单
      addToBlacklist: (rssUrl) => {
        const { blacklist, subscriptions } = get()
        if (!blacklist.includes(rssUrl)) {
          // 如果播客在订阅列表中，同时移除订阅
          set({
            blacklist: [...blacklist, rssUrl],
            subscriptions: subscriptions.filter(sub => sub.rssUrl !== rssUrl),
          })
        }
      },

      // 从黑名单移除
      removeFromBlacklist: (rssUrl) => {
        const { blacklist } = get()
        set({
          blacklist: blacklist.filter(url => url !== rssUrl),
        })
      },

      // 检查是否在黑名单中
      isBlacklisted: (rssUrl) => {
        const { blacklist } = get()
        return blacklist.includes(rssUrl)
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

