-- ============================================================
-- 新生入学智能问答系统 - MySQL 建表脚本
-- 数据库名称: FreshmanQA
-- ============================================================

USE FreshmanQA;

-- ========== 1. 报到流程表 ==========
CREATE TABLE IF NOT EXISTS enrollment_step (
    step_id         INT AUTO_INCREMENT PRIMARY KEY,
    step_order      INT NOT NULL UNIQUE,
    step_name       VARCHAR(100) NOT NULL,
    description     VARCHAR(500),
    location        VARCHAR(100),
    materials       VARCHAR(200),
    tips            VARCHAR(500),
    is_active       TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== 2. 校园建筑表 ==========
CREATE TABLE IF NOT EXISTS campus_building (
    building_id     INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(50) NOT NULL,
    building_type   VARCHAR(20) NOT NULL,
    latitude        DECIMAL(10,7),
    longitude       DECIMAL(10,7),
    description     VARCHAR(500),
    floor_info      VARCHAR(200),
    open_time       VARCHAR(50),
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    INDEX idx_building_type (building_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== 3. 交通路线表 ==========
CREATE TABLE IF NOT EXISTS transport_route (
    route_id        INT AUTO_INCREMENT PRIMARY KEY,
    start_point     VARCHAR(100) NOT NULL,
    end_point       VARCHAR(100) NOT NULL DEFAULT '学校',
    transport_type  VARCHAR(20) NOT NULL,
    route_detail    VARCHAR(500) NOT NULL,
    duration        VARCHAR(50),
    cost            VARCHAR(50),
    tips            VARCHAR(200),
    is_active       TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== 4. 费用表 ==========
CREATE TABLE IF NOT EXISTS fee (
    fee_id          INT AUTO_INCREMENT PRIMARY KEY,
    fee_name        VARCHAR(50) NOT NULL,
    fee_type        VARCHAR(20) NOT NULL,
    amount          VARCHAR(100),
    pay_method      VARCHAR(200),
    pay_time        VARCHAR(100),
    description     VARCHAR(500),
    tips            VARCHAR(500),
    is_active       TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== 5. 食堂表 ==========
CREATE TABLE IF NOT EXISTS cafeteria (
    cafeteria_id    INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(50) NOT NULL,
    location        VARCHAR(100),
    building_id     INT,
    open_time       VARCHAR(100),
    description     VARCHAR(500),
    avg_score       DECIMAL(3,2) DEFAULT 0,
    is_active       TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== 6. 菜品表 ==========
CREATE TABLE IF NOT EXISTS dish (
    dish_id         INT AUTO_INCREMENT PRIMARY KEY,
    cafeteria_id    INT NOT NULL,
    name            VARCHAR(50) NOT NULL,
    dish_type       VARCHAR(20),
    price           DECIMAL(6,2),
    avg_score       DECIMAL(3,2) DEFAULT 0,
    recommend_count INT NOT NULL DEFAULT 0,
    description     VARCHAR(200),
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    INDEX idx_dish_cafeteria (cafeteria_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== 7. 周边景点表 ==========
CREATE TABLE IF NOT EXISTS attraction (
    attraction_id   INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(50) NOT NULL,
    attr_type       VARCHAR(20),
    distance        VARCHAR(50),
    transport       VARCHAR(100),
    description     VARCHAR(500),
    image_url       VARCHAR(256),
    is_active       TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== 插入初始数据 ==========

-- 报到流程
INSERT INTO enrollment_step (step_order, step_name, description, location, materials, tips) VALUES
(1, '到达迎新点', '从学校正门进入，前往迎新帐篷', '学校正门广场', '录取通知书', '认准自己学院的迎新帐篷'),
(2, '学院报到', '到所在学院确认身份、领取报到单', '各学院报到处', '录取通知书、身份证', '带好所有证件'),
(3, '缴费确认', '确认学费已缴纳或现场缴费', '财务处', '银行卡、缴费凭证', '建议提前网上缴费'),
(4, '领取宿舍钥匙', '办理入住手续，领取钥匙', '宿舍管理处', '报到单', '记好宿舍楼号和房间号'),
(5, '领取校园卡', '领取校园卡并充值', '校园卡服务中心', '身份证', '建议充值200元以上'),
(6, '领取物品', '领取床上用品（如已购买）和军训服', '物资领取处', '报到单', '核实物品是否齐全'),
(7, '完成报到', '到学院参加新生见面会', '学院会议室', '报到单', '了解班级和课程安排');

-- 校园建筑
INSERT INTO campus_building (name, building_type, latitude, longitude, description, open_time) VALUES
('第一教学楼', '教学楼', 31.5800, 120.3500, '主要上课地点，多媒体教室', '7:00-22:00'),
('第二教学楼', '教学楼', 31.5810, 120.3510, '实验课和选修课教室', '7:00-22:00'),
('图书馆', '图书馆', 31.5820, 120.3520, '藏书丰富，自习室座位充足', '8:00-22:00'),
('体育馆', '体育馆', 31.5830, 120.3530, '篮球场、羽毛球馆、健身房', '8:00-21:00'),
('行政楼', '行政楼', 31.5840, 120.3540, '学校行政部门办公地点', '8:30-17:30'),
('一食堂', '食堂', 31.5850, 120.3550, '离教学楼最近的食堂', '6:30-19:00'),
('二食堂', '食堂', 31.5860, 120.3560, '品种最多的食堂', '7:00-19:30'),
('风味食堂', '食堂', 31.5870, 120.3570, '各地特色小吃', '11:00-19:00'),
('学生宿舍区', '宿舍', 31.5880, 120.3580, '四人间/六人间，空调独立卫浴', '全天'),
('校园卡服务中心', '其他', 31.5890, 120.3590, '办理校园卡相关业务', '8:30-17:00');

-- 交通路线
INSERT INTO transport_route (start_point, end_point, transport_type, route_detail, duration, cost, tips) VALUES
('无锡站', '无锡学院', '地铁+公交', '出站步行至地铁1号线无锡站 → 乘至堰桥站 → 换乘公交到学校', '约50分钟', '约6元', '高峰期地铁较挤'),
('无锡站', '无锡学院', '打车', '出站后打车，导航至无锡学院正门', '约40分钟', '约60-80元', '夜间可能加收附加费'),
('无锡东站', '无锡学院', '打车', '出站后打车，导航至无锡学院', '约30分钟', '约50元', '高铁站离学校更近'),
('苏南硕放机场', '无锡学院', '打车', '机场打车到学校', '约30分钟', '约50-70元', '建议首次来校打车'),
('无锡汽车站', '无锡学院', '公交', '出站乘公交到锡山大道站，步行到校', '约1小时', '约3元', '公交约15分钟一班');

-- 费用信息
INSERT INTO fee (fee_name, fee_type, amount, pay_method, pay_time, description, tips) VALUES
('学费（普通本科）', '学费', '5200-5800元/年', '银行卡代扣/网上缴费/现场缴费', '开学前', '按学年缴纳，具体以通知书为准', '建议提前网上缴费'),
('学费（艺术类）', '学费', '6800元/年', '银行卡代扣/网上缴费', '开学前', '艺术类专业学费标准', '以录取通知书为准'),
('住宿费（四人间）', '住宿费', '1200-1500元/年', '随学费一起缴纳', '开学前', '四人间，空调独立卫浴', '宿舍由学院统一分配'),
('住宿费（六人间）', '住宿费', '800-1000元/年', '随学费一起缴纳', '开学前', '六人间标准宿舍', '宿舍由学院统一分配'),
('教材费', '教材费', '约500-800元/年', '开学后到教材科购买', '开学第一周', '根据课程需要购买', '可买二手教材省钱'),
('电费', '水电费', '0.52元/度', '微信公众号/自助机充值', '随时', '按宿舍独立计量', '余额不足50元时及时充值');

-- 食堂
INSERT INTO cafeteria (name, location, building_id, open_time, description) VALUES
('一食堂', '教学楼东侧', 6, '早餐6:30-9:00 午餐11:00-13:00 晚餐17:00-19:00', '离教学楼最近，下课后首选'),
('二食堂', '宿舍区南侧', 7, '早餐7:00-9:30 午餐10:30-13:30 晚餐16:30-19:30', '品种最多，价格实惠'),
('风味食堂', '校园西侧', 8, '午餐11:00-13:30 晚餐17:00-19:00', '各地特色小吃，选择多样');

-- 菜品
INSERT INTO dish (cafeteria_id, name, dish_type, price, description) VALUES
(1, '红烧肉套餐', '午餐', 12.00, '招牌菜，肉质软烂入味'),
(1, '麻辣香锅', '午餐', 15.00, '自选食材，微辣/中辣/特辣可选'),
(1, '手抓饼', '早餐', 5.00, '加蛋加肠都很好吃'),
(1, '豆浆油条', '早餐', 4.00, '经典早餐搭配'),
(2, '黄焖鸡米饭', '午餐', 13.00, '人气最高的菜品'),
(2, '酸菜鱼', '午餐', 16.00, '鱼肉鲜嫩，酸辣开胃'),
(2, '砂锅米线', '午餐', 10.00, '冬天暖胃首选'),
(2, '煎饼果子', '早餐', 6.00, '排队最长的窗口'),
(3, '麻辣烫', '午餐', 12.00, '自选食材，按重量计费'),
(3, '烤肉饭', '晚餐', 14.00, '烤肉配米饭，学生最爱'),
(3, '重庆小面', '午餐', 9.00, '面条劲道，辣味十足');

-- 周边景点
INSERT INTO attraction (name, attr_type, distance, transport, description) VALUES
('荡口古镇', '景点', '公交约30分钟', '乘公交到荡口古镇站', '历史文化古镇，免费开放，适合周末游玩'),
('锡惠公园', '景点', '地铁约40分钟', '乘地铁到惠山古镇站', '无锡著名景点，惠山古镇也在附近'),
('三阳广场', '商场', '地铁约50分钟', '乘地铁1号线到三阳广场站', '市中心商圈，购物美食集中'),
('鼋头渚', '景点', '公交约1小时', '乘公交到鼋头渚站', '太湖风景区，樱花季必去'),
('校门口商业街', '超市', '步行5分钟', '步行', '小吃、奶茶、超市，满足日常需求'),
('锡山人民医院', '医院', '打车约10分钟', '打车', '综合医院，医保可用');

SELECT '===== MySQL建表和数据插入完成 =====' AS result;
