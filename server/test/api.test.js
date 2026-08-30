const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const http = require('http');

const moduleRoot = path.join(__dirname, '..');
const resolved = name => require.resolve(path.join(moduleRoot, name));

// 测试凭据自供，不依赖开发者本地 .env（app.js 的 .env 加载器不会覆盖已有环境变量）
process.env.ADMIN_KEY = 'test-admin-key';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'test-admin-pass';

const dbQueries = [];
let generatedDbId = 100;
const requestStub = () => ({
    input(name, type, value) {
        this.params = this.params || {};
        this.params[name] = value;
        return this;
    },
    async query(sql) {
        dbQueries.push({ sql, params: this.params || {} });
        if (sql.includes('FROM question') && sql.includes('FROM feedback')) {
            throw new Error('unexpected combined stats query');
        }
        if (sql.includes('COUNT(*) AS total') && sql.includes('FROM question')) {
            return { recordset: [{ total: 12, pending: 4 }] };
        }
        if (sql.includes('SELECT TOP 3') && sql.includes('FROM knowledge_base') && this.params?.q?.includes('完全不匹配')) {
            return { recordset: [] };
        }
        if (sql.includes('SELECT TOP 3') && sql.includes('FROM knowledge_base')) {
            return { recordset: [{
                question_text: '学校在哪里',
                answer_text: '无锡学院位于无锡市。',
                category: '学校'
            }] };
        }
        if (sql.startsWith('SELECT LAST_INSERT_ID()')) {
            generatedDbId += 1;
            return { recordset: [{ id: generatedDbId }] };
        }
        if (sql.includes('SELECT question_id FROM question')) {
            return { recordset: [] };
        }
        if (sql.includes('SELECT TOP 1 answer_id FROM answer')) {
            return { recordset: [] };
        }
        if (sql.includes('review_status = 0')) {
            return { recordset: [{ count: 3 }] };
        }
        if (sql.includes('FROM answer a INNER JOIN question q')) {
            return { recordset: [{
                question_id: 33,
                question_text: '测试问题',
                answer_text: '有效回答',
                category: '学校'
            }] };
        }
        if (sql.includes('FROM knowledge_base')) {
            return { recordset: [{ total: 20, from_review: 7 }] };
        }
        if (sql.includes('FROM feedback')) {
            return { recordset: [{ count: 2 }] };
        }
        return { recordset: [] };
    }
});

require.cache[resolved('config/db')] = {
    id: resolved('config/db'),
    filename: resolved('config/db'),
    loaded: true,
    exports: {
        sql: { NVarChar: 's', Int: 'i', TinyInt: 't', Decimal: () => 'd' },
        getPool: async () => ({ request: requestStub })
    }
};
require.cache[resolved('services/llm')] = {
    id: resolved('services/llm'),
    filename: resolved('services/llm'),
    loaded: true,
    exports: {
        askLLM: async (question, context) => (context ? '测试回答' : '这个问题暂时还没有被收录，但你的问题已经被记录啦，后续会逐步解答的～')
    }
};
require.cache[resolved('config/redis')] = {
    id: resolved('config/redis'),
    filename: resolved('config/redis'),
    loaded: true,
    exports: {
        get: async () => null,
        setex: async () => {},
        scan: async () => ['0', []],
        del: async () => {}
    }
};
require.cache[resolved('services/embedding')] = {
    id: resolved('services/embedding'),
    filename: resolved('services/embedding'),
    loaded: true,
    exports: { isConfigured: () => false }
};

const { app } = require('../app');

const server = http.createServer(app);
let baseUrl;

test.before(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => new Promise(resolve => {
    server.close(() => resolve());
    if (server.closeAllConnections) server.closeAllConnections();
}));

async function call(method, url, body, headers = {}) {
    const res = await fetch(`${baseUrl}${url}`, {
        method,
        headers: { 'content-type': 'application/json', ...headers },
        body: body ? JSON.stringify(body) : undefined
    });
    return { status: res.status, body: await res.json() };
}

let adminToken;

test('admin login returns a token only for valid credentials', async () => {
    const bad = await call('POST', '/api/admin/login', { username: 'admin', password: 'wrong' });
    assert.equal(bad.body.code, -1);

    const good = await call('POST', '/api/admin/login', { username: 'admin', password: 'test-admin-pass' });
    assert.equal(good.body.code, 0);
    assert.ok(good.body.token);
    adminToken = good.body.token;
});

test('admin stats supports both current and legacy clients', async () => {
    const res = await call('GET', '/api/admin/stats', null, { 'x-admin-key': adminToken });
    assert.equal(res.status, 200);
    assert.equal(res.body.code, 0);
    assert.deepEqual(res.body.data.questions, { total: 12, pending: 4 });
    assert.equal(res.body.data.pending_review, 3);
    assert.equal(res.body.data.knowledge_base.total, 20);
    assert.equal(res.body.data.low_score_count, 2);
});

test('feedback accepts Decimal parameter type', async () => {
    dbQueries.length = 0;
    const res = await call('POST', '/api/qa/feedback', {
        answer_id: 1, user_id: 2, score: 5, comment: ''
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.code, 0);
    assert.ok(dbQueries.some(q => q.sql.startsWith('UPDATE answer')));
});

test('rejecting an answer returns its question to pending', async () => {
    dbQueries.length = 0;
    const res = await call('POST', '/api/admin/review', {
        answer_id: 9, reviewer_id: 1, action: 2
    }, { 'x-admin-key': adminToken });

    assert.equal(res.status, 200);
    assert.equal(res.body.code, 0);
    assert.ok(dbQueries.some(q => q.sql.includes('UPDATE question SET status = 0')));
});

test('approving an answer marks its question answered', async () => {
    dbQueries.length = 0;
    const res = await call('POST', '/api/admin/review', {
        answer_id: 12, reviewer_id: 1, action: 1
    }, { 'x-admin-key': adminToken });

    assert.equal(res.status, 200);
    assert.equal(res.body.code, 0);
    assert.ok(dbQueries.some(q => q.sql.includes('UPDATE question SET status = 1')));
    assert.ok(!dbQueries.some(q => q.sql.includes('UPDATE question SET status = 0')));
});

test('batch rejection returns questions to pending', async () => {
    dbQueries.length = 0;
    const res = await call('POST', '/api/admin/review/batch', {
        answer_ids: [10, 11], action: 2
    }, { 'x-admin-key': adminToken });

    assert.equal(res.status, 200);
    assert.equal(res.body.code, 0);
    assert.ok(dbQueries.some(q => q.sql.includes('UPDATE question SET status = 0')));
});

test('ask returns persistent question and answer ids', async () => {
    dbQueries.length = 0;
    const res = await call('POST', '/api/qa/ask', {
        user_id: 7, question_text: '学校在哪里'
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.code, 0);
    assert.equal(res.body.data.question_id, 101);
    assert.equal(res.body.data.answer_id, 102);
    assert.ok(dbQueries.some(q => q.sql.includes('INSERT INTO answer')));
});

test('unmatched ask records only the pending question', async () => {
    dbQueries.length = 0;
    const res = await call('POST', '/api/qa/ask', {
        user_id: 7, question_text: '完全不匹配的问题'
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.channel, 2);
    assert.equal(res.body.data.answer_id, 0);
    assert.ok(dbQueries.some(q => q.sql.includes('INSERT INTO question')));
    assert.ok(!dbQueries.some(q => q.sql.includes('INSERT INTO answer')));
});
