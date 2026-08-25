const test = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');

const dbPath = require.resolve('../config/db');

function withExecuteMock(execute, fn) {
    const original = mysql.createPool;
    mysql.createPool = () => ({
        getConnection: async () => ({
            query: async () => {},
            execute,
            release() {}
        })
    });
    require.cache[dbPath] = undefined;
    delete require.cache[dbPath];

    return Promise.resolve(fn(require(dbPath))).finally(() => {
        mysql.createPool = original;
        delete require.cache[dbPath];
    });
}

test('TOP query is converted to MySQL LIMIT', async () => {
    let seen;
    await withExecuteMock(async (sql) => {
        seen = sql;
        return [[]];
    }, async ({ getPool }) => {
        await (await getPool()).request().query('SELECT TOP 3 id FROM knowledge_base ORDER BY hit_count DESC');
    });

    assert.equal(seen, 'SELECT id FROM knowledge_base ORDER BY hit_count DESC LIMIT 3');
});

test('repeated parameters are supplied once per placeholder', async () => {
    let sql;
    let values;
    await withExecuteMock(async (query, args) => {
        sql = query;
        values = args;
        return [[]];
    }, async ({ getPool }) => {
        await (await getPool()).request()
            .input('q', 'string', 'foo')
            .query('SELECT * FROM t WHERE a LIKE @q OR b LIKE @q');
    });

    assert.equal(sql, 'SELECT * FROM t WHERE a LIKE ? OR b LIKE ?');
    assert.deepEqual(values, ['foo', 'foo']);
});
