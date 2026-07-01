const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/db');

// ========== 数据统计 ==========
router.get('/stats', async (req, res) => {
    try {
        const pool = await getPool();
        const [questions, answers, kb, lowScore] = await Promise.all([
            pool.request().query('SELECT COUNT(*) AS total, SUM(CASE WHEN status=0 THEN 1 ELSE 0 END) AS pending FROM question'),
            pool.request().query('SELECT COUNT(*) AS total, SUM(CASE WHEN source=1 THEN 1 ELSE 0 END) AS auto_count, SUM(CASE WHEN source=2 THEN 1 ELSE 0 END) AS manual_count FROM answer'),
            pool.request().query('SELECT COUNT(*) AS total, SUM(CASE WHEN source=N\'审核入库\' THEN 1 ELSE 0 END) AS from_review FROM knowledge_base'),
            pool.request().query('SELECT COUNT(*) AS count FROM feedback WHERE score <= 2')
        ]);
        res.json({ code: 0, data: {
            questions: questions.recordset[0],
            answers: answers.recordset[0],
            knowledge_base: kb.recordset[0],
            low_score_count: lowScore.recordset[0].count
        }});
    } catch (err) { res.status(500).json({ code: -1, msg: err.message }); }
});

// ========== 审核管理 ==========
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
                    WHERE a.review_status = 0
                    ORDER BY a.created_at ASC`);
        res.json({ code: 0, data: result.recordset });
    } catch (err) { res.status(500).json({ code: -1, msg: err.message }); }
});

router.post('/review', async (req, res) => {
    try {
        const { answer_id, reviewer_id, action, comment } = req.body;
        const pool = await getPool();
        await pool.request()
            .input('aid', sql.Int, answer_id)
            .input('rid', sql.Int, reviewer_id)
            .input('act', sql.TinyInt, action)
            .input('cmt', sql.NVarChar, comment || '')
            .query(`INSERT INTO review (answer_id, reviewer_id, action, comment) VALUES (@aid, @rid, @act, @cmt)`);
        const status = action === 1 ? 1 : 2;
        await pool.request()
            .input('aid', sql.Int, answer_id)
            .input('status', sql.TinyInt, status)
            .query('UPDATE answer SET review_status = @status WHERE answer_id = @aid');
        if (action === 1) {
            const ans = await pool.request()
                .input('aid', sql.Int, answer_id)
                .query(`SELECT a.answer_text, a.question_id, q.question_text, q.category
                        FROM answer a INNER JOIN question q ON a.question_id = q.question_id
                        WHERE a.answer_id = @aid`);
            if (ans.recordset.length > 0) {
                const row = ans.recordset[0];
                // 写入知识库
                await pool.request()
                    .input('qt', sql.NVarChar, row.question_text)
                    .input('at', sql.NVarChar, row.answer_text)
                    .input('cat', sql.NVarChar, row.category || '未分类')
                    .input('src', sql.NVarChar, '审核入库')
                    .query(`INSERT INTO knowledge_base (question_text, answer_text, category, source)
                            VALUES (@qt, @at, @cat, @src)`);
                // 同步更新问题状态为已回答
                await pool.request()
                    .input('qid', sql.Int, row.question_id)
                    .query('UPDATE question SET status = 1 WHERE question_id = @qid');
            }
        }
        res.json({ code: 0, msg: action === 1 ? '审核通过并入库' : '已拒绝' });
    } catch (err) { res.status(500).json({ code: -1, msg: err.message }); }
});

// ========== 低分回答重置 ==========
router.get('/low-score', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query(`SELECT a.answer_id, a.answer_text, a.avg_score, a.score_count,
                    q.question_id, q.question_text, q.category
                    FROM answer a
                    INNER JOIN question q ON a.question_id = q.question_id
                    WHERE a.score_count >= 2 AND a.avg_score < 3.0
                    ORDER BY a.avg_score ASC`);
        res.json({ code: 0, data: result.recordset });
    } catch (err) { res.status(500).json({ code: -1, msg: err.message }); }
});

router.post('/low-score/reset', async (req, res) => {
    try {
        const { question_id } = req.body;
        const pool = await getPool();
        // 只删除低分回答（avg_score < 3），保留其他回答
        await pool.request()
            .input('qid', sql.Int, question_id)
            .query('DELETE FROM answer WHERE question_id = @qid AND avg_score < 3.0 AND score_count >= 2');
        // 重置问题状态为未回答
        await pool.request()
            .input('qid', sql.Int, question_id)
            .query('UPDATE question SET status = 0 WHERE question_id = @qid');
        // 从知识库中移除相关条目
        await pool.request()
            .input('qid', sql.Int, question_id)
            .query(`DELETE FROM knowledge_base WHERE question_text IN
                    (SELECT question_text FROM question WHERE question_id = @qid)`);
        res.json({ code: 0, msg: '已重置为待回答问题' });
    } catch (err) { res.status(500).json({ code: -1, msg: err.message }); }
});

// ========== 身份认证审核 ==========
router.get('/verify/pending', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query(`SELECT v.verify_id, v.user_id, v.real_name, v.student_id, v.image_url, v.created_at,
                    u.nickname FROM user_verify v
                    LEFT JOIN [user] u ON v.user_id = u.user_id
                    WHERE v.status = 0 ORDER BY v.created_at ASC`);
        res.json({ code: 0, data: result.recordset });
    } catch (err) { res.status(500).json({ code: -1, msg: err.message }); }
});

router.post('/verify/review', async (req, res) => {
    try {
        const { verify_id, user_id, action, remark } = req.body; // action: 1=通过 2=拒绝
        const pool = await getPool();
        await pool.request()
            .input('vid', sql.Int, verify_id)
            .input('act', sql.TinyInt, action)
            .input('rmt', sql.NVarChar, remark || '')
            .query('UPDATE user_verify SET status = @act, remark = @rmt, reviewed_at = GETDATE() WHERE verify_id = @vid');
        if (action === 1) {
            await pool.request()
                .input('uid', sql.Int, user_id)
                .query('UPDATE [user] SET role = 1, auth_status = 1, updated_at = GETDATE() WHERE user_id = @uid');
        }
        res.json({ code: 0, msg: action === 1 ? '认证通过' : '已拒绝' });
    } catch (err) { res.status(500).json({ code: -1, msg: err.message }); }
});

// ========== 已认证用户管理 ==========
router.get('/verified/list', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query(`SELECT u.user_id, u.nickname, u.real_name, u.student_id, u.role, u.auth_status,
                    v.remark, v.created_at AS verify_time
                    FROM [user] u
                    LEFT JOIN user_verify v ON u.user_id = v.user_id AND v.status = 1
                    WHERE u.auth_status = 1
                    ORDER BY v.created_at DESC`);
        res.json({ code: 0, data: result.recordset });
    } catch (err) { res.status(500).json({ code: -1, msg: err.message }); }
});

router.post('/verified/update', async (req, res) => {
    try {
        const { user_id, remark } = req.body;
        const pool = await getPool();
        await pool.request()
            .input('uid', sql.Int, user_id)
            .input('rmt', sql.NVarChar, remark || '')
            .query(`UPDATE user_verify SET remark = @rmt WHERE user_id = @uid AND status = 1`);
        res.json({ code: 0, msg: '备注已更新' });
    } catch (err) { res.status(500).json({ code: -1, msg: err.message }); }
});

router.post('/verified/revoke', async (req, res) => {
    try {
        const { user_id } = req.body;
        const pool = await getPool();
        // 回收权限：重置 auth_status 和 role
        await pool.request()
            .input('uid', sql.Int, user_id)
            .query('UPDATE [user] SET auth_status = 0, role = 0, updated_at = GETDATE() WHERE user_id = @uid');
        // 标记认证记录为已撤销
        await pool.request()
            .input('uid', sql.Int, user_id)
            .query('UPDATE user_verify SET status = 3 WHERE user_id = @uid AND status = 1');
        res.json({ code: 0, msg: '权限已回收' });
    } catch (err) { res.status(500).json({ code: -1, msg: err.message }); }
});

// ========== 知识库 CRUD ==========
router.get('/kb/list', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query(`SELECT kb_id, question_text, answer_text, category, source, hit_count, is_active, created_at
                    FROM knowledge_base ORDER BY kb_id DESC`);
        res.json({ code: 0, data: result.recordset });
    } catch (err) { res.status(500).json({ code: -1, msg: err.message }); }
});

router.post('/kb/add', async (req, res) => {
    try {
        const { question_text, answer_text, category } = req.body;
        if (!question_text || !answer_text) return res.json({ code: -1, msg: '请填写完整' });
        const pool = await getPool();
        await pool.request()
            .input('qt', sql.NVarChar, question_text)
            .input('at', sql.NVarChar, answer_text)
            .input('cat', sql.NVarChar, category || '其他')
            .input('src', sql.NVarChar, '管理员添加')
            .query(`INSERT INTO knowledge_base (question_text, answer_text, category, source, is_active)
                    VALUES (@qt, @at, @cat, @src, 1)`);
        res.json({ code: 0, msg: '添加成功' });
    } catch (err) { res.status(500).json({ code: -1, msg: err.message }); }
});

router.post('/kb/update', async (req, res) => {
    try {
        const { kb_id, question_text, answer_text, category } = req.body;
        if (!kb_id) return res.json({ code: -1, msg: '缺少条目ID' });
        const pool = await getPool();
        await pool.request()
            .input('id', sql.Int, kb_id)
            .input('qt', sql.NVarChar, question_text)
            .input('at', sql.NVarChar, answer_text)
            .input('cat', sql.NVarChar, category)
            .query(`UPDATE knowledge_base SET question_text = @qt, answer_text = @at, category = @cat
                    WHERE kb_id = @id`);
        res.json({ code: 0, msg: '更新成功' });
    } catch (err) { res.status(500).json({ code: -1, msg: err.message }); }
});

router.post('/kb/delete', async (req, res) => {
    try {
        const { kb_id } = req.body;
        if (!kb_id) return res.json({ code: -1, msg: '缺少条目ID' });
        const pool = await getPool();
        await pool.request()
            .input('id', sql.Int, kb_id)
            .query('DELETE FROM knowledge_base WHERE kb_id = @id');
        res.json({ code: 0, msg: '删除成功' });
    } catch (err) { res.status(500).json({ code: -1, msg: err.message }); }
});

module.exports = router;
