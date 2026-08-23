const { getSession } = require('./config/neo4j');

async function updateStationTypes() {
    const session = await getSession();
    try {
        // 更新无锡站类型为火车站
        const r1 = await session.run(`
            MATCH (h:TransportHub {name: '无锡站'})
            SET h.type = '火车站'
            RETURN h.name, h.type
        `);
        console.log('无锡站:', r1.records[0]?.get('h.name'), r1.records[0]?.get('h.type'));

        // 更新无锡东站类型为高铁站
        const r2 = await session.run(`
            MATCH (h:TransportHub {name: '无锡东站'})
            SET h.type = '高铁站'
            RETURN h.name, h.type
        `);
        console.log('无锡东站:', r2.records[0]?.get('h.name'), r2.records[0]?.get('h.type'));

        // 验证所有交通枢纽
        const all = await session.run('MATCH (h:TransportHub) RETURN h.name, h.type ORDER BY h.name');
        console.log('\n所有交通枢纽:');
        all.records.forEach(r => console.log(`  ${r.get('h.name')}: ${r.get('h.type')}`));

    } finally {
        await session.close();
        process.exit(0);
    }
}

updateStationTypes();
