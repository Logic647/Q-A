const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/db');

// 报到流程
router.get('/enrollment', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query('SELECT * FROM enrollment_step WHERE is_active = 1 ORDER BY step_order');
        res.json({ code: 0, data: result.recordset });
    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

// 校园建筑
router.get('/buildings', async (req, res) => {
    try {
        const pool = await getPool();
        const { type } = req.query;
        let query = 'SELECT * FROM campus_building WHERE is_active = 1';
        if (type) query += ` AND building_type = @type`;

        const request = pool.request();
        if (type) request.input('type', sql.NVarChar, type);
        const result = await request.query(query);

        res.json({ code: 0, data: result.recordset });
    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

// 交通路线
router.get('/transport', async (req, res) => {
    try {
        const pool = await getPool();
        const { start } = req.query;
        let query = 'SELECT * FROM transport_route WHERE is_active = 1';
        if (start) query += ` AND start_point LIKE @start`;

        const request = pool.request();
        if (start) request.input('start', sql.NVarChar, `%${start}%`);
        const result = await request.query(query);

        res.json({ code: 0, data: result.recordset });
    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

// 费用信息
router.get('/fees', async (req, res) => {
    try {
        const pool = await getPool();
        const { type } = req.query;
        let query = 'SELECT * FROM fee WHERE is_active = 1';
        if (type) query += ` AND fee_type = @type`;

        const request = pool.request();
        if (type) request.input('type', sql.NVarChar, type);
        const result = await request.query(query);

        res.json({ code: 0, data: result.recordset });
    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

// 食堂列表
router.get('/cafeterias', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query('SELECT * FROM cafeteria WHERE is_active = 1');
        res.json({ code: 0, data: result.recordset });
    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

// 菜品列表
router.get('/dishes', async (req, res) => {
    try {
        const pool = await getPool();
        const { cafeteria_id } = req.query;
        let query = `SELECT d.*, c.name AS cafeteria_name FROM dish d
                     LEFT JOIN cafeteria c ON d.cafeteria_id = c.cafeteria_id
                     WHERE d.is_active = 1`;
        if (cafeteria_id) query += ` AND d.cafeteria_id = @cid`;

        const request = pool.request();
        if (cafeteria_id) request.input('cid', sql.Int, cafeteria_id);
        const result = await request.query(query);

        res.json({ code: 0, data: result.recordset });
    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

// 周边景点
router.get('/attractions', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query('SELECT * FROM attraction WHERE is_active = 1');
        res.json({ code: 0, data: result.recordset });
    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

// 热门问题
router.get('/hot', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query('SELECT TOP 10 kb_id, question_text, hit_count, category FROM knowledge_base WHERE is_active = 1 ORDER BY hit_count DESC');
        res.json({ code: 0, data: result.recordset });
    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

module.exports = router;
