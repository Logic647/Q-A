const { getPool } = require('./config/db');

async function updateCoords() {
    try {
        const pool = await getPool();
        const updates = [
            ['第一教学楼', 31.5082, 120.4275],
            ['第二教学楼', 31.5085, 120.4280],
            ['图书馆', 31.5078, 120.4290],
            ['体育馆', 31.5070, 120.4295],
            ['行政楼', 31.5088, 120.4265],
            ['一食堂', 31.5065, 120.4270],
            ['二食堂', 31.5068, 120.4285],
            ['风味食堂', 31.5060, 120.4275],
            ['学生宿舍区', 31.5090, 120.4280],
            ['校园卡服务中心', 31.5075, 120.4260]
        ];

        for (const [name, lat, lng] of updates) {
            await pool.request()
                .query(`UPDATE campus_building SET latitude = ${lat}, longitude = ${lng} WHERE name = N'${name}'`);
        }

        const result = await pool.request().query('SELECT name, latitude, longitude FROM campus_building');
        console.log(JSON.stringify(result.recordset, null, 2));
        console.log('坐标更新完成');
    } catch (err) {
        console.error('更新失败:', err.message);
    }
}

updateCoords();
