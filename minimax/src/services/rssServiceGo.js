/**
 * RSS Service - Go 后端版本
 * 直接调用 Go 后端 API 进行 RSS 解析
 */
import axios from 'axios';
import { getBackendURL, isUsingGoBackend } from '../config/goBackend';

// 从缓存获取
const getFromCache = (key) => {
  if (!isUsingGoBackend() || !localStorage) return null;
  
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const data = JSON.parse(cached);
      if (data && Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
        console.log(`[缓存命中] ${key}`);
        return data.content;
      }
    }
  } catch (error) {
    console.warn('缓存读取失败:', error);
  }
  return null;
};

// 保存到缓存
const saveToCache = (key, content) => {
  if (!isUsingGoBackend() || !localStorage) return;
  
  try {
    localStorage.setItem(key, JSON.stringify({
      timestamp: Date.now(),
      content
    }));
    console.log(`[缓存保存] ${key}`);
  } catch (error) {
    console.warn('缓存保存失败:', error);
  }
};

/**
 * 使用 Go 后端解析 RSS
 */
export const parseRSSWithGo = async (rssUrl) => {
  if (!rssUrl) {
    throw new Error('RSS URL 不能为空');
  }

  const cacheKey = `rss_${rssUrl}`;
  
  // 1. 先尝试从缓存读取
  const cachedData = getFromCache(cacheKey);
  if (cachedData) {
    console.log(`[Go后端] 使用缓存: ${rssUrl}`);
    return cachedData;
  }

  try {
    // 2. 调用 Go 后端 API
    const backendURL = getBackendURL();
    console.log(`[Go后端] 正在请求: ${backendURL}/api/feed?url=${encodeURIComponent(rssUrl)}`);
    
    const response = await axios.get(`${backendURL}/api/feed`, {
      params: { url: rssUrl },
      timeout: 15000, // 15秒超时
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.data && response.data.items) {
      // 3. 解析返回数据
      const feedData = response.data;
      
      const result = {
        title: feedData.title || '未知播客',
        description: feedData.description || '',
        image: feedData.image || '',
        episodes: feedData.items.map(item => ({
          title: item.title || '未知单集',
          description: item.description || '',
          audioUrl: item.enclosure?.url || item.audio || '',
          duration: item.itunes?.duration || item.duration || '',
          pubDate: item.pubDate || item.pub_date || '',
          guid: item.guid || ''
        }))
      };

      // 4. 保存到缓存
      saveToCache(cacheKey, result);
      
      console.log(`[Go后端] 解析成功: ${result.title}, 共 ${result.episodes.length} 集`);
      
      return result;
    } else {
      throw new Error('Go 后端返回数据格式错误');
    }
  } catch (error) {
    console.error(`[Go后端] 解析失败: ${rssUrl}`, error);
    throw new Error(`解析失败: ${error.message}`);
  }
};

/**
 * 搜索播客（使用 Go 后端）
 */
export const searchPodcastsWithGo = async (keyword) => {
  if (!keyword || !keyword.trim()) {
    return [];
  }

  try {
    const backendURL = getBackendURL();
    const response = await axios.get(`${backendURL}/api/search`, {
      params: { q: keyword.trim() },
      timeout: 10000
    });

    return response.data || [];
  } catch (error) {
    console.error('[Go后端] 搜索失败:', error);
    return [];
  }
};

/**
 * 获取播客详情（使用 Go 后端）
 */
export const getPodcastDetailWithGo = async (rssUrl) => {
  return await parseRSSWithGo(rssUrl);
};

export default {
  parseRSS: parseRSSWithGo,
  searchPodcasts: searchPodcastsWithGo,
  getPodcastDetail: getPodcastDetailWithGo
};

