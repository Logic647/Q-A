/**
 * 公共工具函数
 */

const redis = require('../config/redis');

/**
 * 清除问答缓存
 * @param {string} specificQuestion - 可选，指定问题文本进行精准清除
 */
async function clearQACache(specificQuestion = null) {
    try {
        const keys = [];
        let cursor = '0';
        do {
            const [newCursor, batch] = await redis.scan(cursor, 'MATCH', 'qa:*', 'COUNT', 100);
            cursor = newCursor;
            keys.push(...batch);
        } while (cursor !== '0');

        if (keys.length === 0) return;

        if (specificQuestion) {
            const clean = specificQuestion.replace(/[？?！!。，,、\s]/g, '');
            const toDelete = keys.filter(k => {
                const keyText = k.replace('qa:', '');
                return keyText.includes(clean) || clean.includes(keyText);
            });
            if (toDelete.length > 0) await redis.del(toDelete);
        } else {
            await redis.del(keys);
        }
    } catch (e) {
        console.log('[Cache] 清除缓存失败:', e.message);
    }
}

/**
 * 格式化分页参数
 */
function parsePagination(query) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize) || 20));
    const offset = (page - 1) * pageSize;
    return { page, pageSize, offset };
}

/**
 * 统一成功响应
 */
function success(res, data = null, msg = 'success') {
    res.json({ code: 0, data, msg });
}

/**
 * 统一失败响应
 */
function fail(res, msg = '操作失败', code = -1, statusCode = 200) {
    res.status(statusCode).json({ code, msg });
}

module.exports = {
    clearQACache,
    parsePagination,
    success,
    fail
};
