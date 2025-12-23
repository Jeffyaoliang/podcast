/**
 * 播客记录数据模型（浏览器版本）
 */
export class PodcastRecord {
  constructor({
    id = null,
    episodeTitle,
    podcastName,
    duration = 0,
    playedDuration = 0,
    playedAt = new Date(),
    episodeUrl = '',
    coverImage = '',
    description = '',
    rssUrl = '', // RSS播客的URL
    episodeId = '', // 单集的ID
  }) {
    this.id = id || this.generateId()
    this.episodeTitle = episodeTitle
    this.podcastName = podcastName
    this.duration = duration
    this.playedDuration = playedDuration
    this.playedAt = playedAt instanceof Date ? playedAt : new Date(playedAt)
    this.episodeUrl = episodeUrl
    this.coverImage = coverImage
    this.description = description
    this.rssUrl = rssUrl
    this.episodeId = episodeId
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  // 计算播放进度百分比
  getProgress() {
    if (this.duration === 0) return 0
    return Math.round((this.playedDuration / this.duration) * 100)
  }

  // 检查是否播放完成
  isCompleted() {
    return this.getProgress() >= 90 // 90%以上认为播放完成
  }

  // 转换为JSON格式
  toJSON() {
    return {
      id: this.id,
      episodeTitle: this.episodeTitle,
      podcastName: this.podcastName,
      duration: this.duration,
      playedDuration: this.playedDuration,
      playedAt: this.playedAt.toISOString(),
      episodeUrl: this.episodeUrl,
      coverImage: this.coverImage,
      description: this.description,
      rssUrl: this.rssUrl,
      episodeId: this.episodeId,
      progress: this.getProgress(),
      completed: this.isCompleted()
    }
  }

  // 从JSON创建实例
  static fromJSON(data) {
    return new PodcastRecord({
      ...data,
      playedAt: new Date(data.playedAt)
    })
  }
}

