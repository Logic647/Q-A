const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/db');
const { askLLM } = require('../services/llm');
const { extractKeywordsRule } = require('../services/llm');
const redis = require('../config/redis');
const { retrieveKnowledge } = require('../services/kg');
const embedding = require('../services/embedding');

const CACHE_TTL = 3600;

// ============ RAG 问答核心 ============
router.post('/ask', async (req, res) => {
    try {
        const { user_id, question_text } = req.body;
        if (!question_text || !question_text.trim()) {
            return res.json({ code: -1, msg: '请输入问题' });
        }

        const qClean = question_text.replace(/[？?！!。，,、\s]/g, '');

        // 1. Redis 缓存
        try {
            const cached = await redis.get(`qa:${qClean}`);
            if (cached) return res.json({ code: 0, data: JSON.parse(cached), cached: true });
        } catch (e) {}

        // 2. 并行检索：图谱 + SQL知识库
        const [graphKnowledge, sqlKnowledge] = await Promise.all([
            retrieveKnowledge(question_text).catch(() => []),
            (async () => {
                try {
                    const pool = await getPool();
                    const r = await pool.request()
                        .input('q', sql.NVarChar, `%${qClean}%`)
                        .query(`SELECT TOP 3 question_text, answer_text, category
                                FROM knowledge_base WHERE is_active = 1
                                AND (question_text LIKE @q OR keywords LIKE @q OR answer_text LIKE @q)
                                ORDER BY hit_count DESC`);
                    return r.recordset.map(row =>
                        `【${row.category || '通用'}】${row.question_text}：${row.answer_text}`
                    );
                } catch (e) { return []; }
            })()
        ]);

        let knowledge = [...graphKnowledge, ...sqlKnowledge];

        // 3.5 向量语义搜索（Embedding）
        if (knowledge.length < 2 && embedding.isConfigured()) {
            try {
                const queryVector = await embedding.getEmbedding(question_text);
                if (queryVector) {
                    const vectorResults = embedding.searchVectors(queryVector, 3);
                    for (const vr of vectorResults) {
                        const item = `【${vr.category || '向量匹配'}】${vr.question_text || vr.text}：${vr.answer_text || ''}`;
                        const key = item.substring(0, 20);
                        if (!knowledge.some(k => k.substring(0, 20) === key)) {
                            knowledge.push(item);
                        }
                    }
                }
            } catch (e) {
                console.log('[Embedding] 搜索失败:', e.message);
            }
        }

        // 4. 同义词扩展检索
        if (knowledge.length < 2) {
            try {
                const pool = await getPool();
                const expandMap = {
                    '售货机': ['自动售货', '贩卖机', '自动贩卖'],
                    '贩卖机': ['自动售货', '售货机'],
                    '饮料': ['饮品'],
                    '咖啡': ['咖啡厅', '咖啡店'],
                    '上床下桌': ['床位', '床铺'],
                    '开门': ['开放时间', '营业时间'],
                    '怎么去': ['路线', '坐车', '公交', '地铁'],
                    '学费': ['费用', '收费标准'],
                    '食堂': ['餐厅', '饭堂'],
                    '空调': ['冷气'],
                    '打印': ['打印店', '复印'],
                    '快递': ['收发室', '取件'],
                    '超市': ['便利店', '商店'],
                };
                const expandWords = [];
                for (const [word, syns] of Object.entries(expandMap)) {
                    if (question_text.includes(word)) expandWords.push(word, ...syns);
                }
                if (expandWords.length > 0) {
                    // 只匹配 question_text 列（精确匹配问题主题）
                    const conditions = expandWords.map((_, i) => `question_text LIKE @ew${i}`).join(' OR ');
                    const req = pool.request();
                    expandWords.forEach((w, i) => req.input(`ew${i}`, sql.NVarChar, `%${w}%`));
                    const r = await req.query(`SELECT TOP 3 question_text, answer_text, category
                        FROM knowledge_base WHERE is_active = 1 AND (${conditions})
                        ORDER BY hit_count DESC`);
                    const existingTexts = new Set(knowledge.map(k => k.substring(0, 20)));
                    for (const row of r.recordset) {
                        const item = `【${row.category || '通用'}】${row.question_text}：${row.answer_text}`;
                        if (!existingTexts.has(item.substring(0, 20))) {
                            knowledge.push(item);
                            existingTexts.add(item.substring(0, 20));
                        }
                    }
                }
            } catch (e) {}
        }

        // 4. 图谱和KB都没有结果时，搜索历史问答（严格匹配）
        if (knowledge.length === 0) {
            try {
                const pool = await getPool();
                const r = await pool.request()
                    .input('q', sql.NVarChar, qClean)
                    .query(`SELECT TOP 1 q.question_text, a.answer_text, q.category
                            FROM question q
                            INNER JOIN answer a ON q.question_id = a.question_id
                            WHERE q.status = 1 AND a.review_status = 1
                            AND (q.question_text = @q OR q.question_text LIKE @q + '%' OR @q LIKE '%' + q.question_text + '%')
                            ORDER BY q.created_at DESC`);
                if (r.recordset.length > 0) {
                    const row = r.recordset[0];
                    knowledge = [`【${row.category || '历史回答'}】${row.question_text}：${row.answer_text}`];
                }
            } catch (e) {}
        }

        // 5. 组装知识上下文，交给 LLM 生成回答（始终经过 LLM）

        // 4. 组装知识上下文
        const context = knowledge.length > 0
            ? knowledge.map((k, i) => `${i + 1}. ${k}`).join('\n')
            : '';

        // 5. 调用 LLM 生成回答
        let answer = await askLLM(question_text, context);

        // LLM 失败时，用原始知识数据兜底
        if (!answer || !answer.trim()) {
            if (knowledge.length > 0) {
                answer = knowledge.join('\n\n');
            } else {
                answer = '这个问题暂时还没有被收录，但你的问题已经被记录啦，后续会逐步解答的～';
            }
        }

        // 判断是否需要记录到待回答（回答为未收录兜底文案时记录）
        const fallbackKeywords = ['还没有被收录', '后续会逐步解答', '后续会有更详细', '已经被记录', '已经记下', '暂时没有明确', '暂时无法回答', '记下来啦', '记下啦'];
        const isUn收录 = fallbackKeywords.some(kw => answer.includes(kw));

        // 6. 未收录时记录待回答；有实质回答时自动入库
        if (isUn收录) {
            try {
                const pool = await getPool();
                const req = pool.request();
                // 去重
                req.input('qt', sql.NVarChar, qClean);
                const dup = await req.query(`SELECT TOP 1 question_id FROM question
                            WHERE question_text LIKE '%' + @qt + '%' OR @qt LIKE '%' + question_text + '%'`);
                if (dup.recordset.length === 0) {
                    // 插入问题
                    const insReq = pool.request();
                    insReq.input('uid', sql.Int, user_id || 0);
                    insReq.input('qt', sql.NVarChar, question_text);
                    await insReq.query(`INSERT INTO question (user_id, question_text, category, status)
                                VALUES (@uid, @qt, '未分类', 0)`);
                    // 获取 question_id
                    const idReq = pool.request();
                    idReq.input('qt', sql.NVarChar, question_text);
                    const idResult = await idReq.query('SELECT TOP 1 question_id FROM question WHERE question_text = @qt ORDER BY question_id DESC');
                    const questionId = idResult.recordset[0]?.question_id;
                    if (questionId) {
                        // 创建 answer 记录（占位符，等待学生补充或管理员审核）
                        try {
                            const ansReq = pool.request();
                            ansReq.input('qid', sql.Int, questionId);
                            ansReq.input('ans', sql.NVarChar, '该问题的答案正在整理中，请稍后查看');
                            await ansReq.query(`INSERT INTO answer (question_id, answer_text, source, review_status)
                                        VALUES (@qid, @ans, 1, 0)`);
                        } catch (e) { console.log('[QA] answer insert error:', e.message); }
                    } else {
                        console.log('[QA] question_id not found after insert');
                    }
                }
            } catch (e) { console.log('[QA] 记录待回答失败:', e.message); }
        } else if (knowledge.length > 0) {
            // 有知识库数据且 LLM 生成了实质回答：自动入库
            try {
                const pool = await getPool();
                const dup = await pool.request()
                    .input('qt', sql.NVarChar, qClean)
                    .query(`SELECT TOP 1 kb_id FROM knowledge_base
                            WHERE is_active = 1 AND question_text LIKE @q`, { q: `%${qClean}%` });
                if (dup.recordset.length === 0) {
                    await pool.request()
                        .input('qt', sql.NVarChar, question_text)
                        .input('at', sql.NVarChar, answer)
                        .input('cat', sql.NVarChar, 'RAG自动生成')
                        .input('src', sql.NVarChar, 'LLM生成')
                        .query(`INSERT INTO knowledge_base (question_text, answer_text, category, source)
                                VALUES (@qt, @at, @cat, @src)`);
                }
            } catch (e) {}
        }

        const result = {
            question_id: Date.now(),
            channel: isUn收录 ? 2 : 1,
            answer,
            category: isUn收录 ? 'AI回答' : '知识库',
            source: isUn收录 ? 'llm' : 'rag'
        };

        try { await redis.setex(`qa:${qClean}`, CACHE_TTL, JSON.stringify(result)); } catch (e) {}
        res.json({ code: 0, data: result, source: result.source });

    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

// ============ 其他接口保持不变 ============

router.get('/question/:id', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, parseInt(req.params.id))
            .query(`SELECT q.*, a.answer_text, a.source, a.avg_score, a.score_count
                    FROM question q LEFT JOIN answer a ON q.question_id = a.question_id
                    WHERE q.question_id = @id`);
        if (result.recordset.length === 0) return res.json({ code: -1, msg: '问题不存在' });
        res.json({ code: 0, data: result.recordset[0] });
    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

router.get('/history/:user_id', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('uid', sql.Int, parseInt(req.params.user_id))
            .query(`SELECT q.question_id, q.question_text, q.category, q.status, q.created_at,
                    a.answer_text, a.avg_score, a.score_count
                    FROM question q LEFT JOIN answer a ON q.question_id = a.question_id
                    WHERE q.user_id = @uid ORDER BY q.created_at DESC`);
        res.json({ code: 0, data: result.recordset });
    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

router.get('/pending', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query(`SELECT q.question_id, q.question_text, q.category, q.created_at,
                    u.nickname AS asker_name
                    FROM question q
                    LEFT JOIN [user] u ON q.user_id = u.user_id
                    WHERE q.status = 0
                    ORDER BY q.created_at DESC`);
        res.json({ code: 0, data: result.recordset });
    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

router.post('/answer', async (req, res) => {
    try {
        const { question_id, user_id, answer_text } = req.body;
        if (!question_id || !answer_text) return res.json({ code: -1, msg: '缺少必要参数' });
        const pool = await getPool();
        await pool.request()
            .input('qid', sql.Int, question_id)
            .input('uid', sql.Int, user_id || 0)
            .input('ans', sql.NVarChar, answer_text)
            .query(`INSERT INTO answer (question_id, responder_id, answer_text, source, review_status)
                    VALUES (@qid, @uid, @ans, 2, 0)`);
        await pool.request()
            .input('qid', sql.Int, question_id)
            .query('UPDATE question SET status = 1 WHERE question_id = @qid');
        res.json({ code: 0, msg: '回答已提交，等待审核' });
    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

router.post('/feedback', async (req, res) => {
    try {
        const { answer_id, user_id, score, comment } = req.body;
        if (!answer_id || !score) return res.json({ code: -1, msg: '缺少必要参数' });
        const pool = await getPool();
        await pool.request()
            .input('aid', sql.Int, answer_id)
            .input('uid', sql.Int, user_id || 0)
            .input('score', sql.TinyInt, score)
            .input('cmt', sql.NVarChar, comment || '')
            .query(`INSERT INTO feedback (answer_id, user_id, score, comment)
                    VALUES (@aid, @uid, @score, @cmt)`);
        const avgResult = await pool.request()
            .input('aid', sql.Int, answer_id)
            .query(`SELECT AVG(CAST(score AS FLOAT)) AS avg_score, COUNT(*) AS score_count
                    FROM feedback WHERE answer_id = @aid`);
        if (avgResult.recordset.length > 0) {
            const { avg_score, score_count } = avgResult.recordset[0];
            await pool.request()
                .input('aid', sql.Int, answer_id)
                .input('avg', sql.Decimal(5, 2), avg_score || 0)
                .input('cnt', sql.Int, score_count)
                .query('UPDATE answer SET avg_score = @avg, score_count = @cnt WHERE answer_id = @aid');
        }
        res.json({ code: 0, msg: '评价成功' });
    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

router.post('/suggest', async (req, res) => {
    try {
        const { category } = req.body;
        const pool = await getPool();
        let query = 'SELECT TOP 5 question_text FROM knowledge_base WHERE is_active = 1';
        if (category) query += ` AND category = @cat`;
        query += ' ORDER BY hit_count DESC';
        const request = pool.request();
        if (category) request.input('cat', sql.NVarChar, category);
        const result = await request.query(query);
        res.json({ code: 0, data: result.recordset.map(r => r.question_text) });
    } catch (err) {
        res.json({ code: 0, data: [] });
    }
});

// 构建向量索引（从知识库加载所有条目）
router.post('/build-vector-index', async (req, res) => {
    try {
        if (!embedding.isConfigured()) {
            return res.json({ code: -1, msg: '未配置 Embedding API Key' });
        }
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
        res.json({ code: 0, msg: `向量索引构建完成: ${count} 条` });
    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

// 查询向量索引状态
router.get('/vector-status', (req, res) => {
    const configured = embedding.isConfigured();
    res.json({
        code: 0,
        data: {
            configured,
            api_key_set: configured,
            model: configured ? 'BAAI/bge-m3' : '未配置'
        }
    });
});

module.exports = router;
