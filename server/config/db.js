const msnodesqlv8 = require('msnodesqlv8');
const connStr = 'Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=FreshmanQA;Trusted_Connection=Yes;';

function rawQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        msnodesqlv8.query(connStr, sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve({ recordset: rows || [] });
        });
    });
}

function createRequest() {
    const paramMap = {};
    const req = {
        input: (name, type, value) => {
            paramMap[name.toLowerCase()] = value;
            return req;
        },
        query: (sql) => {
            const processed = sql.replace(/@(\w+)/g, (match, name) => {
                const val = paramMap[name.toLowerCase()];
                if (val === undefined || val === null) return 'NULL';
                if (typeof val === 'number') return val.toString();
                return `N'${val.toString().replace(/'/g, "''")}'`;
            });
            return rawQuery(processed);
        }
    };
    return req;
}

async function getPool() {
    return { request: createRequest };
}

module.exports = { sql: { NVarChar: 'nvarchar', Int: 'int', TinyInt: 'tinyint' }, getPool };
