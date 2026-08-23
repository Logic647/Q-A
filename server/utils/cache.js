/**
 * 缓存优化模块
 * 提供多级缓存策略
 */

const redis = require('../config/redis');

// 内存缓存（L1缓存）
const memoryCache = new Map();

// 缓存配置
const CACHE_CONFIG = {
    // 默认TTL（秒）
    defaultTTL: 3600,
    // 内存缓存最大条目数
    maxMemoryItems: 1000,
    // 缓存前缀
    prefix: 'cache:'
};

/**
 * 设置缓存
 * @param {string} key - 缓存键
 * @param {*} value - 缓存值
 * @param {number} ttl - 过期时间（秒）
 */
async function setCache(key, value, ttl = CACHE_CONFIG.defaultTTL) {
    const fullKey = CACHE_CONFIG.prefix + key;
    
    try {
        // 写入内存缓存
        memoryCache.set(fullKey, {
            value,
            expireAt: Date.now() + (ttl * 1000)
        });
        
        // 清理过多的内存缓存
        if (memoryCache.size > CACHE_CONFIG.maxMemoryItems) {
            const oldestKey = memoryCache.keys().next().value;
            memoryCache.delete(oldestKey);
        }
        
        // 写入Redis
        await redis.setex(fullKey, ttl, JSON.stringify(value));
        
        return true;
    } catch (err) {
        console.log('[Cache] 写入失败:', err.message);
        return false;
    }
}

/**
 * 获取缓存
 * @param {string} key - 缓存键
 * @returns {*} 缓存值，不存在返回null
 */
async function getCache(key) {
    const fullKey = CACHE_CONFIG.prefix + key;
    
    try {
        // 先查内存缓存（L1）
        const memCached = memoryCache.get(fullKey);
        if (memCached && memCached.expireAt > Date.now()) {
            return memCached.value;
        }
        
        // 再查Redis（L2）
        const cached = await redis.get(fullKey);
        if (cached) {
            const value = JSON.parse(cached);
            // 回写到内存缓存
            memoryCache.set(fullKey, {
                value,
                expireAt: Date.now() + (CACHE_CONFIG.defaultTTL * 1000)
            });
            return value;
        }
        
        return null;
    } catch (err) {
        console.log('[Cache] 读取失败:', err.message);
        return null;
    }
}

/**
 * 删除缓存
 * @param {string} key - 缓存键
 */
async function deleteCache(key) {
    const fullKey = CACHE_CONFIG.prefix + key;
    
    try {
        memoryCache.delete(fullKey);
        await redis.del(fullKey);
        return true;
    } catch (err) {
        console.log('[Cache] 删除失败:', err.message);
        return false;
    }
}

/**
 * 清除匹配模式的缓存
 * @param {string} pattern - 匹配模式
 */
async function clearCachePattern(pattern) {
    const fullPattern = CACHE_CONFIG.prefix + pattern;
    
    try {
        // 清除内存缓存
        for (const key of memoryCache.keys()) {
            if (key.includes(pattern)) {
                memoryCache.delete(key);
            }
        }
        
        // 清除Redis缓存
        let cursor = '0';
        do {
            const [newCursor, keys] = await redis.scan(cursor, 'MATCH', fullPattern, 'COUNT', 100);
            cursor = newCursor;
            if (keys.length > 0) {
                await redis.del(keys);
            }
        } while (cursor !== '0');
        
        return true;
    } catch (err) {
        console.log('[Cache] 批量清除失败:', err.message);
        return false;
    }
}

/**
 * 缓存包装器
 * 自动缓存函数结果
 * @param {string} key - 缓存键
 * @param {Function} fn - 要执行的函数
 * @param {number} ttl - 缓存时间（秒）
 */
async function cacheWrapper(key, fn, ttl = CACHE_CONFIG.defaultTTL) {
    // 尝试获取缓存
    const cached = await getCache(key);
    if (cached !== null) {
        return cached;
    }
    
    // 执行函数
    const result = await fn();
    
    // 写入缓存
    if (result !== null && result !== undefined) {
        await setCache(key, result, ttl);
    }
    
    return result;
}

/**
 * 获取缓存统计
 */
function getCacheStats() {
    return {
        memoryItems: memoryCache.size,
        maxItems: CACHE_CONFIG.maxMemoryItems
    };
}

module.exports = {
    setCache,
    getCache,
    deleteCache,
    clearCachePattern,
    cacheWrapper,
    getCacheStats
};
