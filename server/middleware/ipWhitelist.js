/**
 * IP白名单中间件
 * 用于保护管理后台API
 */

// 允许的IP地址列表
const ADMIN_IP_WHITELIST = [
    '127.0.0.1',
    '::1',
    '::ffff:127.0.0.1',
    // 添加你的管理IP
    // 'your.office.ip.here'
];

// 是否启用IP白名单（可通过环境变量控制）
const ENABLE_IP_WHITELIST = process.env.ENABLE_ADMIN_IP_WHITELIST === 'true';

/**
 * IP白名单中间件
 * 仅在启用时生效
 */
function ipWhitelist(req, res, next) {
    // 未启用白名单时直接放行
    if (!ENABLE_IP_WHITELIST) {
        return next();
    }

    const clientIp = req.ip || req.connection.remoteAddress || '';
    
    // 检查IP是否在白名单中
    const isAllowed = ADMIN_IP_WHITELIST.some(ip => {
        // 支持CIDR格式的IP匹配（简单版本）
        if (ip.includes('/')) {
            // TODO: 实现CIDR匹配
            return false;
        }
        return clientIp === ip || clientIp.endsWith(ip);
    });

    if (!isAllowed) {
        console.log(`[IP白名单] 拒绝访问: ${clientIp}`);
        return res.status(403).json({
            code: -1,
            msg: '您的IP地址不在允许访问的范围内'
        });
    }

    next();
}

/**
 * 动态添加IP到白名单
 */
function addIpToWhitelist(ip) {
    if (!ADMIN_IP_WHITELIST.includes(ip)) {
        ADMIN_IP_WHITELIST.push(ip);
        return true;
    }
    return false;
}

/**
 * 从白名单移除IP
 */
function removeIpFromWhitelist(ip) {
    const index = ADMIN_IP_WHITELIST.indexOf(ip);
    if (index > -1) {
        ADMIN_IP_WHITELIST.splice(index, 1);
        return true;
    }
    return false;
}

/**
 * 获取当前白名单
 */
function getWhitelist() {
    return [...ADMIN_IP_WHITELIST];
}

module.exports = {
    ipWhitelist,
    addIpToWhitelist,
    removeIpFromWhitelist,
    getWhitelist,
    ADMIN_IP_WHITELIST
};
