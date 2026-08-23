// Test intent detection
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

console.log('"学校怎么去" →', detectIntent('学校怎么去'));
