const mysql = require('mysql2/promise');

// 数据库配置 - 根据环境变量选择 MySQL 或 SQL Server
const DB_TYPE = process.env.DB_TYPE || 'mysql';

const mysqlConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'REDACTED-DB-PASSWORD',
    database: process.env.DB_NAME || 'FreshmanQA',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10
};

let mysqlPool = null;

function getMysqlPool() {
    if (!mysqlPool) {
        mysqlPool = mysql.createPool(mysqlConfig);
    }
    return mysqlPool;
}

// 模拟 SQL Server 的 request 接口，让现有代码无需修改
function createRequest() {
    const paramMap = {};
    const paramTypes = {};
    const req = {
        input: (name, type, value) => {
            paramMap[name] = value;
            paramTypes[name] = type;
            return req;
        },
        query: async (sql) => {
            const pool = getMysqlPool();
            // 将 @param 替换为 ? 并收集参数值
            const values = [];
            const processed = sql.replace(/@(\w+)/g, (match, name) => {
                values.push(paramMap[name] !== undefined ? paramMap[name] : null);
                return '?';
            });
            try {
                const [rows] = await pool.execute(processed, values);
                return { recordset: rows || [] };
            } catch (err) {
                throw err;
            }
        }
    };
    return req;
}

async function getPool() {
    return { request: createRequest };
}

module.exports = { sql: { NVarChar: 'string', Int: 'int', TinyInt: 'tinyint' }, getPool };
