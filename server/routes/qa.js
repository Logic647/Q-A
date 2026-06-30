const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/db');
const { askLLM } = require('../services/llm');
const redis = require('../config/redis');
const { sendToQueue, consumeFromQueue } = require('../config/rabbitmq');
const { queryGraph } = require('../services/kg');

// Redis 缓存过期时间（秒）
const CACHE_TTL = 3600; // 1小时

// 同义词映射
const SYNONYMS = {
    '好吃': '食堂', '美食': '食堂', '饭菜': '食堂', '饭': '食堂', '吃的': '食堂', '餐厅': '食堂', '伙食': '食堂',
    '咋走': '怎么去', '咋去': '怎么去', '如何去': '怎么去', '到达': '怎么去', '过去': '怎么去',
    '寝室': '宿舍', '住宿': '宿舍', '住': '宿舍',
    '多少钱': '费用', '收费': '费用', '贵不贵': '费用', '学费': '费用',
    '坐车': '交通', '坐地铁': '地铁', '坐公交': '公交',
    '开学': '报到', '新生': '报到', '入学': '报到', '报到': '报到',
    '网': 'WiFi', '无线网': 'WiFi', '上网': 'WiFi',
    '买东西': '超市', '购物': '超市',
    '书': '图书馆', '自习': '图书馆',
    '找工作': '就业', '毕业': '就业', '考研': '就业',
    '社团': '社团', '学生会': '社团',
    '军训': '军训', '训练': '军训',
    '奖学金': '奖助', '助学': '奖助', '贷款': '奖助',
    '奖学金': '奖学金', '助学金': '奖学金', '奖助': '奖学金',
    '充值': '校园卡', '饭卡': '校园卡',
};

// 意图识别
const INTENT_PATTERNS = [
    { intent: '交通', patterns: ['怎么去', '怎么到', '如何到达', '路线', '地铁', '公交', '火车站', '机场', '校车', '接站'] },
    { intent: '费用', patterns: ['学费', '住宿费', '多少钱', '缴费', '交费', '怎么交'] },
    { intent: '奖学金', patterns: ['奖学金', '助学金', '奖助', '助学', '贷款', '贫困'] },
    { intent: '食堂', patterns: ['食堂', '好吃', '美食', '饭菜', '吃饭', '伙食', '餐厅', '校园卡充值'] },
    { intent: '报到', patterns: ['报到', '开学', '入学', '新生', '带什么', '材料', '流程', '时间'] },
    { intent: '宿舍', patterns: ['宿舍', '寝室', '住宿', '空调', '卫浴', '门禁'] },
    { intent: '其他', patterns: ['图书馆', '超市', '快递', 'WiFi', '选课', '社团', '军训', '医院', '银行', '周边', '景点'] },
    { intent: '学校', patterns: ['学校怎么样', '学校介绍', '专业', '研究生', '就业', '学校在哪'] },
];

function detectIntent(text) {
    const clean = text.replace(/[？?！!。，,、\s]/g, '').toLowerCase();
    let bestIntent = null;
    let bestScore = 0;
    for (const { intent, patterns } of INTENT_PATTERNS) {
        let score = 0;
        for (const p of patterns) { if (clean.includes(p)) score++; }
        if (score > bestScore) { bestScore = score; bestIntent = intent; }
    }
    return bestIntent;
}

// 从 Neo4j 图查询结果中提取答案
function formatGraphAnswer(records, intent) {
    if (!records || records.length === 0) return null;
    
    let answer = '';
    
    switch (intent) {
        case '交通':
            records.forEach(r => {
                const hub = r.get('hub')?.properties;
                const route = r.get('route')?.properties;
                if (hub && route) {
                    answer += `【${hub.name}】${route.方式 || ''}：${route.详情 || route.描述 || ''}`;
                    if (route.时长) answer += `（${route.时长}，${route.费用 || ''}）`;
                    answer += '\n';
                }
            });
            break;
        case '费用':
            records.forEach(r => {
                const fee = r.get('fee')?.properties;
                if (fee) answer += `${fee.name}：${fee.amount || fee.description || ''}\n`;
            });
            break;
        case '食堂':
            records.forEach(r => {
                const caf = r.get('cafeteria')?.properties;
                const dishes = r.get('dishes') || [];
                if (caf && caf.name) {
                    answer += `【${caf.name}】${caf.description || caf.type || ''}\n`;
                    if (dishes.length > 0) {
                        dishes.forEach(d => { 
                            if (d.properties?.name) answer += `  - ${d.properties.name}：${d.properties.price || ''}\n`; 
                        });
                    }
                }
            });
            break;
        case '奖学金':
            records.forEach(r => {
                const s = r.get('s')?.properties;
                if (s) answer += `${s.name}：${s.amount || ''}\n`;
            });
            break;
        case '报到':
            records.forEach(r => {
                const step = r.get('step')?.properties;
                if (step) answer += `${step.order}. ${step.name}：${step.description || ''}\n`;
            });
            break;
        case '宿舍':
            records.forEach(r => {
                const d = r.get('d')?.properties;
                if (d) {
                    answer += `无锡学院宿舍条件：\n`;
                    answer += `  - 类型：${d.type || ''}\n`;
                    answer += `  - 空调：${d.air_conditioning || ''}\n`;
                    answer += `  - 独立卫浴：${d.bathroom || ''}\n`;
                    answer += `  - 床上用品：${d.bedding || ''}\n`;
                    answer += `  - WiFi：${d.wifi || ''}\n`;
                    answer += `  - 门禁：${d.curfew || ''}\n`;
                    answer += `  - 洗衣机：${d.washing_machine || ''}\n`;
                    answer += `  - 热水：${d.hot_water || ''}\n`;
                    answer += `  - 电力：${d.electricity || ''}\n`;
                    answer += `  - 分配方式：${d.distribution || ''}`;
                }
            });
            break;
        case '奖学金':
            records.forEach(r => {
                const s = r.get('s')?.properties;
                if (s) answer += `${s.name}：${s.amount || ''}\n`;
            });
            break;
        case '景点':
            records.forEach(r => {
                const a = r.get('a')?.properties;
                if (a?.name) answer += `${a.name}${a.description ? '：' + a.description : ''}\n`;
            });
            break;
        case '其他':
            records.forEach(r => {
                const node = r.get('building');
                if (node?.properties) answer += `${node.properties.name}：${node.properties.description || node.properties.type || ''}\n`;
            });
            break;
        default:
            records.forEach(r => {
                const node = r.get('n');
                if (node?.properties) answer += `${node.properties.name}：${node.properties.description || ''}\n`;
            });
    }
    
    return answer.trim() || null;
}

// 提问接口 - 知识图谱优先匹配，匹配不到再用大模型
router.post('/ask', async (req, res) => {
    try {
        const { user_id, question_text } = req.body;
        const qClean = question_text.replace(/[？?！!。，,、\s]/g, '');
        
        // 1. Redis 缓存查询
        let cached = null;
        try {
            cached = await redis.get(`qa:${qClean}`);
            if (cached) {
                return res.json({ code: 0, data: JSON.parse(cached), cached: true });
            }
        } catch (e) { /* Redis 不可用时跳过 */ }

        // 2. 识别用户意图
        const intent = detectIntent(question_text);
        
        // 3. Neo4j 图查询（知识图谱方式）
        let graphResult = null;
        try {
            const graphRecords = await queryGraph(intent, [qClean]);
            const formattedAnswer = formatGraphAnswer(graphRecords, intent);
            if (formattedAnswer) {
                graphResult = {
                    question_id: Date.now(),
                    channel: 1,
                    answer: formattedAnswer,
                    category: intent || '其他',
                    source: 'neo4j'
                };
            }
        } catch (e) {
            console.log('Neo4j查询失败，回退到SQL:', e.message);
        }

        // 4. 如果图查询成功，直接返回
        if (graphResult) {
            try { await redis.setex(`qa:${qClean}`, CACHE_TTL, JSON.stringify(graphResult)); } catch (e) {}
            return res.json({ code: 0, data: graphResult, source: 'graph' });
        }

        // 5. 回退到 SQL 关键词匹配
        const pool = await getPool();
        const exact = await pool.request()
            .input('q', sql.NVarChar, qClean)
            .query(`SELECT TOP 1 * FROM knowledge_base WHERE is_active = 1 
                    AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(question_text, '?',''), '!',''), '。',''), '，',''), ' ','') = @q`);
        
        if (exact.recordset.length > 0) {
            const kbMatch = exact.recordset[0];
            const result = {
                question_id: Date.now(),
                channel: 1,
                answer: kbMatch.answer_text,
                category: kbMatch.category,
                source: 'sql_exact'
            };
            try { await redis.setex(`qa:${qClean}`, CACHE_TTL, JSON.stringify(result)); } catch (e) {}
            return res.json({ code: 0, data: result, source: 'sql' });
        }

        // 6. 都没匹配到，调用大模型回答
        const llmAnswer = await askLLM(question_text);
        const questionId = Date.now();
        const result = {
            question_id: questionId,
            channel: 2,
            answer: llmAnswer,
            category: intent || '其他',
            source: 'llm'
        };
        try { await redis.setex(`qa:${qClean}`, CACHE_TTL, JSON.stringify(result)); } catch (e) {}
        res.json({ code: 0, data: result, source: 'llm' });

    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

// 查询单个问题及回答
router.get('/question/:id', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, parseInt(req.params.id))
            .query(`SELECT q.*, a.answer_text, a.source, a.avg_score, a.score_count
                    FROM question q
                    LEFT JOIN answer a ON q.question_id = a.question_id
                    WHERE q.question_id = @id`);
        if (result.recordset.length === 0) {
            return res.json({ code: -1, msg: '问题不存在' });
        }
        res.json({ code: 0, data: result.recordset[0] });
    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

// 获取用户历史问题
router.get('/history/:user_id', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('uid', sql.Int, parseInt(req.params.user_id))
            .query(`SELECT q.question_id, q.question_text, q.category, q.status, q.created_at,
                    a.answer_text, a.avg_score, a.score_count
                    FROM question q
                    LEFT JOIN answer a ON q.question_id = a.question_id
                    WHERE q.user_id = @uid
                    ORDER BY q.created_at DESC`);
        res.json({ code: 0, data: result.recordset });
    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

// 获取待回答问题列表（通道二：学生回答）
router.get('/pending', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query(`SELECT q.question_id, q.question_text, q.category, q.created_at,
                    u.nickname AS asker_name
                    FROM question q
                    LEFT JOIN [user] u ON q.user_id = u.user_id
                    WHERE q.status = 0
                    ORDER BY q.created_at ASC`);
        res.json({ code: 0, data: result.recordset });
    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

// 学生提交回答
router.post('/answer', async (req, res) => {
    try {
        const { question_id, user_id, answer_text } = req.body;
        if (!question_id || !answer_text) {
            return res.json({ code: -1, msg: '缺少必要参数' });
        }

        const pool = await getPool();

        // 插入回答（source=2 表示学生回答，review_status=0 待审核）
        const result = await pool.request()
            .input('qid', sql.Int, question_id)
            .input('uid', sql.Int, user_id || 0)
            .input('ans', sql.NVarChar, answer_text)
            .query(`INSERT INTO answer (question_id, responder_id, answer_text, source, review_status)
                    VALUES (@qid, @uid, @ans, 2, 0)`);

        // 更新问题状态为已回答
        await pool.request()
            .input('qid', sql.Int, question_id)
            .query('UPDATE question SET status = 1 WHERE question_id = @qid');

        res.json({ code: 0, msg: '回答已提交，等待审核' });
    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

// 用户反馈评分
router.post('/feedback', async (req, res) => {
    try {
        const { answer_id, user_id, score, comment } = req.body;
        if (!answer_id || !score) {
            return res.json({ code: -1, msg: '缺少必要参数' });
        }

        const pool = await getPool();

        // 插入反馈记录
        await pool.request()
            .input('aid', sql.Int, answer_id)
            .input('uid', sql.Int, user_id || 0)
            .input('score', sql.TinyInt, score)
            .input('cmt', sql.NVarChar, comment || '')
            .query(`INSERT INTO feedback (answer_id, user_id, score, comment)
                    VALUES (@aid, @uid, @score, @cmt)`);

        // 更新回答的平均分
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

// 根据分类获取推荐问题
router.post('/suggest', async (req, res) => {
    try {
        const { category } = req.body;
        const pool = await getPool();

        let query = 'SELECT TOP 5 question_text FROM knowledge_base WHERE is_active = 1';
        if (category) {
            query += ` AND category = @cat`;
        }
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
