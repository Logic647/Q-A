const { getSession } = require('./config/neo4j');

async function checkData() {
    const session = await getSession();
    try {
        // Check dishes
        const dishes = await session.run('MATCH (d:Dish) RETURN d.name, d.price, d.type LIMIT 10');
        console.log('=== 菜品节点 ===');
        if (dishes.records.length === 0) {
            console.log('  (无菜品数据)');
        }
        dishes.records.forEach(r => console.log(`  ${r.get('d.name')}: ${r.get('d.price')} (${r.get('d.type')})`));

        // Check cafeteria-dish relationships
        const rels = await session.run('MATCH (c:Cafeteria)-[r:提供]->(d:Dish) RETURN c.name, d.name, d.price');
        console.log('\n=== 食堂-菜品关系 ===');
        if (rels.records.length === 0) {
            console.log('  (无关系数据)');
        }
        rels.records.forEach(r => console.log(`  ${r.get('c.name')} -> ${r.get('d.name')}: ${r.get('d.price')}`));

        // Check scholarship
        const scholarships = await session.run('MATCH (s:Scholarship) RETURN s.name, s.amount');
        console.log('\n=== 奖学金 ===');
        scholarships.records.forEach(r => console.log(`  ${r.get('s.name')}: ${r.get('s.amount')}`));

    } finally {
        await session.close();
        process.exit(0);
    }
}

checkData();
