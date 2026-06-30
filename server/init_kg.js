const { getSession } = require('./config/neo4j');

async function initKnowledgeGraph() {
    const session = await getSession();
    
    try {
        // 清空现有数据
        await session.run('MATCH (n) DETACH DELETE n');
        console.log('已清空旧数据');

        // 创建学校节点
        await session.run(`
            CREATE (school:School {
                name: '无锡学院',
                address: '江苏省无锡市锡山大道333号',
                type: '公办普通本科',
                history: '前身为南京信息工程大学滨江学院，2002年创建',
                campus_area: '1770余亩',
                students: '本科生1.3万余人',
                disciplines: '47个本科专业，7大学科门类',
                motto: '尚德笃行 求是鼎新'
            })
        `);
        console.log('创建学校节点');

        // 创建交通枢纽节点
        const hubs = [
            { name: '无锡站', type: '火车站', description: '无锡主要火车站，可乘地铁1号线' },
            { name: '无锡东站', type: '高铁站', description: '高铁站，距学校较近' },
            { name: '苏南硕放机场', type: '机场', description: '距学校约20分钟车程' },
        ];
        for (const hub of hubs) {
            await session.run(`CREATE (h:TransportHub {name: $name, type: $type, description: $description})`, hub);
        }
        console.log('创建交通枢纽节点');

        // 创建路线关系
        await session.run(`
            MATCH (h:TransportHub {name: '无锡站'}), (s:School {name: '无锡学院'})
            CREATE (h)-[:可达 {方式: '地铁1号线', 时长: '约50分钟', 费用: '约6元'}]->(s)
        `);
        await session.run(`
            MATCH (h:TransportHub {name: '无锡东站'}), (s:School {name: '无锡学院'})
            CREATE (h)-[:可达 {方式: '打车', 时长: '约10分钟', 费用: '约20元'}]->(s)
        `);
        await session.run(`
            MATCH (h:TransportHub {name: '苏南硕放机场'}), (s:School {name: '无锡学院'})
            CREATE (h)-[:可达 {方式: '打车', 时长: '约20分钟', 费用: '约40元'}]->(s)
        `);
        console.log('创建路线关系');

        // 创建费用节点
        const fees = [
            { name: '学费', type: '学费', amount: '5200-5800元/年', description: '普通本科专业' },
            { name: '艺术类学费', type: '学费', amount: '6800元/年', description: '艺术类专业' },
            { name: '住宿费', type: '住宿费', amount: '1200-1500元/年', description: '四人间' },
            { name: '奖学金', type: '奖助', amount: '8000元/年', description: '国家奖学金' },
        ];
        for (const fee of fees) {
            await session.run(`CREATE (f:Fee {name: $name, type: $type, amount: $amount, description: $description})`, fee);
        }
        console.log('创建费用节点');

        // 创建费用关系
        await session.run(`
            MATCH (s:School {name: '无锡学院'}), (f:Fee)
            CREATE (s)-[:收取]->(f)
        `);
        console.log('创建费用关系');

        // 创建食堂节点
        const cafeterias = [
            { name: '一食堂', hours: '早餐6:30-9:00 午餐11:00-13:00 晚餐17:00-19:00', description: '离教学楼最近' },
            { name: '二食堂', hours: '早餐7:00-9:30 午餐10:30-13:30 晚餐16:30-19:30', description: '品种最多' },
            { name: '风味食堂', hours: '午餐11:00-13:30 晚餐17:00-19:00', description: '各地特色小吃' },
        ];
        for (const caf of cafeterias) {
            await session.run(`CREATE (c:Cafeteria {name: $name, hours: $hours, description: $description})`, caf);
        }
        console.log('创建食堂节点');

        // 创建菜品节点
        const dishes = [
            { name: '红烧肉', price: '12元', cafeteria: '一食堂' },
            { name: '麻辣香锅', price: '15元', cafeteria: '一食堂' },
            { name: '黄焖鸡', price: '13元', cafeteria: '二食堂' },
            { name: '酸菜鱼', price: '16元', cafeteria: '二食堂' },
            { name: '麻辣烫', price: '12元', cafeteria: '风味食堂' },
        ];
        for (const dish of dishes) {
            await session.run(`CREATE (d:Dish {name: $name, price: $price})`, dish);
        }
        console.log('创建菜品节点');

        // 创建食堂-菜品关系
        for (const dish of dishes) {
            await session.run(`
                MATCH (c:Cafeteria {name: $cafeteria}), (d:Dish {name: $name})
                CREATE (c)-[:提供]->(d)
            `, { cafeteria: dish.cafeteria, name: dish.name });
        }
        console.log('创建食堂-菜品关系');

        // 创建食堂关系
        await session.run(`
            MATCH (s:School {name: '无锡学院'}), (c:Cafeteria)
            CREATE (s)-[:拥有]->(c)
        `);
        console.log('创建食堂关系');

        // 创建报到环节节点
        const steps = [
            { order: 1, name: '到达迎新点', description: '从学校正门进入，前往迎新帐篷' },
            { order: 2, name: '学院报到', description: '到所在学院确认身份、领取报到单' },
            { order: 3, name: '缴费确认', description: '确认学费已缴纳或现场缴费' },
            { order: 4, name: '领取宿舍钥匙', description: '办理入住手续，领取钥匙' },
            { order: 5, name: '领取校园卡', description: '领取校园卡并充值' },
        ];
        for (const step of steps) {
            await session.run(`CREATE (s:EnrollmentStep {order: $order, name: $name, description: $description})`, step);
        }
        console.log('创建报到环节节点');

        await session.run(`
            MATCH (s:School {name: '无锡学院'}), (e:EnrollmentStep)
            CREATE (s)-[:设置]->(e)
        `);
        console.log('创建报到环节关系');

        // 创建建筑节点
        const buildings = [
            { name: '图书馆', type: '教学楼', description: '藏书丰富，自习室充足', hours: '8:00-22:00' },
            { name: '体育馆', type: '体育馆', description: '篮球场、健身房', hours: '8:00-21:00' },
        ];
        for (const b of buildings) {
            await session.run(`CREATE (b:Building {name: $name, type: $type, description: $description, hours: $hours})`, b);
        }
        console.log('创建建筑节点');

        await session.run(`
            MATCH (s:School {name: '无锡学院'}), (b:Building)
            CREATE (s)-[:拥有]->(b)
        `);
        console.log('创建建筑关系');

        // 创建景点节点
        const attractions = [
            { name: '荡口古镇', type: '景点', description: '历史文化古镇，免费开放' },
            { name: '锡惠公园', type: '景点', description: '无锡著名景点' },
            { name: '鼋头渚', type: '景点', description: '太湖风景区，樱花季必去' },
        ];
        for (const a of attractions) {
            await session.run(`CREATE (a:Attraction {name: $name, type: $type, description: $description})`, a);
        }
        console.log('创建景点节点');

        await session.run(`
            MATCH (s:School {name: '无锡学院'}), (a:Attraction)
            CREATE (s)-[:毗邻]->(a)
        `);
        console.log('创建景点关系');

        // 创建宿舍节点
        const dorms = [
            { name: '学生宿舍', type: '宿舍', description: '四人间/六人间，上床下桌，有空调', hours: '24小时' },
        ];
        for (const d of dorms) {
            await session.run(`CREATE (b:Building {name: $name, type: $type, description: $description, hours: $hours})`, d);
        }
        console.log('创建宿舍节点');

        await session.run(`
            MATCH (s:School {name: '无锡学院'}), (b:Building {type: '宿舍'})
            CREATE (s)-[:拥有]->(b)
        `);
        console.log('创建宿舍关系');

        // 验证数据
        const countResult = await session.run('MATCH (n) RETURN count(n) AS count');
        console.log(`知识图谱初始化完成，共 ${countResult.records[0].get('count')} 个节点`);

        const relResult = await session.run('MATCH ()-[r]->() RETURN count(r) AS count');
        console.log(`共 ${relResult.records[0].get('count')} 条关系`);

    } catch (err) {
        console.error('初始化失败:', err.message);
    } finally {
        await session.close();
    }
}

// 运行初始化
initKnowledgeGraph().then(() => {
    console.log('完成');
    process.exit(0);
});
