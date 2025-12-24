use std::collections::HashMap;
use std::hash::Hash;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

// LRU缓存的节点
struct Node<K, V> {
    key: K,
    value: V,
    accessed_at: Instant,
}

// 线程安全的LRU缓存
pub struct ThreadSafeLRUCache<K, V> {
    data: Arc<Mutex<HashMap<K, Node<K, V>>>>,
    capacity: usize,
    ttl: Option<Duration>,
}

impl<K, V> ThreadSafeLRUCache<K, V>
where
    K: Hash + Eq + Clone + Send + Sync + 'static,
    V: Clone + Send + Sync + 'static,
{
    /// 创建一个新的LRU缓存
    ///
    /// # Arguments
    ///
    /// * `capacity` - 缓存的最大容量
    /// * `ttl` - 可选的过期时间（Time To Live）
    pub fn new(capacity: usize) -> Self {
        Self {
            data: Arc::new(Mutex::new(HashMap::with_capacity(capacity))),
            capacity,
            ttl: None,
        }
    }

    /// 创建一个带过期时间的LRU缓存
    pub fn with_ttl(capacity: usize, ttl: Duration) -> Self {
        Self {
            data: Arc::new(Mutex::new(HashMap::with_capacity(capacity))),
            capacity,
            ttl: Some(ttl),
        }
    }

    /// 获取缓存值
    ///
    /// # Returns
    ///
    /// 如果找到且未过期，返回`Some(V)`，否则返回`None`
    pub fn get(&self, key: &K) -> Option<V> {
        let mut data = self.data.lock().unwrap();
        
        // 检查是否存在
        if let Some(node) = data.get_mut(key) {
            // 检查是否过期
            if let Some(ttl) = self.ttl {
                if node.accessed_at.elapsed() > ttl {
                    data.remove(key);
                    return None;
                }
            }
            
            // 更新访问时间
            node.accessed_at = Instant::now();
            return Some(node.value.clone());
        }
        
        None
    }

    /// 插入或更新缓存值
    pub fn put(&self, key: K, value: V) {
        let mut data = self.data.lock().unwrap();

        // 如果已存在，直接更新
        if let Some(node) = data.get_mut(&key) {
            node.value = value;
            node.accessed_at = Instant::now();
            return;
        }

        // 如果达到容量限制，移除最旧的项
        if data.len() >= self.capacity {
            self.evict_lru(&mut data);
        }

        // 插入新项
        data.insert(
            key,
            Node {
                key: key.clone(),
                value,
                accessed_at: Instant::now(),
            },
        );
    }

    /// 移除最久未使用的项
    fn evict_lru(&self, data: &mut HashMap<K, Node<K, V>>) {
        let oldest_key = data
            .iter()
            .min_by_key(|(_, node)| node.accessed_at)
            .map(|(k, _)| k.clone());

        if let Some(key) = oldest_key {
            data.remove(&key);
        }
    }

    /// 移除指定键的缓存项
    pub fn remove(&self, key: &K) -> Option<V> {
        let mut data = self.data.lock().unwrap();
        data.remove(key).map(|node| node.value)
    }

    /// 清空缓存
    pub fn clear(&self) {
        let mut data = self.data.lock().unwrap();
        data.clear();
    }

    /// 获取当前缓存大小
    pub fn len(&self) -> usize {
        let data = self.data.lock().unwrap();
        data.len()
    }

    /// 检查缓存是否为空
    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }
}

// 测试用例
#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;
    use std::time::Duration as StdDuration;

    #[test]
    fn test_basic_operations() {
        let cache = ThreadSafeLRUCache::new(3);

        // 插入测试
        cache.put("key1".to_string(), "value1".to_string());
        cache.put("key2".to_string(), "value2".to_string());
        cache.put("key3".to_string(), "value3".to_string());

        // 读取测试
        assert_eq!(cache.get(&"key1".to_string()), Some("value1".to_string()));
        assert_eq!(cache.get(&"key2".to_string()), Some("value2".to_string()));

        // LRU淘汰测试
        cache.put("key4".to_string(), "value4".to_string());
        assert_eq!(cache.get(&"key3".to_string()), None); // key3应该被淘汰
    }

    #[test]
    fn test_thread_safety() {
        let cache = Arc::new(ThreadSafeLRUCache::new(100));
        let mut handles = vec![];

        // 启动多个线程进行并发读写
        for i in 0..10 {
            let cache_clone = Arc::clone(&cache);
            let handle = thread::spawn(move || {
                for j in 0..100 {
                    let key = format!("key_{}_{}", i, j);
                    let value = format!("value_{}_{}", i, j);
                    cache_clone.put(key.clone(), value.clone());
                    assert_eq!(cache_clone.get(&key), Some(value));
                }
            });
            handles.push(handle);
        }

        for handle in handles {
            handle.join().unwrap();
        }
    }

    #[test]
    fn test_ttl() {
        let cache = ThreadSafeLRUCache::with_ttl(10, StdDuration::from_millis(100));
        
        cache.put("key1".to_string(), "value1".to_string());
        assert_eq!(cache.get(&"key1".to_string()), Some("value1".to_string()));

        // 等待过期
        thread::sleep(StdDuration::from_millis(150));
        assert_eq!(cache.get(&"key1".to_string()), None);
    }
}

