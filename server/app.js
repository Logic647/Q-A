const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();

// 加载 .env 文件到 process.env（不覆盖已存在的环境变量，便于测试和 CI 注入）
try {
    const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match && process.env[match[1].trim()] === undefined) {
            process.env[match[1].trim()] = match[2].trim();
        }
    });
} catch (e) {}

for (const name of ['ADMIN_KEY', 'ADMIN_USERNAME', 'ADMIN_PASSWORD']) {
    if (!process.env[name]) {
        throw new Error(`缺少必填环境变量: ${name}`);
    }
}

// 导入中间件
const { limiters } = require('./middleware/rateLimit');
const { ipWhitelist } = require('./middleware/ipWhitelist');
const { requestTimeout, slowRequestLogger } = require('./middleware/timeout');

// CORS: 仅允许小程序和管理后台
const ALLOWED_ORIGINS = [
    'https://servicewechat.com',
    'https://logic-yjb.top',
    'https://www.logic-yjb.top'
];

function isAllowedOrigin(origin) {
    if (ALLOWED_ORIGINS.includes(origin)) return true;
    try {
        const url = new URL(origin);
        return ['http:', 'https:'].includes(url.protocol)
            && ['localhost', '127.0.0.1'].includes(url.hostname);
    } catch (e) {
        return false;
    }
}

app.use(cors({
    origin: (origin, callback) => {
        // 允许无 origin 的请求（如小程序、curl、服务器端调用）
        if (!origin) {
            return callback(null, true);
        }
        // 检查白名单
        if (isAllowedOrigin(origin)) {
            callback(null, true);
        } else {
            console.log('[CORS] 拒绝跨域请求:', origin);
            callback(new Error('跨域请求被拒绝'));
        }
    },
    credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use('/public', express.static(path.join(__dirname, 'public')));

// 请求超时和慢请求日志
app.use(requestTimeout(30000));
app.use(slowRequestLogger(5000));

// 根路径和记事本页面
app.get('/', (req, res) => res.redirect('/public/notepad.html'));
app.get('/notepad', (req, res) => res.redirect('/public/notepad.html'));
app.get('/notepad.html', (req, res) => res.sendFile(path.join(__dirname, 'public/notepad.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/admin/', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));

// Admin 认证中间件: 检查 X-Admin-Key 请求头
const ADMIN_KEY = process.env.ADMIN_KEY;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
function adminAuth(req, res, next) {
    const key = req.headers['x-admin-key'];
    if (key !== ADMIN_KEY) {
        return res.status(401).json({ code: -1, msg: '管理员认证失败' });
    }
    next();
}

// Admin 登录接口（不需要认证）
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        res.json({ code: 0, token: ADMIN_KEY, msg: '登录成功' });
    } else {
        res.json({ code: -1, msg: '用户名或密码错误' });
    }
});

app.use('/api/user', limiters.login, require('./routes/user'));
app.use('/api/qa', limiters.qa, require('./routes/qa'));
app.use('/api/info', limiters.api, require('./routes/info'));
app.use('/api/admin', limiters.api, adminAuth, ipWhitelist, require('./routes/admin'));

// 全局错误处理中间件
app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            code: -1,
            msg: '请求数据过大，请压缩内容后重试',
            maxSize: '2MB'
        });
    }
    console.error('[Server Error]', err.message);
    res.status(500).json({ code: -1, msg: '服务器内部错误' });
});

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

async function start() {
    const PORT = process.env.PORT || 3000;
    return new Promise((resolve, reject) => {
        const server = app.listen(PORT, '0.0.0.0', async () => {
            console.log(`服务器已启动: http://0.0.0.0:${PORT}`);
            try {
                await initVectorIndex();
                resolve(server);
            } catch (e) {
                reject(e);
            }
        });
        server.on('error', reject);
    });
}

if (require.main === module) {
    start().catch(e => {
        console.error('服务器启动失败:', e);
        process.exitCode = 1;
    });
}

module.exports = { app, start };
