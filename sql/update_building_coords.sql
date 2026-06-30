-- 更新校园建筑坐标为真实数据
-- 无锡学院地址：江苏省无锡市锡山区锡山大道333号
-- 参考坐标：31.5075°N, 120.4283°E（学校中心）

USE FreshmanQA;
GO

-- 更新建筑坐标（以学校中心为基准，合理分布）
UPDATE campus_building SET latitude = 31.5082, longitude = 120.4275 WHERE name = '第一教学楼';
UPDATE campus_building SET latitude = 31.5085, longitude = 120.4280 WHERE name = '第二教学楼';
UPDATE campus_building SET latitude = 31.5078, longitude = 120.4290 WHERE name = '图书馆';
UPDATE campus_building SET latitude = 31.5070, longitude = 120.4295 WHERE name = '体育馆';
UPDATE campus_building SET latitude = 31.5088, longitude = 120.4265 WHERE name = '行政楼';
UPDATE campus_building SET latitude = 31.5065, longitude = 120.4270 WHERE name = '一食堂';
UPDATE campus_building SET latitude = 31.5068, longitude = 120.4285 WHERE name = '二食堂';
UPDATE campus_building SET latitude = 31.5060, longitude = 120.4275 WHERE name = '风味食堂';
UPDATE campus_building SET latitude = 31.5090, longitude = 120.4280 WHERE name = '学生宿舍区';
UPDATE campus_building SET latitude = 31.5075, longitude = 120.4260 WHERE name = '校园卡服务中心';

SELECT name, latitude, longitude FROM campus_building;
GO
