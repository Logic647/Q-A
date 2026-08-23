const mysql = require('mysql2/promise');
const mysqlConfig = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'REDACTED-DB-PASSWORD',
    database: 'FreshmanQA',
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
function createRequest() {
    const paramMap = {};
    const req = {
        input: (name, type, value) => { paramMap[name] = value; return req; },
        query: async (sql) => {
            const pool = getMysqlPool();
            const conn = await pool.getConnection();
            await conn.query('SET NAMES utf8mb4');
            let processed = sql;
            const topMatch = processed.match(/SELECT TOP (\d+)/i);
            if (topMatch) {
                const limitN = topMatch[1];
                processed = processed.replace(/SELECT TOP \d+/i, 'SELECT');
                if (processed.toUpperCase().includes('ORDER BY')) {
                    processed = processed.replace(/(ORDER BY[^;]*?)(;|$)/i, '$1 LIMIT ' + limitN + '$2');
                } else {
                    processed = processed.replace(/;?\s*$/, ' LIMIT ' + limitN);
                }
            }
            const values = [];
            const finalSql = processed.replace(/@(\w+)/g, (m, name) => {
                values.push(paramMap[name] !== undefined ? paramMap[name] : null);
                return '?';
            });
            try {
                const [rows] = await conn.execute(finalSql, values);
                return { recordset: rows || [] };
            } finally {
                conn.release();
            }
        }
    };
    return req;
}
async function getPool() { return { request: createRequest }; }
module.exports = { sql: { NVarChar: 'string', Int: 'int', TinyInt: 'tinyint' }, getPool };
