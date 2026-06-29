const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/db');

// 获取待审核回答列表
router.get('/review/pending', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query(`SELECT a.answer_id, a.answer_text, a.source, a.created_at,
                    q.question_text, q.category,
                    u.nickname AS responder_name
                    FROM answer a
                    INNER JOIN question q ON a.question_id = q.question_id
                    LEFT JOIN [user] u ON a.responder_id = u.user_id
                    WHERE a.review_status = 0 AND a.source = 2
                    ORDER BY a.created_at ASC`);

        res.json({ code: 0, data: result.recordset });
    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

// 审核操作
router.post('/review', async (req, res) => {
    try {
        const { answer_id, reviewer_id, action, comment } = req.body;
        const pool = await getPool();

        // 插入审核记录
        await pool.request()
            .input('aid', sql.Int, answer_id)
            .input('rid', sql.Int, reviewer_id)
            .input('act', sql.TinyInt, action)
            .input('cmt', sql.NVarChar, comment || '')
            .query(`INSERT INTO review (answer_id, reviewer_id, action, comment)
                    VALUES (@aid, @rid, @act, @cmt)`);

        // 更新回答审核状态
        const status = action === 1 ? 1 : 2;
        await pool.request()
            .input('aid', sql.Int, answer_id)
            .input('status', sql.TinyInt, status)
            .query('UPDATE answer SET review_status = @status WHERE answer_id = @aid');

        // 审核通过：写入知识库
        if (action === 1) {
            const ans = await pool.request()
                .input('aid', sql.Int, answer_id)
                .query(`SELECT a.answer_text, q.question_text, q.category
                        FROM answer a INNER JOIN question q ON a.question_id = q.question_id
                        WHERE a.answer_id = @aid`);

            if (ans.recordset.length > 0) {
                const row = ans.recordset[0];
                await pool.request()
                    .input('qt', sql.NVarChar, row.question_text)
                    .input('at', sql.NVarChar, row.answer_text)
                    .input('cat', sql.NVarChar, row.category)
                    .input('src', sql.NVarChar, '审核入库')
                    .query(`INSERT INTO knowledge_base (question_text, answer_text, category, source)
                            VALUES (@qt, @at, @cat, @src)`);
            }
        }

        res.json({ code: 0, msg: action === 1 ? '审核通过并入库' : '已拒绝' });
    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

// 数据统计
router.get('/stats', async (req, res) => {
    try {
        const pool = await getPool();

        const [questions, answers, kb, lowScore] = await Promise.all([
            pool.request().query('SELECT COUNT(*) AS total, SUM(CASE WHEN status=0 THEN 1 ELSE 0 END) AS pending FROM question'),
            pool.request().query('SELECT COUNT(*) AS total, SUM(CASE WHEN source=1 THEN 1 ELSE 0 END) AS auto_count, SUM(CASE WHEN source=2 THEN 1 ELSE 0 END) AS manual_count FROM answer'),
            pool.request().query('SELECT COUNT(*) AS total, SUM(CASE WHEN source=N\'审核入库\' THEN 1 ELSE 0 END) AS from_review FROM knowledge_base'),
            pool.request().query('SELECT COUNT(*) AS count FROM feedback WHERE score <= 2')
        ]);

        res.json({
            code: 0,
            data: {
                questions: questions.recordset[0],
                answers: answers.recordset[0],
                knowledge_base: kb.recordset[0],
                low_score_count: lowScore.recordset[0].count
            }
        });
    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

// 低分回答列表
router.get('/low-score', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query(`SELECT a.answer_id, a.answer_text, a.avg_score, a.score_count,
                    q.question_text, q.category
                    FROM answer a
                    INNER JOIN question q ON a.question_id = q.question_id
                    WHERE a.score_count >= 2 AND a.avg_score < 3.0
                    ORDER BY a.avg_score ASC`);

        res.json({ code: 0, data: result.recordset });
    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

module.exports = router;
