const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/db');
const embedding = require('../services/embedding');
const redis = require('../config/redis');

// 清除问答缓存（知识库变更时调用）
async function clearQACache(specificQuestion) {
    try {
        if (specificQuestion) {
            const clean = specificQuestion.replace(/[？?！!。，,、\s]/g, '');
            const keys = [];
            let cursor = '0';
            do {
                const [newCursor, batch] = await redis.scan(cursor, 'MATCH', 'qa:*', 'COUNT', 100);
                cursor = newCursor;
                keys.push(...batch);
            } while (cursor !== '0');
            if (keys.length > 0) {
                const toDelete = keys.filter(k => {
                    const keyText = k.replace('qa:', '');
                    return keyText.includes(clean) || clean.includes(keyText);
                });
                if (toDelete.length > 0) await redis.del(toDelete);
            }
        } else {
            const keys = [];
            let cursor = '0';
            do {
                const [newCursor, batch] = await redis.scan(cursor, 'MATCH', 'qa:*', 'COUNT', 100);
                cursor = newCursor;
                keys.push(...batch);
            } while (cursor !== '0');
            if (keys.length > 0) await redis.del(keys);
        }
    } catch (e) {}
}

// 知识库入库后自动向量化
async function autoVectorize(kbId, questionText, answerText, category) {
    if (!embedding.isConfigured()) return;
    try {
        await embedding.addVector(kbId, `${questionText}：${answerText}`, {
            id: kbId, question_text: questionText, answer_text: answerText, category
        });
    } catch (e) {
        console.log('[AutoVector] 向量化失败:', e.message);
    }
}

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
                    LEFT JOIN user u ON a.responder_id = u.user_id
                    WHERE a.review_status = 0
                    ORDER BY a.created_at ASC LIMIT 100`);
        res.json({ code: 0, data: result.recordset });
    } catch (err) { res.status(500).json({ code: -1, msg: err.message }); }
});

router.post('/review', async (req, res) => {
    try {
        const { answer_id, reviewer_id, action, comment } = req.body;
        const pool = await getPool();
        let questionText = null;

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
                questionText = row.question_text;
                const badPatterns = ['正在整理', '暂未收录', '正在收集', '待补充', '首先，用户的问题是', '根据规则'];
                const isBad = badPatterns.some(p => row.answer_text.includes(p));
                if (!isBad) {
                    await pool.request()
                        .input('qt', sql.NVarChar, row.question_text)
                        .input('at', sql.NVarChar, row.answer_text)
                        .input('cat', sql.NVarChar, row.category || '未分类')
                        .input('src', sql.NVarChar, '审核入库')
                        .query(`INSERT INTO knowledge_base (question_text, answer_text, category, source)
                                VALUES (@qt, @at, @cat, @src)`);
                    const kbResult = await pool.request()
                        .input('qt', sql.NVarChar, row.question_text)
                        .query('SELECT TOP 1 kb_id FROM knowledge_base WHERE question_text = @qt ORDER BY kb_id DESC');
                    if (kbResult.recordset.length > 0) {
                        await autoVectorize(kbResult.recordset[0].kb_id, row.question_text, row.answer_text, row.category);
                    }
                } else {
                    console.log('[审核] 跳过占位/推理回答:', row.question_text);
                }
                await pool.request()
                    .input('qid', sql.Int, row.question_id)
                    .query('UPDATE question SET status = 1 WHERE question_id = @qid');
            }
        }
        await clearQACache(questionText);
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
        // 先获取问题文本
        const qResult = await pool.request()
            .input('qid', sql.Int, question_id)
            .query('SELECT question_text FROM question WHERE question_id = @qid');
        const questionText = qResult.recordset[0]?.question_text;
        // 删除低分回答
        await pool.request()
            .input('qid', sql.Int, question_id)
            .query('DELETE FROM answer WHERE question_id = @qid AND avg_score < 3.0 AND score_count >= 2');
        // 重置问题状态
        await pool.request()
            .input('qid', sql.Int, question_id)
            .query('UPDATE question SET status = 0 WHERE question_id = @qid');
        // 从知识库中移除
        await pool.request()
            .input('qid', sql.Int, question_id)
            .query(`DELETE FROM knowledge_base WHERE question_text IN
                    (SELECT question_text FROM question WHERE question_id = @qid)`);
        await clearQACache(questionText);
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
                    LEFT JOIN user u ON v.user_id = u.user_id
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
            .query('UPDATE user_verify SET status = @act, remark = @rmt, reviewed_at = NOW() WHERE verify_id = @vid');
        if (action === 1) {
            await pool.request()
                .input('uid', sql.Int, user_id)
                .query('UPDATE user SET role = 1, auth_status = 1, updated_at = NOW() WHERE user_id = @uid');
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
                    FROM user u
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
                .query('UPDATE user SET auth_status = 0, role = 0, updated_at = NOW() WHERE user_id = @uid');
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
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const size = Math.min(100, Math.max(1, parseInt(req.query.size) || 50));
        const offset = (page - 1) * size;
        const [result, countResult] = await Promise.all([
            pool.request().query(`SELECT kb_id, question_text, answer_text, category, source, hit_count, is_active, created_at
                        FROM knowledge_base ORDER BY kb_id DESC LIMIT ${size} OFFSET ${offset}`),
            pool.request().query('SELECT COUNT(*) AS total FROM knowledge_base')
        ]);
        res.json({ code: 0, data: result.recordset, total: countResult.recordset[0].total, page, size });
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
        // 自动向量化
        const kbResult = await pool.request()
            .input('qt', sql.NVarChar, question_text)
            .query('SELECT TOP 1 kb_id FROM knowledge_base WHERE question_text = @qt ORDER BY kb_id DESC');
        if (kbResult.recordset.length > 0) {
            await autoVectorize(kbResult.recordset[0].kb_id, question_text, answer_text, category);
        }
        await clearQACache(question_text);
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
        // 自动重新向量化
        await autoVectorize(kb_id, question_text, answer_text, category);
        await clearQACache(question_text);
        res.json({ code: 0, msg: '更新成功' });
    } catch (err) { res.status(500).json({ code: -1, msg: err.message }); }
});

router.post('/kb/delete', async (req, res) => {
    try {
        const { kb_id } = req.body;
        if (!kb_id) return res.json({ code: -1, msg: '缺少条目ID' });
        const pool = await getPool();
        // 先获取问题文本用于清除缓存
        const kbResult = await pool.request()
            .input('id', sql.Int, parseInt(kb_id))
            .query('SELECT question_text FROM knowledge_base WHERE kb_id = @id');
        const questionText = kbResult.recordset[0]?.question_text;
        await pool.request()
            .input('id', sql.Int, kb_id)
            .query('DELETE FROM knowledge_base WHERE kb_id = @id');
        // 从向量索引中移除（通过重新构建或标记删除）
        try { embedding.removeVector && embedding.removeVector(kb_id); } catch (e) {}
        await clearQACache(questionText);
        res.json({ code: 0, msg: '删除成功' });
    } catch (err) { res.status(500).json({ code: -1, msg: err.message }); }
});

// ========== 批量操作 ==========

// 批量审核回答
router.post('/review/batch', async (req, res) => {
    try {
        let { answer_ids, action, comment } = req.body;
        if (!answer_ids || !Array.isArray(answer_ids) || answer_ids.length === 0) {
            return res.json({ code: -1, msg: '请选择要审核的回答' });
        }
        answer_ids = answer_ids.map(id => parseInt(id));
        const pool = await getPool();
        const status = action === 1 ? 1 : 2;
        const placeholders = answer_ids.map((_, i) => `@id${i}`).join(',');

        // 批量更新状态
        const updateReq = pool.request();
        answer_ids.forEach((id, i) => updateReq.input(`id${i}`, sql.Int, id));
        updateReq.input('status', sql.TinyInt, status);
        await updateReq.query(`UPDATE answer SET review_status = @status WHERE answer_id IN (${placeholders})`);

        let approved = 0, rejected = 0;

        if (action === 1) {
            // 批量查询关联数据
            const queryReq = pool.request();
            answer_ids.forEach((id, i) => queryReq.input(`id${i}`, sql.Int, id));
            const ans = await queryReq.query(`
                SELECT a.answer_id, a.answer_text, a.question_id, q.question_text, q.category
                FROM answer a INNER JOIN question q ON a.question_id = q.question_id
                WHERE a.answer_id IN (${placeholders})`);

            const badPatterns = ['正在整理', '暂未收录', '首先，用户的问题是', '根据规则'];
            const qidsToUpdate = [];

            for (const row of ans.recordset) {
                const isBad = badPatterns.some(p => row.answer_text.includes(p));
                if (!isBad) {
                    const insReq = pool.request();
                    await insReq
                        .input('qt', sql.NVarChar, row.question_text)
                        .input('at', sql.NVarChar, row.answer_text)
                        .input('cat', sql.NVarChar, row.category || '未分类')
                        .input('src', sql.NVarChar, '审核入库')
                        .query(`INSERT INTO knowledge_base (question_text, answer_text, category, source)
                                VALUES (@qt, @at, @cat, @src)`);
                }
                qidsToUpdate.push(row.question_id);
                approved++;
            }

            // 批量更新问题状态
            if (qidsToUpdate.length > 0) {
                const qPlaceholders = qidsToUpdate.map((_, i) => `@qid${i}`).join(',');
                const qReq = pool.request();
                qidsToUpdate.forEach((id, i) => qReq.input(`qid${i}`, sql.Int, id));
                await qReq.query(`UPDATE question SET status = 1 WHERE question_id IN (${qPlaceholders})`);
            }
        } else {
            rejected = answer_ids.length;
        }

        await clearQACache();
        res.json({ code: 0, msg: `批量${action === 1 ? '通过' : '拒绝'}: ${approved}条通过, ${rejected}条拒绝` });
    } catch (err) { res.status(500).json({ code: -1, msg: err.message }); }
});

// 批量删除知识库
router.post('/kb/delete-batch', async (req, res) => {
    try {
        let { kb_ids } = req.body;
        if (!kb_ids || !Array.isArray(kb_ids) || kb_ids.length === 0) {
            return res.json({ code: -1, msg: '请选择要删除的条目' });
        }
        kb_ids = kb_ids.map(id => parseInt(id));
        const pool = await getPool();
        const placeholders = kb_ids.map((_, i) => `@id${i}`).join(',');
        const delReq = pool.request();
        kb_ids.forEach((id, i) => delReq.input(`id${i}`, sql.Int, id));
        await delReq.query(`DELETE FROM knowledge_base WHERE kb_id IN (${placeholders})`);
        kb_ids.forEach(id => {
            try { embedding.removeVector && embedding.removeVector(id); } catch (e) {}
        });
        await clearQACache();
        res.json({ code: 0, msg: `已删除 ${kb_ids.length} 条` });
    } catch (err) { res.status(500).json({ code: -1, msg: err.message }); }
});

// ========== 临时：初始化缺失的Info表 ==========
router.post('/init-info-tables', async (req, res) => {
    try {
        const pool = await getPool();

        const createTables = [
            `CREATE TABLE IF NOT EXISTS enrollment_step (
                step_id INT AUTO_INCREMENT PRIMARY KEY,
                step_order INT NOT NULL UNIQUE,
                step_name VARCHAR(100) NOT NULL,
                description VARCHAR(500),
                location VARCHAR(100),
                materials VARCHAR(200),
                tips VARCHAR(500),
                is_active TINYINT(1) NOT NULL DEFAULT 1
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

            `CREATE TABLE IF NOT EXISTS campus_building (
                building_id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) NOT NULL,
                building_type VARCHAR(20) NOT NULL,
                latitude DECIMAL(10,7),
                longitude DECIMAL(10,7),
                description VARCHAR(500),
                floor_info VARCHAR(200),
                open_time VARCHAR(50),
                is_active TINYINT(1) NOT NULL DEFAULT 1
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

            `CREATE TABLE IF NOT EXISTS transport_route (
                route_id INT AUTO_INCREMENT PRIMARY KEY,
                start_point VARCHAR(100) NOT NULL,
                end_point VARCHAR(100) NOT NULL DEFAULT '学校',
                transport_type VARCHAR(20) NOT NULL,
                route_detail VARCHAR(500) NOT NULL,
                duration VARCHAR(50),
                cost VARCHAR(50),
                tips VARCHAR(200),
                is_active TINYINT(1) NOT NULL DEFAULT 1
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

            `CREATE TABLE IF NOT EXISTS fee (
                fee_id INT AUTO_INCREMENT PRIMARY KEY,
                fee_name VARCHAR(50) NOT NULL,
                fee_type VARCHAR(20) NOT NULL,
                amount VARCHAR(100),
                pay_method VARCHAR(200),
                pay_time VARCHAR(100),
                description VARCHAR(500),
                tips VARCHAR(500),
                is_active TINYINT(1) NOT NULL DEFAULT 1
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

            `CREATE TABLE IF NOT EXISTS cafeteria (
                cafeteria_id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) NOT NULL,
                location VARCHAR(100),
                building_id INT,
                open_time VARCHAR(100),
                description VARCHAR(500),
                avg_score DECIMAL(3,2) DEFAULT 0,
                is_active TINYINT(1) NOT NULL DEFAULT 1
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

            `CREATE TABLE IF NOT EXISTS dish (
                dish_id INT AUTO_INCREMENT PRIMARY KEY,
                cafeteria_id INT NOT NULL,
                name VARCHAR(50) NOT NULL,
                dish_type VARCHAR(20),
                price DECIMAL(6,2),
                avg_score DECIMAL(3,2) DEFAULT 0,
                recommend_count INT NOT NULL DEFAULT 0,
                description VARCHAR(200),
                is_active TINYINT(1) NOT NULL DEFAULT 1
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

            `CREATE TABLE IF NOT EXISTS attraction (
                attraction_id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) NOT NULL,
                attr_type VARCHAR(20),
                distance VARCHAR(50),
                transport VARCHAR(100),
                description VARCHAR(500),
                image_url VARCHAR(256),
                is_active TINYINT(1) NOT NULL DEFAULT 1
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
        ];

        for (const ddl of createTables) {
            await pool.request().query(ddl);
        }

        // 插入数据（先清空）
        const dataTables = ['dish', 'cafeteria', 'attraction', 'transport_route', 'fee', 'enrollment_step', 'campus_building'];
        for (const t of dataTables) {
            await pool.request().query(`DELETE FROM ${t}`);
        }

        // 报到流程
        await pool.request().query(`INSERT INTO enrollment_step (step_order, step_name, description, location, materials, tips) VALUES
            (1,'到达迎新点','从学校正门进入，前往迎新帐篷','学校正门广场','录取通知书','认准自己学院的迎新帐篷'),
            (2,'学院报到','到所在学院确认身份、领取报到单','各学院报到处','录取通知书、身份证','带好所有证件'),
            (3,'缴费确认','确认学费已缴纳或现场缴费','财务处','银行卡、缴费凭证','建议提前网上缴费'),
            (4,'领取宿舍钥匙','办理入住手续，领取钥匙','宿舍管理处','报到单','记好宿舍楼号和房间号'),
            (5,'领取校园卡','领取校园卡并充值','校园卡服务中心','身份证','建议充值200元以上'),
            (6,'领取物品','领取床上用品和军训服','物资领取处','报到单','核实物品是否齐全'),
            (7,'完成报到','到学院参加新生见面会','学院会议室','报到单','了解班级和课程安排')`);

        // 校园建筑
        await pool.request().query(`INSERT INTO campus_building (name, building_type, latitude, longitude, description, open_time) VALUES
            ('第一教学楼','教学楼',31.5800,120.3500,'主要上课地点，多媒体教室','7:00-22:00'),
            ('第二教学楼','教学楼',31.5810,120.3510,'实验课和选修课教室','7:00-22:00'),
            ('图书馆','图书馆',31.5820,120.3520,'藏书丰富，自习室座位充足','8:00-22:00'),
            ('体育馆','体育馆',31.5830,120.3530,'篮球场、羽毛球馆、健身房','8:00-21:00'),
            ('行政楼','行政楼',31.5840,120.3540,'学校行政部门办公地点','8:30-17:30'),
            ('一食堂','食堂',31.5850,120.3550,'离教学楼最近的食堂','6:30-19:00'),
            ('二食堂','食堂',31.5860,120.3560,'品种最多的食堂','7:00-19:30'),
            ('风味食堂','食堂',31.5870,120.3570,'各地特色小吃','11:00-19:00'),
            ('学生宿舍区','宿舍',31.5880,120.3580,'四人间/六人间，空调独立卫浴','全天'),
            ('校园卡服务中心','其他',31.5890,120.3590,'办理校园卡相关业务','8:30-17:00')`);

        // 交通路线
        await pool.request().query(`INSERT INTO transport_route (start_point, end_point, transport_type, route_detail, duration, cost, tips) VALUES
            ('无锡站','无锡学院','地铁+公交','出站步行至地铁1号线无锡站→乘至堰桥站→换乘公交到学校','约50分钟','约6元','高峰期地铁较挤'),
            ('无锡站','无锡学院','打车','出站后打车，导航至无锡学院正门','约40分钟','约60-80元','夜间可能加收附加费'),
            ('无锡东站','无锡学院','打车','出站后打车，导航至无锡学院','约30分钟','约50元','高铁站离学校更近'),
            ('苏南硕放机场','无锡学院','打车','机场打车到学校','约30分钟','约50-70元','建议首次来校打车'),
            ('无锡汽车站','无锡学院','公交','出站乘公交到锡山大道站，步行到校','约1小时','约3元','公交约15分钟一班')`);

        // 费用信息
        await pool.request().query(`INSERT INTO fee (fee_name, fee_type, amount, pay_method, pay_time, description, tips) VALUES
            ('学费（普通本科）','学费','5200-5800元/年','银行卡代扣/网上缴费/现场缴费','开学前','按学年缴纳，具体以通知书为准','建议提前网上缴费'),
            ('学费（艺术类）','学费','6800元/年','银行卡代扣/网上缴费','开学前','艺术类专业学费标准','以录取通知书为准'),
            ('住宿费（四人间）','住宿费','1200-1500元/年','随学费一起缴纳','开学前','四人间，空调独立卫浴','宿舍由学院统一分配'),
            ('住宿费（六人间）','住宿费','800-1000元/年','随学费一起缴纳','开学前','六人间标准宿舍','宿舍由学院统一分配'),
            ('教材费','教材费','约500-800元/年','开学后到教材科购买','开学第一周','根据课程需要购买','可买二手教材省钱'),
            ('电费','水电费','0.52元/度','微信公众号/自助机充值','随时','按宿舍独立计量','余额不足50元时及时充值')`);

        // 食堂
        await pool.request().query(`INSERT INTO cafeteria (name, location, building_id, open_time, description) VALUES
            ('一食堂','教学楼东侧',6,'早餐6:30-9:00 午餐11:00-13:00 晚餐17:00-19:00','离教学楼最近，下课后首选'),
            ('二食堂','宿舍区南侧',7,'早餐7:00-9:30 午餐10:30-13:30 晚餐16:30-19:30','品种最多，价格实惠'),
            ('风味食堂','校园西侧',8,'午餐11:00-13:30 晚餐17:00-19:00','各地特色小吃，选择多样')`);

        // 菜品
        await pool.request().query(`INSERT INTO dish (cafeteria_id, name, dish_type, price, description) VALUES
            (1,'红烧肉套餐','午餐',12.00,'招牌菜，肉质软烂入味'),
            (1,'麻辣香锅','午餐',15.00,'自选食材，微辣/中辣/特辣可选'),
            (1,'手抓饼','早餐',5.00,'加蛋加肠都很好吃'),
            (1,'豆浆油条','早餐',4.00,'经典早餐搭配'),
            (2,'黄焖鸡米饭','午餐',13.00,'人气最高的菜品'),
            (2,'酸菜鱼','午餐',16.00,'鱼肉鲜嫩，酸辣开胃'),
            (2,'砂锅米线','午餐',10.00,'冬天暖胃首选'),
            (2,'煎饼果子','早餐',6.00,'排队最长的窗口'),
            (3,'麻辣烫','午餐',12.00,'自选食材，按重量计费'),
            (3,'烤肉饭','晚餐',14.00,'烤肉配米饭，学生最爱'),
            (3,'重庆小面','午餐',9.00,'面条劲道，辣味十足')`);

        // 周边景点
        await pool.request().query(`INSERT INTO attraction (name, attr_type, distance, transport, description) VALUES
            ('荡口古镇','景点','公交约30分钟','乘公交到荡口古镇站','历史文化古镇，免费开放，适合周末游玩'),
            ('锡惠公园','景点','地铁约40分钟','乘地铁到惠山古镇站','无锡著名景点，惠山古镇也在附近'),
            ('三阳广场','商场','地铁约50分钟','乘地铁1号线到三阳广场站','市中心商圈，购物美食集中'),
            ('鼋头渚','景点','公交约1小时','乘公交到鼋头渚站','太湖风景区，樱花季必去'),
            ('校门口商业街','超市','步行5分钟','步行','小吃、奶茶、超市，满足日常需求'),
            ('锡山人民医院','医院','打车约10分钟','打车','综合医院，医保可用')`);

        res.json({ code: 0, msg: 'Info表初始化完成' });
    } catch (err) { res.status(500).json({ code: -1, msg: err.message }); }
});

// ========== 待回答问题管理 ==========

// 获取所有待回答问题
router.get('/pending-questions', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query(`SELECT q.question_id, q.question_text, q.category, q.status, q.created_at,
                    u.nickname AS asker_name,
                    (SELECT a.answer_text FROM answer a WHERE a.question_id = q.question_id LIMIT 1) AS answer_text
                    FROM question q
                    LEFT JOIN user u ON q.user_id = u.user_id
                    WHERE q.status = 0
                    ORDER BY q.created_at DESC
                    LIMIT 50`);
        res.json({ code: 0, data: result.recordset });
    } catch (err) { res.status(500).json({ code: -1, msg: err.message }); }
});

// 删除待回答问题
router.post('/pending-questions/delete', async (req, res) => {
    try {
        let { question_ids } = req.body;
        if (!question_ids || !Array.isArray(question_ids) || question_ids.length === 0) {
            return res.json({ code: -1, msg: '请选择要删除的问题' });
        }
        question_ids = question_ids.map(id => parseInt(id));
        const pool = await getPool();
        const placeholders = question_ids.map((_, i) => `@qid${i}`).join(',');

        // 批量删除 review（外键约束）
        const reviewReq = pool.request();
        question_ids.forEach((id, i) => reviewReq.input(`qid${i}`, sql.Int, id));
        await reviewReq.query(`DELETE FROM review WHERE answer_id IN (SELECT answer_id FROM answer WHERE question_id IN (${placeholders}))`);

        // 批量删除 answer
        const ansReq = pool.request();
        question_ids.forEach((id, i) => ansReq.input(`qid${i}`, sql.Int, id));
        await ansReq.query(`DELETE FROM answer WHERE question_id IN (${placeholders})`);

        // 批量删除 question
        const qReq = pool.request();
        question_ids.forEach((id, i) => qReq.input(`qid${i}`, sql.Int, id));
        await qReq.query(`DELETE FROM question WHERE question_id IN (${placeholders})`);

        res.json({ code: 0, msg: `已删除 ${question_ids.length} 个问题` });
    } catch (err) { res.status(500).json({ code: -1, msg: err.message }); }
});

module.exports = router;
