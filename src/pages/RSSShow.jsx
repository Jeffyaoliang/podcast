import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Play, Clock, Rss, Plus, Check, ExternalLink, Moon, X } from 'lucide-react'
import { parseRSS } from '../services/rssService'
import useRSSStore from '../store/rssStore'
import useHistoryStore from '../store/historyStore'
import AudioSpectrum from '../components/AudioSpectrum'

export default function RSSShow() {
  const { rssUrl: encodedRssUrl, episodeId: encodedEpisodeId } = useParams()
  const rssUrl = encodedRssUrl ? decodeURIComponent(encodedRssUrl) : null
  const episodeId = encodedEpisodeId ? decodeURIComponent(encodedEpisodeId) : null
  const [podcast, setPodcast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const loadingRef = useRef(false) // 防止重复请求
  const loadedRssUrlRef = useRef(null) // 记录已加载的RSS URL
  const { subscriptions, addSubscription, removeSubscription, addRecentFeed, addToBlacklist, isBlacklisted, removeFromBlacklist } = useRSSStore()
  const { addRecord, getRecordByEpisode } = useHistoryStore()
  const audioRef = useRef(null)
  const lastUpdateTimeRef = useRef(0)
  const hasRestoredPositionRef = useRef(false) // 标记是否已恢复播放位置
  const fadeIntervalRef = useRef(null) // 淡出定时器
  const isFadingRef = useRef(false) // 是否正在淡出
  const originalVolumeRef = useRef(1.0) // 保存原始音量
  const [isFading, setIsFading] = useState(false) // 淡出状态（用于UI更新）
  const [fadeProgress, setFadeProgress] = useState(0) // 淡出进度（0-100）
  const [showSpectrum, setShowSpectrum] = useState(false) // 是否显示频谱

  const isSubscribed = rssUrl ? subscriptions.some(sub => sub.rssUrl === rssUrl) : false
  
  // 找到当前要显示的单集
  const currentEpisode = episodeId && podcast ? podcast.episodes?.find(ep => ep.id === episodeId) : null

  const loadPodcast = async (forceReload = false) => {
    // 防止重复请求（除非强制重新加载）
    if (!forceReload && (loadingRef.current || loadedRssUrlRef.current === rssUrl)) {
      return
    }
    
    if (!rssUrl) {
      return
    }
    
    try {
      loadingRef.current = true
      loadedRssUrlRef.current = rssUrl
      setLoading(true)
      setError(null)
      const data = await parseRSS(rssUrl)
      setPodcast(data)
      addRecentFeed({
        rssUrl,
        title: data.title,
        description: data.description,
        image: data.image,
      })
        } catch (err) {
          // 只在开发环境输出详细错误日志
          if (import.meta.env.DEV && !err.message.includes('HTML 页面')) {
            console.error('加载播客失败:', err)
          }
          setError(err.message)
          loadedRssUrlRef.current = null // 失败时重置，允许重试
        } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }

  useEffect(() => {
    // 只有当rssUrl变化且不是正在加载时才加载
    if (rssUrl && rssUrl !== loadedRssUrlRef.current && !loadingRef.current) {
      loadPodcast()
    } else if (!rssUrl) {
      // 如果没有rssUrl，重置状态
      setPodcast(null)
      setLoading(false)
      setError(null)
      loadedRssUrlRef.current = null
      loadingRef.current = false
    }
  }, [rssUrl]) // 只依赖rssUrl，episodeId变化不需要重新加载播客

  // 当单集变化时，主动预加载音频以缩短缓冲时间
  useEffect(() => {
    if (currentEpisode && currentEpisode.audioUrl) {
      // 等待 DOM 更新后再访问 audioRef
      setTimeout(() => {
        if (audioRef.current) {
          const audio = audioRef.current
          // 主动触发加载，开始预加载音频数据（preload="auto" 配合 load() 可以更快开始缓冲）
          // 注意：audio 元素的 src 已经通过 source 标签设置，这里只需要触发 load()
          try {
            audio.load()
            // 音频元素已加载，允许显示频谱
            setShowSpectrum(true)
          } catch (error) {
            // 忽略加载错误（可能因为音频URL还未完全准备好）
            if (import.meta.env.DEV) {
              console.log('预加载音频:', error)
            }
          }
        }
      }, 100)
    } else {
      setShowSpectrum(false)
    }
  }, [currentEpisode?.audioUrl, currentEpisode?.id])

  // 恢复上次播放位置
  useEffect(() => {
    if (!currentEpisode || !audioRef.current || !rssUrl || hasRestoredPositionRef.current) return

    const audio = audioRef.current

    // 尝试恢复播放位置的函数
    const tryRestorePosition = () => {
      try {
        const historyRecord = getRecordByEpisode(rssUrl, currentEpisode.id)
        if (historyRecord && historyRecord.playedDuration > 0) {
          // 如果未完成，则恢复到上次位置（移除10秒的限制，因为即使几秒也值得恢复）
          if (!historyRecord.isCompleted() && historyRecord.playedDuration > 0) {
            const targetTime = historyRecord.playedDuration
            // 如果音频的duration已经加载，确保不超过总时长
            if (audio.duration && targetTime > audio.duration) {
              return
            }
            audio.currentTime = targetTime
            hasRestoredPositionRef.current = true
            if (import.meta.env.DEV) {
              console.log(`恢复播放位置: ${targetTime}秒 (总时长: ${audio.duration || '未知'})`)
            }
            return true // 成功恢复
          }
        }
      } catch (error) {
        console.error('恢复播放位置失败:', error)
      }
      return false
    }

    // 当音频可以播放时，尝试恢复位置
    const handleCanPlay = () => {
      if (!hasRestoredPositionRef.current) {
        tryRestorePosition()
      }
    }

    // 当音频元数据加载完成时，也尝试恢复位置
    const handleLoadedMetadata = () => {
      if (!hasRestoredPositionRef.current) {
        tryRestorePosition()
      }
    }

    // 当音频数据足够播放时，尝试恢复位置
    const handleCanPlayThrough = () => {
      if (!hasRestoredPositionRef.current) {
        tryRestorePosition()
      }
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('canplaythrough', handleCanPlayThrough)

    // 如果元数据已经加载完成，直接尝试恢复
    if (audio.readyState >= 1) { // HAVE_METADATA
      handleLoadedMetadata()
    }

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('canplaythrough', handleCanPlayThrough)
    }
  }, [currentEpisode, rssUrl, getRecordByEpisode])

  // 处理音频播放事件，记录历史
  useEffect(() => {
    if (!currentEpisode || !audioRef.current || !podcast) {
      // 重置恢复标记
      hasRestoredPositionRef.current = false
      return
    }

    const audio = audioRef.current

    // 开始播放时记录（并在播放前尝试恢复位置）
    const handlePlay = async () => {
      // 如果还没有恢复位置，尝试恢复（用户点击播放时可以设置currentTime，这是最可靠的时机）
      if (!hasRestoredPositionRef.current) {
        try {
          const historyRecord = getRecordByEpisode(rssUrl, currentEpisode.id)
          if (historyRecord && historyRecord.playedDuration > 0 && !historyRecord.isCompleted()) {
            const targetTime = historyRecord.playedDuration
            // 如果音频的duration已经加载，确保不超过总时长
            if (!audio.duration || targetTime < audio.duration) {
              // 直接设置currentTime（在play事件中设置应该是有效的）
              audio.currentTime = targetTime
              hasRestoredPositionRef.current = true
              if (import.meta.env.DEV) {
                console.log(`播放时恢复位置: ${targetTime}秒`)
              }
            }
          }
        } catch (error) {
          console.error('播放时恢复位置失败:', error)
        }
      }
      try {
        await addRecord({
          episodeTitle: currentEpisode.title,
          podcastName: podcast.title,
          duration: currentEpisode.duration || 0,
          playedDuration: Math.floor(audio.currentTime || 0),
          episodeUrl: currentEpisode.audioUrl || currentEpisode.link,
          coverImage: currentEpisode.image || podcast.image,
          // 优先使用单集描述，如果没有则使用播客描述（这样搜索时可以搜索到播客级别的关键词）
          description: currentEpisode.description || podcast.description || '',
          rssUrl: rssUrl || '',
          episodeId: currentEpisode.id || ''
        })
      } catch (error) {
        console.error('记录播放历史失败:', error)
      }
    }

    // 播放进度更新（每秒最多更新一次，避免过于频繁）
    const handleTimeUpdate = async () => {
      const now = Date.now()
      if (now - lastUpdateTimeRef.current < 1000) return // 限制更新频率为每秒一次
      lastUpdateTimeRef.current = now

      try {
        await addRecord({
          episodeTitle: currentEpisode.title,
          podcastName: podcast.title,
          duration: currentEpisode.duration || Math.floor(audio.duration || 0),
          playedDuration: Math.floor(audio.currentTime || 0),
          episodeUrl: currentEpisode.audioUrl || currentEpisode.link,
          coverImage: currentEpisode.image || podcast.image,
          // 优先使用单集描述，如果没有则使用播客描述（这样搜索时可以搜索到播客级别的关键词）
          description: currentEpisode.description || podcast.description || '',
          rssUrl: rssUrl || '',
          episodeId: currentEpisode.id || ''
        })
      } catch (error) {
        console.error('更新播放历史失败:', error)
      }
    }

    // 播放结束时更新
    const handleEnded = async () => {
      try {
        await addRecord({
          episodeTitle: currentEpisode.title,
          podcastName: podcast.title,
          duration: currentEpisode.duration || Math.floor(audio.duration || 0),
          playedDuration: Math.floor(audio.duration || 0),
          episodeUrl: currentEpisode.audioUrl || currentEpisode.link,
          coverImage: currentEpisode.image || podcast.image,
          // 优先使用单集描述，如果没有则使用播客描述（这样搜索时可以搜索到播客级别的关键词）
          description: currentEpisode.description || podcast.description || '',
          rssUrl: rssUrl || '',
          episodeId: currentEpisode.id || ''
        })
      } catch (error) {
        console.error('更新播放历史失败:', error)
      }
    }

    audio.addEventListener('play', handlePlay)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [currentEpisode, podcast, rssUrl, addRecord])

  // 当episodeId变化时，重置恢复标记和淡出状态
  useEffect(() => {
    hasRestoredPositionRef.current = false
    // 取消正在进行的淡出
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current)
      fadeIntervalRef.current = null
    }
    isFadingRef.current = false
    setIsFading(false)
    setFadeProgress(0)
  }, [episodeId])

  // 温和退出功能（60秒渐进式音量淡出）
  const handleGentleExit = () => {
    if (!audioRef.current || isFadingRef.current) return

    const audio = audioRef.current
    if (audio.paused) return

    isFadingRef.current = true
    setIsFading(true)
    originalVolumeRef.current = audio.volume

    const fadeDuration = 60 // 60秒
    const startVolume = audio.volume
    const startTime = Date.now()

    fadeIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      const progress = Math.min(elapsed / fadeDuration, 1)

      // 更新进度条
      setFadeProgress(progress * 100)

      // 指数淡出曲线，更自然
      const volume = startVolume * Math.pow(1 - progress, 2)
      audio.volume = Math.max(0, volume)

      if (progress >= 1) {
        // 淡出完成
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current)
          fadeIntervalRef.current = null
        }
        audio.pause()
        isFadingRef.current = false
        setIsFading(false)
        setFadeProgress(0)
        
        // 恢复音量
        setTimeout(() => {
          audio.volume = originalVolumeRef.current
        }, 1000)
      }
    }, 100) // 每100ms更新一次
  }

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current)
      }
    }
  }, [])

  const handleSubscribe = () => {
    if (isSubscribed) {
      removeSubscription(rssUrl)
      alert('已取消订阅')
    } else {
      addSubscription({
        rssUrl,
        title: podcast.title,
        description: podcast.description,
        image: podcast.image,
      })
      alert('订阅成功！')
    }
  }

  const handleBlacklist = () => {
    if (podcast && confirm(`确定要拉黑"${podcast.title}"吗？拉黑后该播客将不再出现在列表中。`)) {
      addToBlacklist(rssUrl)
      alert('已拉黑该播客')
    }
  }

  const handleUnblacklist = () => {
    removeFromBlacklist(rssUrl)
    alert('已从黑名单移除')
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '--:--'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return h > 0 
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    const isConnectionError = error.includes('无法获取RSS Feed') || 
                             error.includes('代理都失败了') || 
                             error.includes('HTML 页面') ||
                             error.includes('无法访问')
    return (
      <div className="text-center py-12 bg-white rounded-lg p-8">
        <div className="max-w-md mx-auto">
          <p className="text-red-500 mb-4 font-medium">{error}</p>
          {isConnectionError && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left">
              <p className="text-sm text-yellow-800 mb-2">
                <strong>提示：</strong>此 RSS 链接可能无法访问，原因可能是：
              </p>
              <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
                <li>CORS 跨域限制</li>
                <li>服务器访问限制</li>
                <li>RSS 链接已失效</li>
                <li>返回了HTML页面而不是XML（可能需要登录或特殊权限）</li>
              </ul>
              <p className="text-sm text-yellow-800 mt-3">
                <strong>建议：</strong>尝试使用其他 RSS 链接，例如：
              </p>
              <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1 mt-1">
                <li>BBC News: https://feeds.bbci.co.uk/news/rss.xml</li>
                <li>NPR News: https://feeds.npr.org/1001/rss.xml</li>
              </ul>
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => loadPodcast(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              重试
            </button>
            <Link
              to="/search"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              返回搜索
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!podcast) {
    return (
      <div className="text-center py-12 text-gray-500">
        播客不存在
      </div>
    )
  }

  // 如果指定了episodeId，显示单集详情
  if (episodeId && currentEpisode) {
    return (
      <div className="space-y-6">
        {/* 返回按钮 */}
        <Link
          to={`/rss/${encodeURIComponent(rssUrl)}`}
          className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4"
        >
          ← 返回播客
        </Link>

        {/* 播客单集详情 */}
        <div className="bg-white rounded-lg p-8">
          <div className="flex gap-6 mb-6">
            {currentEpisode.image && (
              <div className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={currentEpisode.image}
                  alt={currentEpisode.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                  loading="lazy"
                />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {currentEpisode.title}
              </h1>
              {currentEpisode.description && (
                <div 
                  className="episode-description text-gray-700 mb-4 leading-relaxed break-words"
                  style={{
                    lineHeight: '1.8',
                    fontSize: '15px',
                  }}
                  dangerouslySetInnerHTML={{ __html: currentEpisode.description }}
                />
              )}
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                {currentEpisode.duration > 0 && (
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {formatDuration(currentEpisode.duration)}
                  </span>
                )}
                {currentEpisode.pubDate && (
                  <span>{new Date(currentEpisode.pubDate * 1000).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          </div>

          {/* 音频播放器（仅当有音频链接时显示） */}
          {currentEpisode.audioUrl && (
            <div className="mt-6 space-y-4">
              {/* 音频频谱可视化 - 暂时禁用，避免影响音频播放 */}
              {/* <AudioSpectrum audioElement={audioRef.current} isVisible={true} /> */}
              
              <audio 
                ref={audioRef}
                controls 
                className="w-full" 
                preload="auto"
              >
                <source src={currentEpisode.audioUrl} type="audio/mpeg" />
                您的浏览器不支持音频播放。
              </audio>
              
              {/* 温和退出按钮 */}
              <button
                onClick={handleGentleExit}
                disabled={isFading || !audioRef.current || audioRef.current?.paused}
                className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                  isFading
                    ? 'bg-primary-400 text-white cursor-not-allowed'
                    : audioRef.current && !audioRef.current.paused
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Moon className="h-5 w-5" />
                <span>{isFading ? '温和淡出中... (60秒)' : '温和退出 (60秒淡出)'}</span>
              </button>
              
              {/* 淡出进度条 */}
              {isFading && (
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-100"
                    style={{
                      width: `${fadeProgress}%`
                    }}
                  />
                  <div className="text-xs text-gray-500 text-center mt-1">
                    淡出进度: {Math.round(fadeProgress)}%
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 外部链接（查看文章原文） */}
          {currentEpisode.link && (
            <div className="mt-6">
              <a
                href={currentEpisode.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                播放音频
              </a>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 显示播客列表
  return (
    <div className="space-y-8">
      {/* 播客头部 */}
      <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-48 h-48 md:w-64 md:h-64 flex-shrink-0 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 overflow-hidden flex items-center justify-center">
            {podcast.image ? (
              <img
                src={podcast.image}
                alt={podcast.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // 图片加载失败时，显示占位符
                  e.target.style.display = 'none'
                  if (e.target.parentElement) {
                    e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-24 h-24 text-primary-600" fill="currentColor" viewBox="0 0 20 20"><path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"/></svg></div>'
                  }
                }}
                loading="lazy"
              />
            ) : (
              <Rss className="h-24 w-24 text-primary-600" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {podcast.title}
            </h1>
            {podcast.author && (
              <p className="text-lg text-gray-600 mb-4">作者：{podcast.author}</p>
            )}
            {podcast.description && (
              <div 
                className="episode-description text-gray-700 mb-6"
                style={{
                  lineHeight: '1.8',
                  fontSize: '15px',
                }}
                dangerouslySetInnerHTML={{ __html: podcast.description }}
              />
            )}
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex items-center text-gray-600">
                <Rss className="h-5 w-5 mr-2" />
                <span>RSS 播客</span>
              </div>
              {podcast.episodes && (
                <div className="flex items-center text-gray-600">
                  <Play className="h-5 w-5 mr-2" />
                  <span>{podcast.episodes.length} 集</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSubscribe}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                  isSubscribed
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {isSubscribed ? (
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
              {isBlacklisted(rssUrl) ? (
                <button
                  onClick={handleUnblacklist}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <X className="h-5 w-5" />
                  已拉黑（点击移除）
                </button>
              ) : (
                <button
                  onClick={handleBlacklist}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <X className="h-5 w-5" />
                  拉黑
                </button>
              )}
              {podcast.link && (
                <a
                  href={podcast.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ExternalLink className="h-5 w-5" />
                  <span>访问官网</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 播客单集列表 */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          全部内容 ({podcast.episodes?.length || 0})
        </h2>
        <div className="space-y-3">
          {podcast.episodes && podcast.episodes.length > 0 ? (
            podcast.episodes.map((episode) => (
              <Link
                key={episode.id}
                to={`/rss/${encodeURIComponent(rssUrl)}/${encodeURIComponent(episode.id)}`}
                className="flex bg-white rounded-lg p-4 hover:shadow-md transition-shadow gap-4"
              >
                <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-gray-100 overflow-hidden">
                  {episode.image ? (
                    <img
                      src={episode.image}
                      alt={episode.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // 图片加载失败时，显示占位符
                        e.target.style.display = 'none'
                        if (e.target.parentElement) {
                          e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200"><svg class="w-8 h-8 text-primary-600" fill="currentColor" viewBox="0 0 20 20"><path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"/></svg></div>'
                        }
                      }}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200">
                      <Play className="h-8 w-8 text-primary-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
                    {episode.title}
                  </h3>
                  {episode.description && (
                    <div 
                      className="text-sm text-gray-600 mb-2 episode-description-list"
                      dangerouslySetInnerHTML={{ __html: episode.description }}
                    />
                  )}
                  <div className="flex items-center space-x-3 text-xs text-gray-400">
                    {episode.duration > 0 && (
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDuration(episode.duration)}
                      </span>
                    )}
                    {episode.pubDate && (
                      <span>{new Date(episode.pubDate * 1000).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-lg text-gray-500">
              暂无单集
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

