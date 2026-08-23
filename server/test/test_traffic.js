const { getSession } = require('./config/neo4j');

async function test() {
    const session = await getSession();
    
    console.log('=== 交通关系属性测试 ===');
    const result = await session.run(`
        MATCH (hub:TransportHub)-[r:可达]->(school:School)
        WHERE school.name CONTAINS '无锡学院'
        RETURN hub.name AS hub_name, 
               r.方式 AS method, 
               r.详情 AS detail, 
               r.时长 AS time, 
               r.费用 AS cost
    `);
    
    result.records.forEach(r => {
        console.log(`[${r.get('hub_name')}] ${r.get('method')}: ${r.get('detail')} (${r.get('time')}, ${r.get('cost')})`);
    });

    await session.close();
    process.exit(0);
}

test();
