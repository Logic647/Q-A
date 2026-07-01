const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use('/api/user', require('./routes/user'));
app.use('/api/qa', require('./routes/qa'));
app.use('/api/info', require('./routes/info'));
app.use('/api/admin', require('./routes/admin'));

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
