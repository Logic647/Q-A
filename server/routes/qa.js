const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/db');
const { askLLM } = require('../services/llm');
const redis = require('../config/redis');
const { retrieveKnowledge } = require('../services/kg');

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

        // 2. 并行检索：图谱 + SQL 同时执行
        const [graphKnowledge, sqlKnowledge] = await Promise.all([
            retrieveKnowledge(question_text).catch(() => []),
            (async () => {
                try {
                    const pool = await getPool();
                    const r = await pool.request()
                        .input('q', sql.NVarChar, `%${qClean}%`)
                        .query(`SELECT TOP 3 question_text, answer_text, category
                                FROM knowledge_base WHERE is_active = 1
                                AND (question_text LIKE @q OR keywords LIKE @q)
                                ORDER BY hit_count DESC`);
                    return r.recordset.map(row =>
                        `【${row.category || '通用'}】${row.question_text}：${row.answer_text}`
                    );
                } catch (e) { return []; }
            })()
        ]);

        const knowledge = [...graphKnowledge, ...sqlKnowledge];

        // 3. SQL 精确匹配时直接返回（秒级响应，跳过 LLM）
        try {
            const pool = await getPool();
            const exact = await pool.request()
                .input('q', sql.NVarChar, qClean)
                .query(`SELECT TOP 1 answer_text, category FROM knowledge_base
                        WHERE is_active = 1 AND REPLACE(REPLACE(REPLACE(question_text,'?',''),'!',''),'。','') = @q`);
            if (exact.recordset.length > 0) {
                const kb = exact.recordset[0];
                const result = {
                    question_id: Date.now(),
                    channel: 1,
                    answer: kb.answer_text,
                    category: kb.category || '知识库',
                    source: 'sql_exact'
                };
                try { await redis.setex(`qa:${qClean}`, CACHE_TTL, JSON.stringify(result)); } catch (e) {}
                return res.json({ code: 0, data: result, source: 'sql' });
            }
        } catch (e) {}

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

        const hasKnowledge = knowledge.length > 0;

        // 6. 知识库为空时记录待回答
        if (!hasKnowledge) {
            try {
                const pool = await getPool();
                const qResult = await pool.request()
                    .input('uid', sql.Int, user_id || 0)
                    .input('qt', sql.NVarChar, question_text)
                    .query(`INSERT INTO question (user_id, question_text, category, status)
                            VALUES (@uid, @qt, '未分类', 0);
                            SELECT SCOPE_IDENTITY() AS question_id`);
                const questionId = qResult.recordset[0]?.question_id;
                if (questionId) {
                    await pool.request()
                        .input('qid', sql.Int, questionId)
                        .input('ans', sql.NVarChar, answer)
                        .query(`INSERT INTO answer (question_id, answer_text, source, review_status)
                                VALUES (@qid, @ans, 1, 1)`);
                }
            } catch (e) {}
        }

        const result = {
            question_id: Date.now(),
            channel: hasKnowledge ? 1 : 2,
            answer,
            category: hasKnowledge ? '知识库' : 'AI回答',
            source: hasKnowledge ? 'rag' : 'llm'
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
                    FROM question q LEFT JOIN [user] u ON q.user_id = u.user_id
                    WHERE q.status = 0 ORDER BY q.created_at ASC`);
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

module.exports = router;
