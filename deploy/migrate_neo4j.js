// Neo4j 数据迁移脚本
// 用于在新服务器上重建知识图谱
// 使用方法: node migrate_neo4j.js

const neo4j = require('neo4j-driver');

const NEO4J_URL = process.env.NEO4J_URL || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASS = process.env.NEO4J_PASS || 'REDACTED-DB-PASSWORD';

const driver = neo4j.driver(NEO4J_URL, neo4j.auth.basic(NEO4J_USER, NEO4J_PASS));

// 知识图谱数据
const graphData = {
    schools: [
        { name: '无锡学院', description: '公办本科院校，位于江苏省无锡市锡山区', type: '本科' }
    ],
    transportHubs: [
        { name: '无锡站', description: '无锡主要火车站', type: '火车站' },
        { name: '无锡东站', description: '距学校较近', type: '高铁站' },
        { name: '硕放机场', description: '苏南硕放国际机场', type: '机场' },
        { name: '汽车站', description: '无锡汽车客运站', type: '汽车站' }
    ],
    fees: [
        { name: '文科类学费', amount: '5200元/年', description: '普通文科专业' },
        { name: '理科类学费', amount: '5200元/年', description: '普通理科专业' },
        { name: '工科类学费', amount: '5800元/年', description: '工科专业' },
        { name: '艺术类学费', amount: '6800元/年', description: '艺术类专业' },
        { name: '中外合作办学学费', amount: '50000元/年', description: '中外合作项目' },
        { name: '住宿费', amount: '1500元/年', description: '统一住宿费标准' }
    ],
    cafeterias: [
        { name: '梅园食堂', type: '普通食堂' },
        { name: '桃园食堂', type: '普通食堂' },
        { name: '李园食堂', type: '普通食堂' }
    ],
    dormitories: [
        { name: '无锡学院宿舍', type: '4人间', air_conditioning: '有独立空调', bathroom: '有独立卫浴', wifi: '校园WiFi覆盖，学号登录', curfew: '6:00 - 23:00', hot_water: '每层楼有热水供应，需自费', electricity: '宿舍不限电，禁止大功率电器', distribution: '按班级分配' }
    ],
    scholarships: [
        { name: '国家奖学金', amount: '8000元/年' },
        { name: '国家励志奖学金', amount: '5000元/年' },
        { name: '国家助学金', amount: '2000-4000元/年' }
    ],
    transportRoutes: [
        { from: '无锡东站', to: '无锡学院', mode: '公交', detail: '在无锡东站停车场乘坐811路至滨江学院西门下车', duration: '约20分钟', cost: '2元' },
        { from: '无锡东站', to: '无锡学院', mode: '打车', detail: '直接打车前往', duration: '约8分钟', cost: '约9元' },
        { from: '无锡站', to: '无锡学院', mode: '地铁+公交', detail: '乘地铁1号线到堰桥站，换乘公交', duration: '约40分钟', cost: '约5元' },
        { from: '硕放机场', to: '无锡学院', mode: '打车', detail: '直接打车前往', duration: '约20分钟', cost: '约30元' }
    ]
};

async function migrate() {
    const session = driver.session();
    try {
        // 创建学校节点
        for (const school of graphData.schools) {
            await session.run(
                'MERGE (s:School {name: $name}) SET s.description = $description, s.type = $type',
                school
            );
        }
        console.log('学校节点创建完成');

        // 创建交通枢纽
        for (const hub of graphData.transportHubs) {
            await session.run(
                'MERGE (h:TransportHub {name: $name}) SET h.description = $description, h.type = $type',
                hub
            );
        }
        console.log('交通枢纽创建完成');

        // 创建费用
        for (const fee of graphData.fees) {
            await session.run(
                'MERGE (f:Fee {name: $name}) SET f.amount = $amount, f.description = $description',
                fee
            );
        }
        console.log('费用节点创建完成');

        // 创建食堂
        for (const caf of graphData.cafeterias) {
            await session.run(
                'MERGE (c:Cafeteria {name: $name}) SET c.type = $type',
                caf
            );
        }
        console.log('食堂节点创建完成');

        // 创建宿舍
        for (const dorm of graphData.dormitories) {
            await session.run(
                'MERGE (d:Dormitory {name: $name}) SET d += $props',
                { name: dorm.name, props: dorm }
            );
        }
        console.log('宿舍节点创建完成');

        // 创建奖学金
        for (const s of graphData.scholarships) {
            await session.run(
                'MERGE (s:Scholarship {name: $name}) SET s.amount = $amount',
                s
            );
        }
        console.log('奖学金节点创建完成');

        // 创建交通路线关系
        for (const route of graphData.transportRoutes) {
            await session.run(
                `MATCH (hub:TransportHub) WHERE hub.name CONTAINS $from
                 MATCH (school:School) WHERE school.name CONTAINS $to
                 MERGE (hub)-[r:可达]->(school)
                 SET r.方式 = $mode, r.详情 = $detail, r.时长 = $duration, r.费用 = $cost`,
                route
            );
        }
        console.log('交通路线关系创建完成');

        // 创建学校-费用关系
        await session.run(
            'MATCH (s:School) WHERE s.name CONTAINS $schoolName MATCH (f:Fee) MERGE (s)-[:收取]->(f)',
            { schoolName: '无锡学院' }
        );
        console.log('学校-费用关系创建完成');

        // 创建学校-食堂关系
        await session.run(
            'MATCH (s:School) WHERE s.name CONTAINS $schoolName MATCH (c:Cafeteria) MERGE (s)-[:拥有]->(c)',
            { schoolName: '无锡学院' }
        );
        console.log('学校-食堂关系创建完成');

        // 创建学校-宿舍关系
        await session.run(
            'MATCH (s:School) WHERE s.name CONTAINS $schoolName MATCH (d:Dormitory) MERGE (s)-[:拥有]->(d)',
            { schoolName: '无锡学院' }
        );
        console.log('学校-宿舍关系创建完成');

        // 创建学校-奖学金关系
        await session.run(
            'MATCH (s:School) WHERE s.name CONTAINS $schoolName MATCH (sch:Scholarship) MERGE (s)-[:设置]->(sch)',
            { schoolName: '无锡学院' }
        );
        console.log('学校-奖学金关系创建完成');

        console.log('');
        console.log('==========================================');
        console.log('  Neo4j 数据迁移完成！');
        console.log('==========================================');
    } catch (err) {
        console.error('迁移失败:', err.message);
    } finally {
        await session.close();
        await driver.close();
    }
}

migrate();
