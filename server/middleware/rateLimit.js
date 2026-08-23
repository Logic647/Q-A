/**
 * 速率限制中间件
 * 防止API被滥用
 */

const redis = require('../config/redis');

// 内存存储（用于Redis不可用时的降级方案）
const memoryStore = new Map();

/**
 * 创建速率限制中间件
 * @param {Object} options
 * @param {number} options.windowMs - 时间窗口（毫秒）
 * @param {number} options.max - 最大请求数
 * @param {string} options.message - 超限提示
 * @param {Function} options.keyGenerator - 自定义key生成器
 */
function rateLimit(options = {}) {
    const {
        windowMs = 60 * 1000, // 默认1分钟
        max = 60, // 默认60次
        message = '请求过于频繁，请稍后再试',
        keyGenerator = (req) => req.ip || req.connection.remoteAddress
    } = options;

    return async (req, res, next) => {
        const key = `ratelimit:${keyGenerator(req)}`;
        
        try {
            // 尝试使用Redis
            const current = await redis.incr(key);
            if (current === 1) {
                await redis.expire(key, Math.ceil(windowMs / 1000));
            }
            
            if (current > max) {
                return res.status(429).json({
                    code: -1,
                    msg: message,
                    retryAfter: Math.ceil(windowMs / 1000)
                });
            }
            
            // 添加速率限制头
            res.set({
                'X-RateLimit-Limit': max,
                'X-RateLimit-Remaining': Math.max(0, max - current),
                'X-RateLimit-Reset': new Date(Date.now() + windowMs).toISOString()
            });
            
            next();
        } catch (err) {
            // Redis不可用时使用内存存储
            const now = Date.now();
            const record = memoryStore.get(key) || { count: 0, resetTime: now + windowMs };
            
            if (now > record.resetTime) {
                record.count = 0;
                record.resetTime = now + windowMs;
            }
            
            record.count++;
            memoryStore.set(key, record);
            
            if (record.count > max) {
                return res.status(429).json({
                    code: -1,
                    msg: message,
                    retryAfter: Math.ceil((record.resetTime - now) / 1000)
                });
            }
            
            next();
        }
    };
}

// 预设的限制策略
const limiters = {
    // 通用API限制：每分钟60次
    api: rateLimit({ windowMs: 60000, max: 60 }),
    
    // 登录接口限制：每分钟5次
    login: rateLimit({
        windowMs: 60000,
        max: 5,
        message: '登录尝试过多，请1分钟后再试'
    }),
    
    // 问答接口限制：每分钟30次
    qa: rateLimit({
        windowMs: 60000,
        max: 30,
        message: '提问过于频繁，请稍后再试'
    }),
    
    // 严格限制：每小时10次
    strict: rateLimit({
        windowMs: 3600000,
        max: 10,
        message: '操作过于频繁，请1小时后再试'
    })
};

// 定期清理内存存储
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of memoryStore.entries()) {
        if (now > value.resetTime) {
            memoryStore.delete(key);
        }
    }
}, 60000);

module.exports = { rateLimit, limiters };
