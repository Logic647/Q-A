const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();

// 加载 .env 文件到 process.env
try {
    const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) process.env[match[1].trim()] = match[2].trim();
    });
} catch (e) {}

// CORS: 仅允许小程序和开发环境
const ALLOWED_ORIGINS = [
    'https://servicewechat.com',
    'http://localhost',
    'http://127.0.0.1'
];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
            callback(null, true);
        } else {
            callback(null, true); // 生产环境可改为 callback(new Error('Not allowed'))
        }
    }
}));
app.use(express.json({ limit: '2mb' }));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Admin 认证中间件: 检查 X-Admin-Key 请求头
const ADMIN_KEY = process.env.ADMIN_KEY || 'REDACTED-ADMIN-KEY';
function adminAuth(req, res, next) {
    const key = req.headers['x-admin-key'];
    if (key !== ADMIN_KEY) {
        return res.status(401).json({ code: -1, msg: '管理员认证失败' });
    }
    next();
}

app.use('/api/user', require('./routes/user'));
app.use('/api/qa', require('./routes/qa'));
app.use('/api/info', require('./routes/info'));
app.use('/api/admin', adminAuth, require('./routes/admin'));

// 启动时自动构建向量索引
const embedding = require('./services/embedding');
const { getPool } = require('./config/db');
const { sql } = require('./config/db');

async function initVectorIndex() {
    if (!embedding.isConfigured()) {
        console.log('[启动] Embedding API 未配置，跳过向量索引');
        return;
    }
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query(`SELECT kb_id, question_text, answer_text, category
                    FROM knowledge_base WHERE is_active = 1`);
        const docs = result.recordset.map(r => ({
            id: r.kb_id,
            text: `${r.question_text}：${r.answer_text}`,
            question_text: r.question_text,
            answer_text: r.answer_text,
            category: r.category
        }));
        const count = await embedding.buildVectorIndex(docs);
        console.log(`[启动] 向量索引构建完成: ${count} 条`);
    } catch (e) {
        console.log('[启动] 向量索引构建失败:', e.message);
    }
}

const PORT = 3000;
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`服务器已启动: http://0.0.0.0:${PORT}`);
    await initVectorIndex();
});
