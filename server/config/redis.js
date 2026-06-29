const Redis = require('ioredis');

const redis = new Redis({
    host: '127.0.0.1',
    port: 6379,
    // password: 'your_password', // 如果设置了密码
    retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
    }
});

redis.on('error', (err) => {
    console.log('Redis连接错误:', err.message);
});

module.exports = redis;
