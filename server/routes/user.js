const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/db');

// 微信登录（模拟，实际需调用微信API）
router.post('/login', async (req, res) => {
    try {
        const { openid, nickname } = req.body;
        const pool = await getPool();

        let result = await pool.request()
            .input('openid', sql.NVarChar, openid)
            .query('SELECT * FROM [user] WHERE openid = @openid');

        if (result.recordset.length === 0) {
            await pool.request()
                .input('openid', sql.NVarChar, openid)
                .input('nickname', sql.NVarChar, nickname || '新用户')
                .query('INSERT INTO [user] (openid, nickname) VALUES (@openid, @nickname)');

            result = await pool.request()
                .input('openid', sql.NVarChar, openid)
                .query('SELECT * FROM [user] WHERE openid = @openid');
        }

        res.json({ code: 0, data: result.recordset[0] });
    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

// 学生身份认证
router.post('/auth', async (req, res) => {
    try {
        const { user_id, student_id, real_name } = req.body;
        const pool = await getPool();

        // 比对学生信息库
        const check = await pool.request()
            .input('sid', sql.NVarChar, student_id)
            .input('name', sql.NVarChar, real_name)
            .query('SELECT * FROM student_info WHERE student_id = @sid AND real_name = @name AND is_active = 1');

        if (check.recordset.length === 0) {
            return res.json({ code: -1, msg: '学号或姓名不匹配，请核实后重试' });
        }

        // 更新用户认证状态
        await pool.request()
            .input('uid', sql.Int, user_id)
            .input('sid', sql.NVarChar, student_id)
            .input('name', sql.NVarChar, real_name)
            .input('college', sql.NVarChar, check.recordset[0].college)
            .input('major', sql.NVarChar, check.recordset[0].major)
            .input('email', sql.NVarChar, check.recordset[0].email)
            .query(`UPDATE [user] SET student_id = @sid, real_name = @name, college = @college,
                    major = @major, email = @email, role = 1, auth_status = 1, updated_at = GETDATE()
                    WHERE user_id = @uid`);

        res.json({ code: 0, msg: '认证成功' });
    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

// 获取用户信息
router.get('/info/:id', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('uid', sql.Int, req.params.id)
            .query('SELECT * FROM [user] WHERE user_id = @uid');

        if (result.recordset.length === 0) {
            return res.json({ code: -1, msg: '用户不存在' });
        }
        res.json({ code: 0, data: result.recordset[0] });
    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

module.exports = router;
