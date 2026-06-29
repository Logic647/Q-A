const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/db');
const { askLLM } = require('../services/llm');

// 内存缓存
const answerCache = new Map();

// 同义词映射：用户常用词 → 知识库实体
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
    '充值': '校园卡', '饭卡': '校园卡',
};

// 问题意图分类：识别用户问题的核心主题
const INTENT_PATTERNS = [
    { intent: '交通', patterns: ['怎么去', '怎么到', '如何到达', '路线', '地铁', '公交', '火车站', '机场', '校车', '接站'] },
    { intent: '费用', patterns: ['学费', '住宿费', '多少钱', '缴费', '交费', '怎么交', '奖学金', '助学', '奖助'] },
    { intent: '食堂', patterns: ['食堂', '好吃', '美食', '饭菜', '吃饭', '伙食', '餐厅', '校园卡充值'] },
    { intent: '报到', patterns: ['报到', '开学', '入学', '新生', '带什么', '材料', '流程', '时间'] },
    { intent: '宿舍', patterns: ['宿舍', '寝室', '住宿', '空调', '卫浴', '门禁'] },
    { intent: '其他', patterns: ['图书馆', '超市', '快递', 'WiFi', '选课', '社团', '军训', '医院', '银行', '周边', '景点'] },
    { intent: '学校', patterns: ['学校怎么样', '学校介绍', '专业', '研究生', '就业', '学校在哪'] },
];

// 意图识别：返回最匹配的分类
function detectIntent(text) {
    const clean = text.replace(/[？?！!。，,、\s]/g, '').toLowerCase();
    let bestIntent = null;
    let bestScore = 0;

    for (const { intent, patterns } of INTENT_PATTERNS) {
        let score = 0;
        for (const p of patterns) {
            if (clean.includes(p)) score++;
        }
        if (score > bestScore) {
            bestScore = score;
            bestIntent = intent;
        }
    }
    return bestIntent;
}

// 计算两个文本的重叠度（基于有意义的词）
function calcOverlap(textA, textB) {
    const wordsA = new Set(textA.split(''));
    const wordsB = new Set(textB.split(''));
    let common = 0;
    for (const w of wordsA) { if (wordsB.has(w)) common++; }
    return common / Math.max(wordsA.size, wordsB.size);
}

// 提问
router.post('/ask', async (req, res) => {
    try {
        const { user_id, question_text } = req.body;
        const pool = await getPool();

        // 0. 缓存命中
        const cacheKey = question_text.trim();
        if (answerCache.has(cacheKey)) {
            const cached = answerCache.get(cacheKey);
            return res.json({ code: 0, data: cached });
        }

        // 1. 识别用户意图
        const intent = detectIntent(question_text);
        const qClean = question_text.replace(/[？?！!。，,、\s]/g, '');

        // 2. 多策略匹配知识库
        let kbMatch = null;
        let matchMethod = '';

        // 策略1：精确匹配 question_text
        const exact = await pool.request()
            .input('q', sql.NVarChar, qClean)
            .query(`SELECT TOP 1 * FROM knowledge_base WHERE is_active = 1 
                    AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(question_text, '？',''), '!',''), '。',''), '，',''), ' ','') = @q`);
        if (exact.recordset.length > 0) {
            kbMatch = exact.recordset[0];
            matchMethod = 'exact';
        }

        // 策略2：用户问题包含知识库问题（如"食堂怎么样好吃吗" 包含 "食堂怎么样"）
        if (!kbMatch) {
            const sub = await pool.request()
                .input('q', sql.NVarChar, `%${qClean}%`)
                .query(`SELECT TOP 3 *, LEN(question_text) AS qlen FROM knowledge_base 
                        WHERE is_active = 1 AND question_text LIKE @q ORDER BY qlen DESC`);
            // 选择最短的匹配（最精确）
            if (sub.recordset.length > 0) {
                kbMatch = sub.recordset[0];
                matchMethod = 'user_contains_kb';
            }
        }

        // 策略3：知识库问题包含用户问题（如"学校怎么样" 包含 "怎么样" → 匹配 "宿舍怎么样"）
        if (!kbMatch) {
            const sub2 = await pool.request()
                .input('q', sql.NVarChar, `%${qClean}%`)
                .query(`SELECT TOP 3 *, LEN(question_text) AS qlen FROM knowledge_base 
                        WHERE is_active = 1 AND @q LIKE '%' + question_text + '%' ORDER BY qlen DESC`);
            if (sub2.recordset.length > 0) {
                kbMatch = sub2.recordset[0];
                matchMethod = 'kb_contains_user';
            }
        }

        // 策略4：意图+关键词匹配（先按意图筛选，再按关键词排序）
        if (!kbMatch && intent) {
            const kw = await pool.request()
                .input('cat', sql.NVarChar, intent)
                .input('q', sql.NVarChar, `%${qClean}%`)
                .query(`SELECT TOP 3 * FROM knowledge_base 
                        WHERE is_active = 1 AND category = @cat 
                        AND (question_text LIKE @q OR keywords LIKE @q)
                        ORDER BY hit_count DESC`);
            if (kw.recordset.length > 0) {
                // 选重叠度最高的
                let best = null;
                let bestOverlap = 0;
                for (const row of kw.recordset) {
                    const overlap = calcOverlap(qClean, row.question_text);
                    if (overlap > bestOverlap) {
                        bestOverlap = overlap;
                        best = row;
                    }
                }
                if (best && bestOverlap >= 0.3) {
                    kbMatch = best;
                    matchMethod = 'intent_kw';
                }
            }
        }

        // 策略5：同义词扩展匹配
        if (!kbMatch) {
            const expanded = new Set();
            for (const [syn, target] of Object.entries(SYNONYMS)) {
                if (qClean.includes(syn)) expanded.add(target);
            }
            for (const kw of expanded) {
                const r = await pool.request()
                    .input('kw', sql.NVarChar, `%${kw}%`)
                    .query(`SELECT TOP 2 * FROM knowledge_base WHERE is_active = 1 
                            AND (question_text LIKE @kw OR keywords LIKE @kw)`);
                if (r.recordset.length > 0) {
                    kbMatch = r.recordset[0];
                    matchMethod = 'synonym';
                    break;
                }
            }
            console.log(`[QA] q="${qClean}" intent="${intent}" expanded=[${[...expanded]}] kbMatch=${kbMatch?.question_text || 'null'}`);
        }

        // 3. 路由判断
        let channel = 2;
        let kb_id = null;

        if (kbMatch) {
            channel = 1;
            kb_id = kbMatch.kb_id;
            await pool.request()
                .input('kb_id', sql.Int, kb_id)
                .query('UPDATE knowledge_base SET hit_count = hit_count + 1 WHERE kb_id = @kb_id');
        }

        // 4. 插入问题记录
        const insertResult = await pool.request()
            .input('uid', sql.Int, user_id || 0)
            .input('qt', sql.NVarChar, question_text)
            .input('cat', sql.NVarChar, kbMatch ? kbMatch.category : '其他')
            .input('ch', sql.Int, channel)
            .input('kb', sql.Int, kb_id)
            .query(`INSERT INTO question (user_id, question_text, category, channel, kb_id)
                    OUTPUT INSERTED.question_id
                    VALUES (@uid, @qt, @cat, @ch, @kb)`);

        const question_id = insertResult.recordset[0].question_id;

        // 5. 通道一：知识库
        if (channel === 1) {
            await pool.request()
                .input('qid', sql.Int, question_id)
                .input('ans', sql.NVarChar, kbMatch.answer_text)
                .query(`INSERT INTO answer (question_id, answer_text, source, review_status)
                        VALUES (@qid, @ans, 1, 1)`);
            await pool.request()
                .input('qid', sql.Int, question_id)
                .query('UPDATE question SET status = 1 WHERE question_id = @qid');

            const result = { question_id, channel: 1, answer: kbMatch.answer_text, category: kbMatch.category };
            answerCache.set(cacheKey, result);
            return res.json({ code: 0, data: result });
        }

        // 6. 通道二：大模型
        const llmAnswer = await askLLM(question_text);
        await pool.request()
            .input('qid', sql.Int, question_id)
            .input('ans', sql.NVarChar, llmAnswer)
            .query(`INSERT INTO answer (question_id, answer_text, source, review_status) VALUES (@qid, @ans, 3, 1)`);
        await pool.request()
            .input('qid', sql.Int, question_id)
            .query('UPDATE question SET status = 1 WHERE question_id = @qid');

        const result = { question_id, channel: 2, answer: llmAnswer, msg: '由AI大模型回答' };
        answerCache.set(cacheKey, result);
        res.json({ code: 0, data: result });

    } catch (err) {
        res.status(500).json({ code: -1, msg: err.message });
    }
});

// 查询问题及回答
router.get('/question/:id', async (req, res) => {
    try {
        const pool = await getPool();
        const q = await pool.request()
            .input('qid', sql.Int, req.params.id)
            .query(`SELECT q.*, a.answer_text, a.source, a.avg_score, a.score_count
                    FROM question q LEFT JOIN answer a ON q.question_id = a.question_id
                    WHERE q.question_id = @qid`);
        if (q.recordset.length === 0) return res.json({ code: -1, msg: '问题不存在' });
        res.json({ code: 0, data: q.recordset[0] });
    } catch (err) { res.status(500).json({ code: -1, msg: err.message }); }
});

// 历史记录
router.get('/history/:user_id', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('uid', sql.Int, req.params.user_id)
            .query(`SELECT q.question_id, q.question_text, q.category, q.channel, q.status, q.created_at,
                    a.answer_text FROM question q LEFT JOIN answer a ON q.question_id = a.question_id
                    WHERE q.user_id = @uid ORDER BY q.created_at DESC`);
        res.json({ code: 0, data: result.recordset });
    } catch (err) { res.status(500).json({ code: -1, msg: err.message }); }
});

// 待回答列表
router.get('/pending', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query(`SELECT q.question_id, q.question_text, q.category, q.created_at, u.nickname AS asker_name
                    FROM question q LEFT JOIN [user] u ON q.user_id = u.user_id
                    WHERE q.status = 0 AND q.channel = 2 ORDER BY q.created_at ASC`);
        res.json({ code: 0, data: result.recordset });
    } catch (err) { res.status(500).json({ code: -1, msg: err.message }); }
});

// 学生回答
router.post('/answer', async (req, res) => {
    try {
        const { question_id, responder_id, answer_text } = req.body;
        const pool = await getPool();
        await pool.request()
            .input('qid', sql.Int, question_id).input('rid', sql.Int, responder_id)
            .input('ans', sql.NVarChar, answer_text)
            .query('INSERT INTO answer (question_id, responder_id, answer_text, source, review_status) VALUES (@qid, @rid, @ans, 2, 0)');
        res.json({ code: 0, msg: '回答已提交' });
    } catch (err) { res.status(500).json({ code: -1, msg: err.message }); }
});

// 反馈
router.post('/feedback', async (req, res) => {
    try {
        const { answer_id, user_id, score, comment } = req.body;
        const pool = await getPool();
        await pool.request()
            .input('aid', sql.Int, answer_id).input('uid', sql.Int, user_id)
            .input('score', sql.TinyInt, score).input('comment', sql.NVarChar, comment || '')
            .query('INSERT INTO feedback (answer_id, user_id, score, comment) VALUES (@aid, @uid, @score, @comment)');
        res.json({ code: 0, msg: '评价成功' });
    } catch (err) { res.status(500).json({ code: -1, msg: err.message }); }
});

// 获取快捷提问建议（根据上一条消息的分类推荐相关问题）
router.post('/suggest', async (req, res) => {
    try {
        const { category, last_question } = req.body;
        const pool = await getPool();

        // 根据上一个问题的分类，推荐同分类的其他问题
        let query = 'SELECT TOP 5 question_text FROM knowledge_base WHERE is_active = 1';
        if (category) {
            query += ` AND category = '${category}'`;
        }
        query += ' ORDER BY NEWID()';  // 随机选取

        const result = await pool.request().query(query);
        res.json({ code: 0, data: result.recordset.map(r => r.question_text) });
    } catch (err) { res.json({ code: 0, data: [] }); }
});

// 计算两个字符串的相似度（基于共同字符比例）
function calcSimilarity(a, b) {
    const setA = new Set(a.split(''));
    const setB = new Set(b.split(''));
    let common = 0;
    for (const c of setA) { if (setB.has(c)) common++; }
    return common / Math.max(setA.size, setB.size);
}

module.exports = router;
