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

// 查询关系（用于问答匹配）
async function queryGraph(intent, entities) {
    const session = await getSession();
    try {
        let query = '';
        let params = {};
        
        // 根据意图构建不同的查询
        switch (intent) {
            case '交通':
                query = `
                    MATCH (hub:TransportHub)-[r:可达]->(school:School)
                    WHERE school.name CONTAINS $schoolName
                    RETURN hub, r AS route, school
                `;
                params = { schoolName: '无锡学院' };
                break;
            case '奖学金':
                query = `
                    MATCH (school:School)-[:设置]->(s:Scholarship)
                    WHERE school.name CONTAINS $schoolName
                    RETURN s
                `;
                params = { schoolName: '无锡学院' };
                break;
            case '费用':
                query = `
                    MATCH (school:School)-[:收取]->(fee:Fee)
                    WHERE school.name CONTAINS $schoolName
                    RETURN fee
                `;
                params = { schoolName: '无锡学院' };
                break;
            case '食堂':
                query = `
                    MATCH (school:School)-[:拥有]->(cafeteria:Cafeteria)
                    OPTIONAL MATCH (cafeteria)-[:提供]->(dish:Dish)
                    WHERE school.name CONTAINS $schoolName
                    RETURN cafeteria, collect(dish) AS dishes
                `;
                params = { schoolName: '无锡学院' };
                break;
            case '报到':
                query = `
                    MATCH (school:School)-[:设置]->(step:EnrollmentStep)
                    WHERE school.name CONTAINS $schoolName
                    RETURN step ORDER BY step.order
                `;
                params = { schoolName: '无锡学院' };
                break;
            case '宿舍':
                query = `
                    MATCH (d:Dormitory)
                    RETURN d
                `;
                break;
            case '景点':
                query = `
                    MATCH (school:School)-[:毗邻]->(attraction:Attraction)
                    WHERE school.name CONTAINS $schoolName
                    RETURN attraction
                `;
                params = { schoolName: '无锡学院' };
                break;
            case '其他':
                query = `
                    MATCH (school:School)-[:拥有]->(building:Building)
                    WHERE school.name CONTAINS $schoolName
                    RETURN building
                `;
                params = { schoolName: '无锡学院' };
                break;
            default:
                // 通用查询
                query = `
                    MATCH (n)
                    WHERE n.name CONTAINS $keyword
                    RETURN n LIMIT 5
                `;
                params = { keyword: entities[0] || '' };
        }
        
        const result = await session.run(query, params);
        return result.records;
    } finally {
        await session.close();
    }
}

module.exports = { createNode, createRelationship, findNode, queryGraph };
