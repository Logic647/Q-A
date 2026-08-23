const { getSession } = require('./config/neo4j');

async function checkNeo4jData() {
    const session = await getSession();
    try {
        // Check transport data
        const transport = await session.run('MATCH (hub:TransportHub)-[r:可达]->(s:School) RETURN hub.name, hub.description, r.方式, r.详情, r.时长, r.费用');
        console.log('=== 交通数据 ===');
        transport.records.forEach(r => {
            console.log(`  ${r.get('hub.name')}: ${r.get('r.方式')} - ${r.get('r.详情')} (${r.get('r.时长')}, ${r.get('r.费用')})`);
        });

        // Check cafeteria data
        const caf = await session.run('MATCH (c:Cafeteria) RETURN c.name, c.type, c.description');
        console.log('\n=== 食堂数据 ===');
        caf.records.forEach(r => {
            console.log(`  ${r.get('c.name')}: ${r.get('c.type')} - ${r.get('c.description')}`);
        });

        // Check dish data
        const dishes = await session.run('MATCH (d:Dish) RETURN d.name, d.price');
        console.log('\n=== 菜品数据 ===');
        dishes.records.forEach(r => {
            console.log(`  ${r.get('d.name')}: ${r.get('d.price')}`);
        });

        // Check fee data
        const fees = await session.run('MATCH (f:Fee) RETURN f.name, f.amount, f.type');
        console.log('\n=== 费用数据 ===');
        fees.records.forEach(r => {
            console.log(`  ${r.get('f.name')}: ${r.get('f.amount')} (${r.get('f.type')})`);
        });

        // Check scholarship data
        const scholarships = await session.run('MATCH (s:Scholarship) RETURN s.name, s.amount');
        console.log('\n=== 奖学金数据 ===');
        scholarships.records.forEach(r => {
            console.log(`  ${r.get('s.name')}: ${r.get('s.amount')}`);
        });

    } finally {
        await session.close();
        process.exit(0);
    }
}

checkNeo4jData();
