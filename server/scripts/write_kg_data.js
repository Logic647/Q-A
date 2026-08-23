const { getSession } = require('./config/neo4j');
const fs = require('fs');
const path = require('path');

async function writeKnowledgeGraph() {
    const session = await getSession();
    try {
        await session.run('MATCH (n) DETACH DELETE n');
        console.log('已清空旧数据');

        // 一、学校
        await session.run("CREATE (s:School {name:'无锡学院',english_name:'Wuxi University',website:'https://www.wxu.edu.cn',address:'江苏省无锡市锡山区锡山大道333号',postal_code:'214105',type:'公办本科',history:'原南京信息工程大学滨江学院，2021年转设',area:'约1000亩',students:'约12000人',motto:'自强厚德，笃学敏行',map_path:'map.jpg',driving_nav:'江苏省无锡市锡山区锡山大道333号 无锡学院西门',enrollment_time:'一般为9月初，具体以录取通知书为准',dorm分配:'按专业和班级分配',campus_card_pickup:'报到当天在指定地点领取',military_training:'开学后进行，约3周',credit_system:'四年制本科',cafeteria_price:'人均8-20元/餐',visitor_policy:'需在保卫处登记',dorm_curfew:'6:00 - 23:00'})");
        console.log('学校节点');

        // 学院
        const colleges = ['物联网工程学院','网络空间安全学院','电子信息工程学院','集成电路科学与工程学院','自动化学院','交通与车辆工程学院','环境科学与工程学院','大气与遥感学院','数字经济与管理学院','应急管理学院','传媒与艺术学院','国际教育学院','马克思主义学院','体育部','基础课教学部'];
        for (const c of colleges) {
            await session.run("CREATE (c:College {name:$n})", {n:c});
        }
        await session.run("MATCH (s:School),(c:College) CREATE (s)-[:包含]->(c)");

        // 特色专业
        for (const p of ['物联网工程','电子信息工程','大气科学']) {
            await session.run("CREATE (p:Specialty {name:$n,level:'特色专业'})", {n:p});
        }
        console.log('学校+学院+专业');

        // 二、交通
        for (const h of [
            {n:'无锡站',t:'火车站',d:'无锡主要火车站'},
            {n:'无锡东站',t:'高铁站',d:'距学校较近'},
            {n:'苏南硕放国际机场',t:'机场',d:'苏南硕放国际机场'},
            {n:'无锡汽车站',t:'汽车站',d:'长途汽车站'}
        ]) {
            await session.run("CREATE (h:TransportHub {name:$n,type:$t,description:$d})", h);
        }
        // 路线
        const routes = [
            {from:'无锡站',method:'地铁',detail:'乘坐3号线至靖海站换乘2号线至映月湖公园站3A口出，骑行约6元或打车约13元',time:'约45分钟',cost:'约6-13元'},
            {from:'无锡站',method:'打车',detail:'直接打车前往',time:'约25分钟',cost:'约25元'},
            {from:'无锡东站',method:'公交',detail:'在无锡东站停车场乘坐811路至滨江学院西门下车',time:'约20分钟',cost:'2元'},
            {from:'无锡东站',method:'打车',detail:'直接打车前往',time:'约8分钟',cost:'约9元'},
            {from:'苏南硕放国际机场',method:'地铁',detail:'乘坐3号线至靖海站换乘2号线至映月湖公园站3A口出',time:'约50分钟',cost:'约6-13元'},
            {from:'苏南硕放国际机场',method:'打车',detail:'直接打车前往',time:'约24分钟',cost:'约21元'},
            {from:'无锡汽车站',method:'地铁',detail:'靠近无锡火车站，乘地铁3号线换乘2号线至映月湖公园站3A口出',time:'约45分钟',cost:'约6-13元'}
        ];
        for (const r of routes) {
            await session.run("MATCH (h:TransportHub {name:$from}),(s:School {name:'无锡学院'}) CREATE (h)-[:可达 {方式:$method,详情:$detail,时长:$time,费用:$cost}]->(s)", r);
        }
        // 公交/地铁
        await session.run("CREATE (b:BusStation {name:'811路滨江学院西大门站',route:'811路'})");
        await session.run("CREATE (b:BusStation {name:'811路滨江学院南大门站',route:'811路'})");
        await session.run("CREATE (m:MetroStation {name:'映月湖公园站',line:'地铁2号线',exit:'3A口最近'})");
        await session.run("CREATE (m:MetroStation {name:'迎宾广场站',line:'地铁2号线'})");
        await session.run("CREATE (m:MetroStation {name:'无锡东站',line:'地铁2号线',note:'乘坐公交建议选择此站'})");
        // 停车场
        await session.run("CREATE (p:Parking {name:'校内停车场',description:'在校门口保卫处登记，校内划有停车位'})");
        await session.run("MATCH (s:School),(p:Parking) CREATE (s)-[:拥有]->(p)");
        console.log('交通数据');

        // 三、费用
        for (const f of [
            {n:'文科类学费',t:'学费',a:'5200元/年',x:'文科类专业'},
            {n:'理科类学费',t:'学费',a:'5200元/年',x:'理科类专业'},
            {n:'工科类学费',t:'学费',a:'5800元/年',x:'工科类专业'},
            {n:'艺术类学费',t:'学费',a:'6800元/年',x:'艺术类专业'},
            {n:'中外合作办学学费',t:'学费',a:'50000元/年',x:'中外合作办学专业'},
            {n:'住宿费',t:'住宿费',a:'1500元/年',x:'四人间，水费全免，电费每年赠送'},
            {n:'教材费',t:'教材费',a:'根据所选科目自愿购买',x:'可买二手'}
        ]) {
            await session.run("CREATE (f:Fee {name:$n,type:$t,amount:$a,detail:$x})", f);
        }
        await session.run("MATCH (s:School),(f:Fee) CREATE (s)-[:收取]->(f)");
        // 缴费方式
        await session.run("CREATE (m:PaymentMethod {name:'银行卡代扣',description:'开学后组织统一办理银行卡'})");
        await session.run("CREATE (m:PaymentMethod {name:'网上缴费',description:'学校财务处网站'})");
        await session.run("MATCH (s:School),(m:PaymentMethod) CREATE (s)-[:支持缴费方式]->(m)");
        // 奖学金
        for (const a of [{n:'国家奖学金',a:'8000元/年'},{n:'国家励志奖学金',a:'5000元/年'},{n:'学校奖学金',a:'详情见学校公示'}]) {
            await session.run("CREATE (a:Scholarship {name:$n,amount:$a})", a);
        }
        await session.run("MATCH (s:School),(a:Scholarship) CREATE (s)-[:设置]->(a)");
        // 助学金
        await session.run("CREATE (a:FinancialAid {name:'国家助学金',apply:'开学后向辅导员提交申请'})");
        await session.run("CREATE (a:FinancialAid {name:'生源地信用助学贷款',apply:'开学前在户籍所在地办理'})");
        await session.run("MATCH (s:School),(a:FinancialAid) CREATE (s)-[:提供]->(a)");
        // 校园卡
        await session.run("CREATE (c:CampusCard {name:'校园卡',recharge:'小灵龙APP（需连接校园网）',balance:'刷卡显示余额或在融合门户/小灵龙APP查看'})");
        await session.run("MATCH (s:School),(c:CampusCard) CREATE (s)-[:发放]->(c)");
        console.log('费用数据');

        // 四、住宿
        await session.run("CREATE (d:Dormitory {name:'学生宿舍',type:'4人间',air_conditioning:'有独立空调',bathroom:'有独立卫浴',bedding:'需自带',wifi:'校园WiFi覆盖，学号登录，需绑定运营商账号',broadband:'宿舍可用宽带连接',wifi_cutoff_weekday:'周一到周四晚23:00断网',wifi_cutoff_weekend:'周五到周日23:30断网',distribution:'按班级分配',curfew:'6:00 - 23:00',electricity:'宿舍不限电，原则上禁止使用大功率电器',washing_machine:'1楼有公用洗衣机，扫码支付，约4-7元/次',hot_water:'每层楼有热水供应，需自费'})");
        await session.run("MATCH (s:School {name:'无锡学院'}),(d:Dormitory) CREATE (s)-[:拥有宿舍]->(d)");
        console.log('住宿数据');

        // 五、餐饮
        for (const c of ['李园食堂','桃园食堂','梅园食堂']) {
            await session.run("CREATE (c:Cafeteria {name:$n})", {n:c});
        }
        await session.run("CREATE (c:Cafeteria {name:'桃园食堂三楼清真窗口',type:'清真',description:'青海拉面，学校外也有一家青海拉面，价格稍贵但菜品更丰富'})");
        await session.run("MATCH (s:School),(c:Cafeteria) CREATE (s)-[:拥有]->(c)");
        for (const t of [{m:'早餐',h:'6:30 - 9:00'},{m:'午餐',h:'11:00 - 13:00'},{m:'晚餐',h:'17:00 - 19:00'}]) {
            await session.run("CREATE (t:CafeteriaHours {meal:$m,time:$h})", t);
        }
        await session.run("MATCH (s:School),(t:CafeteriaHours) CREATE (s)-[:食堂营业时间]->(t)");
        for (const f of [
            {n:'超市',l:'桃园食堂对面',h:'8:00 - 22:00'},
            {n:'自助贩卖机',l:'每栋教学楼1楼、食堂一楼、宿舍楼1楼'},
            {n:'蜜雪冰城',l:'李园食堂一楼'},
            {n:'茶百道',l:'学校西门外'},
            {n:'一点点',l:'学校西门外'},
            {n:'瑞幸咖啡',l:'学校西门外'}
        ]) {
            await session.run("CREATE (f:Facility {name:$n,location:$l})", f);
        }
        await session.run("MATCH (s:School),(f:Facility) CREATE (s)-[:拥有]->(f)");
        console.log('餐饮数据');

        // 六、报到
        for (const d of [
            {n:'录取通知书',r:true,x:''},{n:'身份证原件及复印件',r:true,x:''},{n:'户口迁移证',r:false,x:'自愿迁移户口的同学'},
            {n:'一寸/二寸证件照各8张（白底）',r:true,x:''},{n:'团组织关系材料（团员证、介绍信）',r:true,x:''},
            {n:'党组织关系材料',r:false,x:'党员'},{n:'高中档案（密封）',r:true,x:''},
            {n:'贫困证明材料',r:false,x:'申请助学金的同学'}
        ]) {
            await session.run("CREATE (d:EnrollmentDoc {name:$n,required:$r,note:$x})", d);
        }
        await session.run("MATCH (s:School),(d:EnrollmentDoc) CREATE (s)-[:报到需携带]->(d)");
        const steps = [
            {o:1,n:'到学院报到点',d:'到学校后先到所在学院报到点'},
            {o:2,n:'领取报到流程单',d:'领取报到流程单'},
            {o:3,n:'缴费确认',d:'已缴费的直接确认，未缴费的现场办理'},
            {o:4,n:'办理校园卡',d:'办理校园卡'},
            {o:5,n:'到宿舍整理',d:'到宿舍整理行李'},
            {o:6,n:'参加新生见面会',d:'参加学院新生见面会/班会'},
            {o:7,n:'参加新生教育活动',d:'参加学校组织的新生教育活动'}
        ];
        for (const s of steps) {
            await session.run("CREATE (s:EnrollmentStep {order:$o,name:$n,description:$d})", s);
        }
        await session.run("MATCH (s:School),(e:EnrollmentStep) CREATE (s)-[:报到流程]->(e)");
        console.log('报到数据');

        // 七、教学
        await session.run("CREATE (l:Library {name:'图书馆',hours:'周一至周日 7:30 - 22:00',borrow:'凭校园卡，一次最多20本，借期30天，可续借15天（需在学习通完成入馆考试）',study_room:'图书馆和每栋宿舍都设有自习室，宿舍楼内的是通宵自习室',reservation:'无需预约'})");
        await session.run("MATCH (s:School),(l:Library) CREATE (s)-[:拥有]->(l)");
        await session.run("CREATE (e:EduSystem {name:'教务系统',url:'https://jwgl.cwxu.edu.cn/jwglxt/xtgl/login_slogin.html',password:'身份证后6位'})");
        await session.run("MATCH (s:School),(e:EduSystem) CREATE (s)-[:提供]->(e)");
        await session.run("CREATE (c:CourseSelection {time:'开学后第一周',system:'教务系统',process:'登录系统 → 查看课表 → 选课/退课'})");
        await session.run("MATCH (s:School),(c:CourseSelection) CREATE (s)-[:开放]->(c)");
        await session.run("CREATE (p:TransferPolicy {name:'转专业政策',time:'大一结束后可申请',condition:'需满足一定要求，详情见学院官网'})");
        await session.run("MATCH (s:School),(p:TransferPolicy) CREATE (s)-[:提供]->(p)");
        console.log('教学数据');

        // 八、设施
        for (const b of [
            {n:'勤学楼',t:'教学楼'},{n:'笃学楼',t:'教学楼/实验楼'},{n:'敏学楼',t:'教学楼'},
            {n:'思源楼',t:'实验楼'},{n:'思泉楼',t:'实验楼'},{n:'思贤楼',t:'实验楼'},
            {n:'思齐楼',t:'实验楼'},{n:'图书馆',t:'图书馆'},{n:'体育馆',t:'体育馆'},{n:'行政楼',t:'行政楼'}
        ]) {
            await session.run("CREATE (b:Building {name:$n,type:$t})", b);
        }
        await session.run("MATCH (s:School),(b:Building) CREATE (s)-[:拥有建筑]->(b)");
        await session.run("CREATE (h:Hospital {name:'校医院',location:'桃园一号旁',process:'校园卡挂号 → 就诊 → 取药'})");
        await session.run("MATCH (s:School),(h:Hospital) CREATE (s)-[:拥有]->(h)");
        await session.run("CREATE (a:ATM {name:'中国工商银行ATM',location:'李园食堂一楼'})");
        await session.run("MATCH (s:School),(a:ATM) CREATE (s)-[:拥有]->(a)");
        await session.run("CREATE (p:PackageStation {name:'菜鸟驿站',location:'李园五号和李园九号之间',service:'支持收发绝大多数快递'})");
        await session.run("MATCH (s:School),(p:PackageStation) CREATE (s)-[:拥有]->(p)");
        await session.run("CREATE (p:PrintStation {name:'勤学楼自助打印机',location:'勤学楼',note:'使用校园卡打印'})");
        await session.run("CREATE (p:PrintStation {name:'图书馆二楼自助打印室',location:'图书馆二楼',note:'使用校园卡，需在学习通上传文件'})");
        await session.run("MATCH (s:School),(p:PrintStation) CREATE (s)-[:拥有]->(p)");
        await session.run("CREATE (f:SportsFacility {name:'桃园田径场',hours:'6:00 - 23:00',reservation:'无需预约'})");
        await session.run("MATCH (s:School),(f:SportsFacility) CREATE (s)-[:拥有]->(f)");
        console.log('设施数据');

        // 九、活动社团
        for (const o of ['学生会','团委','青年志愿者协会']) {
            await session.run("CREATE (o:StudentOrg {name:$n})", {n:o});
        }
        await session.run("MATCH (s:School),(o:StudentOrg) CREATE (s)-[:拥有]->(o)");
        for (const e of [
            {n:'迎新晚会',t:'开学后'},{n:'校庆',t:'每年'},
            {n:'运动会',t:'每下半学期，具体见学校官网通知'},
            {n:'社团招新/百团大战',t:'开学后第一周或第二周'}
        ]) {
            await session.run("CREATE (e:CampusEvent {name:$n,time:$t})", e);
        }
        await session.run("MATCH (s:School),(e:CampusEvent) CREATE (s)-[:举办]->(e)");
        console.log('活动数据');

        // 十、周边
        for (const p of [
            {n:'九里东韵生活广场',l:'学校对面'},{n:'翠平·汇天地',l:'附近1.4km'},
            {n:'查桥商业广场',l:'附近4.6km'},{n:'大润发购物中心',l:'附近2.7km'}
        ]) {
            await session.run("CREATE (p:Shopping {name:$n,location:$l})", p);
        }
        await session.run("MATCH (s:School),(p:Shopping) CREATE (s)-[:附近]->(p)");
        for (const a of ['吼山森林公园','映月湖中央公园','梅里古镇','惠山古镇','惠山森林公园','鼋头渚']) {
            await session.run("CREATE (a:Attraction {name:$n})", {n:a});
        }
        await session.run("MATCH (s:School),(a:Attraction) CREATE (s)-[:附近景点]->(a)");
        console.log('周边数据');

        // 十一、安全
        await session.run("CREATE (e:EmergencyContact {name:'校内保卫处',phone:'0510-80560110'})");
        await session.run("CREATE (e:EmergencyContact {name:'报警电话',phone:'110'})");
        await session.run("MATCH (s:School),(e:EmergencyContact) CREATE (s)-[:紧急联系]->(e)");
        await session.run("CREATE (f:Facility {name:'失物招领处',location:'李园食堂一楼'})");
        await session.run("MATCH (s:School),(f:Facility {name:'失物招领处'}) CREATE (s)-[:拥有]->(f)");
        console.log('安全数据');

        // 地图
        const mapPath = path.join(__dirname, '临时文件', 'map.jpg');
        if (fs.existsSync(mapPath)) {
            await session.run("CREATE (m:CampusMap {name:'无锡学院校园地图',file_path:'map.jpg',description:'校园平面图，包含主要建筑、道路、食堂、宿舍区等位置标注'})");
            await session.run("MATCH (s:School),(m:CampusMap) CREATE (s)-[:校园地图]->(m)");
            console.log('地图节点');
        }

        // 验证
        const nc = await session.run('MATCH (n) RETURN count(n) AS c');
        const rc = await session.run('MATCH ()-[r]->() RETURN count(r) AS c');
        console.log(`\n完成！节点: ${nc.records[0].get('c')}, 关系: ${rc.records[0].get('c')}`);

    } catch (err) {
        console.error('失败:', err.message);
    } finally {
        await session.close();
    }
}

writeKnowledgeGraph().then(() => { console.log('结束'); process.exit(0); });
