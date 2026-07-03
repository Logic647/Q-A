const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/db');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const UPLOAD_DIR = path.join(__dirname, '../uploads/verify');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// 微信登录
router.post('/login', async (req, res) => {
    try {
        const { code, openid, nickname } = req.body;
        const pool = await getPool();
        let userOpenid = openid;
        if (code && !openid) {
            userOpenid = 'wx_' + crypto.createHash('md5').update(code).digest('hex').slice(0, 16);
        }
        if (!userOpenid) return res.json({ code: -1, msg: '缺少登录凭证' });

        let result = await pool.request()
            .input('openid', sql.NVarChar, userOpenid)
            .query('SELECT * FROM user WHERE openid = @openid');

        if (result.recordset.length === 0) {
            await pool.request()
                .input('openid', sql.NVarChar, userOpenid)
                .input('nickname', sql.NVarChar, nickname || '微信用户')
                .query('INSERT INTO user (openid, nickname) VALUES (@openid, @nickname)');
            result = await pool.request()
                .input('openid', sql.NVarChar, userOpenid)
                .query('SELECT * FROM user WHERE openid = @openid');
        }
        res.json({ code: 0, data: result.recordset[0] });
    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

// 提交身份认证（base64图片）
router.post('/verify', async (req, res) => {
    try {
        const { user_id, real_name, student_id, image_url } = req.body;
        if (!user_id || !real_name || !student_id) {
            return res.json({ code: -1, msg: '请填写完整信息' });
        }
        const pool = await getPool();
        // 检查是否已有待审核记录
        const existing = await pool.request()
            .input('uid', sql.Int, user_id)
            .query('SELECT TOP 1 verify_id FROM user_verify WHERE user_id = @uid AND status = 0');
        if (existing.recordset.length > 0) {
            return res.json({ code: -1, msg: '您已有待审核的认证申请，请耐心等待' });
        }
        // 检查是否已认证
        const user = await pool.request()
            .input('uid', sql.Int, user_id)
            .query('SELECT auth_status FROM user WHERE user_id = @uid');
        if (user.recordset.length > 0 && user.recordset[0].auth_status === 1) {
            return res.json({ code: -1, msg: '您已完成认证' });
        }

        await pool.request()
            .input('uid', sql.Int, user_id)
            .input('name', sql.NVarChar, real_name)
            .input('sid', sql.NVarChar, student_id)
            .input('img', sql.NVarChar, image_url || '')
            .query(`INSERT INTO user_verify (user_id, real_name, student_id, image_url, status)
                    VALUES (@uid, @name, @sid, @img, 0)`);

        res.json({ code: 0, msg: '认证申请已提交，等待管理员审核' });
    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

// 获取用户认证状态
router.get('/verify-status/:uid', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('uid', sql.Int, parseInt(req.params.uid))
            .query(`SELECT TOP 1 status, real_name, student_id, created_at
                    FROM user_verify WHERE user_id = @uid ORDER BY created_at DESC`);
        const user = await pool.request()
            .input('uid', sql.Int, parseInt(req.params.uid))
            .query('SELECT auth_status, role FROM user WHERE user_id = @uid');
        res.json({
            code: 0,
            data: {
                auth_status: user.recordset[0]?.auth_status || 0,
                role: user.recordset[0]?.role || 0,
                verify: result.recordset[0] || null
            }
        });
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
            .query('SELECT * FROM user WHERE user_id = @uid');
        if (result.recordset.length === 0) return res.json({ code: -1, msg: '用户不存在' });
        res.json({ code: 0, data: result.recordset[0] });
    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

module.exports = router;
