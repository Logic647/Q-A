const { getSession } = require('./config/neo4j');

async function test() {
    const session = await getSession();
    
    // Test 1: 交通查询 - 读取关系属性
    console.log('=== 测试1: 交通 ===');
    const t1 = await session.run(`
        MATCH (hub:TransportHub)-[r:可达]->(school:School)
        WHERE school.name CONTAINS '无锡学院'
        RETURN hub.name, r.方式, r.详情, r.时长, r.费用
    `);
    t1.records.forEach(r => {
        console.log(`  ${r.get('hub.name')}: ${r.get('r.方式')} - ${r.get('r.详情')} (${r.get('r.时长')}, ${r.get('r.费用')})`);
    });

    // Test 2: 奖学金查询
    console.log('\n=== 测试2: 奖学金 ===');
    const t2 = await session.run(`
        MATCH (school:School)-[:设置]->(s:Scholarship)
        WHERE school.name CONTAINS '无锡学院'
        RETURN s.name, s.amount
    `);
    t2.records.forEach(r => console.log(`  ${r.get('s.name')}: ${r.get('s.amount')}`));

    // Test 3: 食堂查询
    console.log('\n=== 测试3: 食堂 ===');
    const t3 = await session.run(`
        MATCH (school:School)-[:拥有]->(c:Cafeteria)
        OPTIONAL MATCH (c)-[:提供]->(d:Dish)
        WHERE school.name CONTAINS '无锡学院'
        RETURN c.name, c.type, c.description, collect(d.name) AS dishes
    `);
    t3.records.forEach(r => console.log(`  ${r.get('c.name')}: ${r.get('c.type')} - ${r.get('c.description')} | 菜品: ${r.get('dishes')}`));

    await session.close();
    process.exit(0);
}

test();
