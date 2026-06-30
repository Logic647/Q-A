const { getSession } = require('../config/neo4j');

// 创建节点
async function createNode(label, properties) {
    const session = await getSession();
    try {
        const query = `CREATE (n:${label} $props) RETURN n`;
        const result = await session.run(query, { props: properties });
        return result.records[0].get('n').properties;
    } finally {
        await session.close();
    }
}

// 创建关系
async function createRelationship(fromLabel, fromProp, fromVal, toLabel, toProp, toVal, relType, relProps = {}) {
    const session = await getSession();
    try {
        const query = `
            MATCH (a:${fromLabel} {${fromProp}: $fromVal})
            MATCH (b:${toLabel} {${toProp}: $toVal})
            CREATE (a)-[r:${relType} $props]->(b)
            RETURN r
        `;
        const result = await session.run(query, { fromVal, toVal, props: relProps });
        return result.records[0].get('r').properties;
    } finally {
        await session.close();
    }
}

// 查询节点
async function findNode(label, properties) {
    const session = await getSession();
    try {
        const conditions = Object.entries(properties).map(([key, val]) => `n.${key} = $${key}`).join(' AND ');
        const query = `MATCH (n:${label} {${conditions}}) RETURN n`;
        const result = await session.run(query, properties);
        return result.records.map(r => r.get('n').properties);
    } finally {
        await session.close();
    }
}

// 从问题中提取关键词
function extractKeywords(text) {
    const clean = text.replace(/[？?！!。，,、\s]/g, '');
    // 实体关键词列表
    const entityMap = {
        '交通': ['怎么去', '怎么到', '如何到达', '路线', '地铁', '公交', '火车站', '机场', '校车', '接站', '打车', '坐车'],
        '费用': ['学费', '住宿费', '多少钱', '缴费', '交费', '怎么交', '收费'],
        '奖学金': ['奖学金', '助学金', '奖助', '助学', '贷款', '贫困'],
        '食堂': ['食堂', '好吃', '美食', '饭菜', '吃饭', '伙食', '餐厅', '校园卡'],
        '报到': ['报到', '开学', '入学', '新生', '带什么', '材料', '流程', '时间'],
        '宿舍': ['宿舍', '寝室', '住宿', '空调', '卫浴', '门禁'],
        '景点': ['景点', '好玩', '周边', '旅游'],
        '学校': ['学校', '专业', '研究生', '就业', '介绍'],
    };
    const matched = [];
    for (const [category, keywords] of Object.entries(entityMap)) {
        for (const kw of keywords) {
            if (clean.includes(kw)) {
                matched.push({ category, keyword: kw });
            }
        }
    }
    return matched;
}

// 从 Neo4j 检索与问题相关的知识，返回文本摘要
async function retrieveKnowledge(questionText) {
    const session = await getSession();
    try {
        const keywords = extractKeywords(questionText);
        const knowledge = [];

        for (const { category } of keywords) {
            let query = '';
            let params = { schoolName: '无锡学院' };

            if (category === '交通') {
                const hubList = ['无锡站', '无锡东站', '硕放机场', '苏南硕放', '汽车站'];
                const foundHub = hubList.find(h => questionText.includes(h));
                if (foundHub) {
                    query = `MATCH (hub:TransportHub)-[r:可达]->(school:School) WHERE school.name CONTAINS $schoolName AND hub.name CONTAINS $hubName RETURN hub, r AS route`;
                    params.hubName = foundHub;
                } else {
                    query = `MATCH (hub:TransportHub)-[r:可达]->(school:School) WHERE school.name CONTAINS $schoolName RETURN hub, r AS route`;
                }
            } else if (category === '费用') {
                query = `MATCH (school:School)-[:收取]->(fee:Fee) WHERE school.name CONTAINS $schoolName RETURN fee`;
            } else if (category === '奖学金') {
                query = `MATCH (school:School)-[:设置]->(s:Scholarship) WHERE school.name CONTAINS $schoolName RETURN s`;
            } else if (category === '食堂') {
                query = `MATCH (school:School)-[:拥有]->(cafeteria:Cafeteria) OPTIONAL MATCH (cafeteria)-[:提供]->(dish:Dish) WHERE school.name CONTAINS $schoolName RETURN cafeteria, collect(dish) AS dishes`;
            } else if (category === '报到') {
                query = `MATCH (school:School)-[:设置]->(step:EnrollmentStep) WHERE school.name CONTAINS $schoolName RETURN step ORDER BY step.order`;
            } else if (category === '宿舍') {
                query = `MATCH (d:Dormitory) RETURN d`;
            } else if (category === '景点') {
                query = `MATCH (school:School)-[:毗邻]->(a:Attraction) WHERE school.name CONTAINS $schoolName RETURN a`;
            } else if (category === '学校') {
                query = `MATCH (school:School) WHERE school.name CONTAINS $schoolName RETURN school`;
            }

            if (!query) continue;

            try {
                const result = await session.run(query, params);
                const items = formatRecords(result.records, category);
                if (items.length > 0) knowledge.push(...items);
            } catch (e) {
                // 单个查询失败不影响其他
            }
        }

        // 通用搜索兜底
        if (knowledge.length === 0) {
            const searchKey = questionText.replace(/[？?！!。，,、\s怎么去如何到可以吗是什么]/g, '').slice(0, 10);
            if (searchKey.length >= 2) {
                try {
                    const result = await session.run(
                        `MATCH (n) WHERE n.name CONTAINS $keyword RETURN n LIMIT 5`,
                        { keyword: searchKey }
                    );
                    const items = result.records.map(r => {
                        const props = r.get('n')?.properties;
                        return props ? `${props.name}：${props.description || props.type || ''}` : '';
                    }).filter(Boolean);
                    knowledge.push(...items);
                } catch (e) {}
            }
        }

        return knowledge;
    } finally {
        await session.close();
    }
}

// 格式化图谱记录为文本
function formatRecords(records, category) {
    const items = [];
    for (const r of records) {
        switch (category) {
            case '交通': {
                const hub = r.get('hub')?.properties;
                const route = r.get('route')?.properties;
                if (hub && route) {
                    let text = `${hub.name}到无锡学院：${route.方式 || ''}`;
                    if (route.详情) text += `，${route.详情}`;
                    if (route.时长) text += `（${route.时长}，${route.费用 || ''}）`;
                    items.push(text);
                }
                break;
            }
            case '费用': {
                const fee = r.get('fee')?.properties;
                if (fee) items.push(`${fee.name}：${fee.amount || fee.description || ''}`);
                break;
            }
            case '奖学金': {
                const s = r.get('s')?.properties;
                if (s) items.push(`${s.name}：${s.amount || ''}`);
                break;
            }
            case '食堂': {
                const caf = r.get('cafeteria')?.properties;
                const dishes = r.get('dishes') || [];
                if (caf) {
                    let text = `${caf.name}`;
                    if (caf.description) text += `：${caf.description}`;
                    if (dishes.length > 0) {
                        const dishList = dishes.filter(d => d.properties?.name).map(d => d.properties.name).join('、');
                        if (dishList) text += `，推荐菜品：${dishList}`;
                    }
                    items.push(text);
                }
                break;
            }
            case '报到': {
                const step = r.get('step')?.properties;
                if (step) items.push(`${step.order || ''}. ${step.name}：${step.description || ''}`);
                break;
            }
            case '宿舍': {
                const d = r.get('d')?.properties;
                if (d) {
                    const parts = [];
                    if (d.type) parts.push(`类型：${d.type}`);
                    if (d.air_conditioning) parts.push(`空调：${d.air_conditioning}`);
                    if (d.bathroom) parts.push(`卫浴：${d.bathroom}`);
                    if (d.wifi) parts.push(`WiFi：${d.wifi}`);
                    if (d.curfew) parts.push(`门禁：${d.curfew}`);
                    if (d.hot_water) parts.push(`热水：${d.hot_water}`);
                    if (d.electricity) parts.push(`电力：${d.electricity}`);
                    if (d.distribution) parts.push(`分配：${d.distribution}`);
                    items.push(`宿舍条件：${parts.join('，')}`);
                }
                break;
            }
            case '景点': {
                const a = r.get('a')?.properties;
                if (a?.name) items.push(`${a.name}：${a.description || ''}`);
                break;
            }
            case '学校': {
                const s = r.get('school')?.properties;
                if (s) items.push(`${s.name}：${s.description || ''}`);
                break;
            }
            default: {
                const n = r.get('n')?.properties || r.get('building')?.properties;
                if (n) items.push(`${n.name}：${n.description || n.type || ''}`);
            }
        }
    }
    return items.filter(Boolean);
}

module.exports = { createNode, createRelationship, findNode, queryGraph: retrieveKnowledge, retrieveKnowledge };
