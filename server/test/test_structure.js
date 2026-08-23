const { getSession } = require('./config/neo4j');

async function test() {
    const session = await getSession();
    
    const result = await session.run(`
        MATCH (hub:TransportHub)-[r:可达]->(school:School)
        WHERE school.name CONTAINS '无锡学院'
        RETURN hub, r AS route, school
        LIMIT 2
    `);
    
    // 检查返回结构
    const rec = result.records[0];
    console.log('Keys:', rec.keys);
    
    const hub = rec.get('hub');
    console.log('hub type:', typeof hub, 'keys:', hub ? Object.keys(hub) : 'null');
    console.log('hub properties:', hub?.properties);
    
    const route = rec.get('route');
    console.log('route type:', typeof route, 'keys:', route ? Object.keys(route) : 'null');
    console.log('route properties:', route?.properties);
    
    // 检查是否是关系对象
    if (route && route.start) {
        console.log('route.start:', route.start?.toString?.() || route.start);
    }

    await session.close();
    process.exit(0);
}

test();
