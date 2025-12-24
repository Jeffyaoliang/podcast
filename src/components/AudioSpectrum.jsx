import { useEffect, useRef } from 'react'

/**
 * 音频频谱可视化组件
 * 使用 Web Audio API 分析音频并实时显示频谱
 */
export default function AudioSpectrum({ audioElement, isVisible = true }) {
  const canvasRef = useRef(null)
  const animationFrameRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const sourceRef = useRef(null)

  useEffect(() => {
    // 如果没有音频元素或不可见，清理资源
    if (!audioElement || !isVisible) {
      // 清理资源
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect()
        } catch (e) {
          // 忽略已断开连接的错误
        }
        sourceRef.current = null
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {
          // 忽略关闭错误
        })
        audioContextRef.current = null
      }
      return
    }

    // 如果 canvas 还没准备好，等待一下
    if (!canvasRef.current) {
      const timer = setTimeout(() => {
        // 延迟初始化
      }, 100)
      return () => clearTimeout(timer)
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 设置画布大小
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // 初始化 Web Audio API
    let audioContext = null
    let analyser = null
    let source = null

    const initAudioContext = () => {
      try {
        // 创建 AudioContext（兼容不同浏览器）
        const AudioContextClass = window.AudioContext || window.webkitAudioContext
        if (!AudioContextClass) {
          console.warn('浏览器不支持 Web Audio API')
          return false
        }

        audioContext = new AudioContextClass()
        audioContextRef.current = audioContext

        // 创建 AnalyserNode
        analyser = audioContext.createAnalyser()
        analyser.fftSize = 256 // 512个数据点
        analyser.smoothingTimeConstant = 0.8 // 平滑系数
        analyserRef.current = analyser

        // 将音频元素连接到分析器
        // 注意：createMediaElementSource 只能调用一次，如果已经连接过会报错
        // 检查 audioElement 是否已经有 sourceNode（通过查看是否已经有 _sourceNode 属性）
        if (audioElement._sourceNode) {
          // 如果已经有 sourceNode，直接使用它（不要重新连接，因为已经连接到 destination 了）
          source = audioElement._sourceNode
          // 但是需要确保 analyser 也被连接（如果还没有连接）
          try {
            // 检查 source 是否已经连接到 analyser
            // 如果没有，需要连接（但这可能会断开原有的连接，所以需要小心）
            // 为了安全，我们直接使用现有的 source，不再重新连接
          } catch (e) {
            // 忽略错误
          }
        } else {
          // 创建新的 source
          try {
            source = audioContext.createMediaElementSource(audioElement)
            audioElement._sourceNode = source // 标记已经创建过
            // 重要：必须先连接到 analyser，再连接到 destination，这样音频才能正常播放
            source.connect(analyser)
            analyser.connect(audioContext.destination)
          } catch (error) {
            // 如果创建失败（可能已经连接过），尝试捕获错误
            console.warn('创建音频源失败，可能已经连接:', error)
            // 如果已经有 sourceNode，使用它
            if (audioElement._sourceNode) {
              source = audioElement._sourceNode
            } else {
              return false
            }
          }
        }
        sourceRef.current = source

        return true
      } catch (error) {
        console.error('初始化音频上下文失败:', error)
        return false
      }
    }

    // 启动音频上下文（某些浏览器需要用户交互）
    const startAudioContext = async () => {
      if (audioContext && audioContext.state === 'suspended') {
        try {
          await audioContext.resume()
        } catch (error) {
          console.error('恢复音频上下文失败:', error)
        }
      }
    }

    // 绘制频谱
    const drawSpectrum = () => {
      if (!analyser || !canvas || !ctx) return

      const bufferLength = analyser.frequencyBinCount // 通常是 fftSize / 2 = 128
      const dataArray = new Uint8Array(bufferLength)
      analyser.getByteFrequencyData(dataArray)

      // 清空画布
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 设置样式
      const barWidth = canvas.width / bufferLength / (window.devicePixelRatio || 1)
      const barCount = Math.min(bufferLength, 64) // 只显示前64个频段，避免过于密集
      const spacing = barWidth * 1.2 // 条形间距
      const actualBarWidth = barWidth * 0.8

      // 绘制频谱条形图
      for (let i = 0; i < barCount; i++) {
        const barHeight = (dataArray[i] / 255) * (canvas.height / (window.devicePixelRatio || 1))
        
        // 创建渐变（从底部到顶部）
        const gradient = ctx.createLinearGradient(
          0, 
          canvas.height / (window.devicePixelRatio || 1) - barHeight,
          0,
          canvas.height / (window.devicePixelRatio || 1)
        )
        
        // 根据频率使用不同颜色（低频到高频：蓝->绿->黄->红）
        const hue = (i / barCount) * 240 // 0-240 (蓝到红)
        gradient.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.8)`)
        gradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0.4)`)

        ctx.fillStyle = gradient
        ctx.fillRect(
          i * spacing,
          canvas.height / (window.devicePixelRatio || 1) - barHeight,
          actualBarWidth,
          barHeight
        )
      }

      // 继续动画
      animationFrameRef.current = requestAnimationFrame(drawSpectrum)
    }

    // 初始化
    if (initAudioContext()) {
      // 当音频开始播放时，启动音频上下文
      const handlePlay = () => {
        startAudioContext()
        if (!animationFrameRef.current) {
          drawSpectrum()
        }
      }

      // 当音频暂停时，停止绘制（但不清理资源，以便快速恢复）
      const handlePause = () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
          animationFrameRef.current = null
          // 清空画布
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
      }

      audioElement.addEventListener('play', handlePlay)
      audioElement.addEventListener('pause', handlePause)

      // 如果已经在播放，立即开始绘制
      if (!audioElement.paused) {
        handlePlay()
      }

      // 清理函数
      return () => {
        window.removeEventListener('resize', resizeCanvas)
        audioElement.removeEventListener('play', handlePlay)
        audioElement.removeEventListener('pause', handlePause)

        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
          animationFrameRef.current = null
        }

        // 注意：不要断开 source 连接，因为这会阻止音频播放
        // 只有当组件完全卸载时才断开连接
        // if (source) {
        //   try {
        //     source.disconnect()
        //   } catch (e) {
        //     // 忽略错误
        //   }
        // }

        // 不要关闭 AudioContext，因为可能会影响其他使用
        // if (audioContext && audioContext.state !== 'closed') {
        //   audioContext.close().catch(() => {
        //     // 忽略关闭错误
        //   })
        // }
      }
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [audioElement, isVisible])

  // 总是渲染 canvas DOM，让 useEffect 来处理 audioElement 的初始化
  if (!isVisible) {
    return null
  }

  return (
    <div className="w-full h-24 bg-gray-900 rounded-lg overflow-hidden shadow-lg">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  )
}

