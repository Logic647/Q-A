/**
 * 请求超时中间件
 * 防止请求长时间挂起
 */

/**
 * 创建请求超时中间件
 * @param {number} timeout - 超时时间（毫秒）
 * @param {string} message - 超时提示
 */
function requestTimeout(timeout = 30000, message = '请求处理超时，请稍后重试') {
    return (req, res, next) => {
        // 设置超时计时器
        const timer = setTimeout(() => {
            if (!res.headersSent) {
                res.status(408).json({
                    code: -1,
                    msg: message,
                    timeout: timeout
                });
            }
        }, timeout);

        // 请求结束时清除计时器
        res.on('finish', () => clearTimeout(timer));
        res.on('close', () => clearTimeout(timer));

        next();
    };
}

/**
 * 慢请求日志
 * 记录处理时间过长的请求
 */
function slowRequestLogger(threshold = 5000) {
    return (req, res, next) => {
        const startTime = Date.now();

        res.on('finish', () => {
            const duration = Date.now() - startTime;
            if (duration > threshold) {
                console.log(`[SlowRequest] ${req.method} ${req.originalUrl} - ${duration}ms`);
            }
        });

        next();
    };
}

module.exports = { requestTimeout, slowRequestLogger };
