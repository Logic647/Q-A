const test = require('node:test');
const assert = require('node:assert/strict');

const redisPath = require.resolve('../config/redis');

test('rate limit policies do not share counters', async () => {
    const counts = new Map();
    require.cache[redisPath] = {
        id: redisPath,
        filename: redisPath,
        loaded: true,
        exports: {
            incr: async key => {
                const next = (counts.get(key) || 0) + 1;
                counts.set(key, next);
                return next;
            },
            expire: async () => {}
        }
    };

    const { limiters } = require('../middleware/rateLimit');
    const req = { ip: '127.0.0.1' };
    const res = { set() {} };
    let called = false;
    const next = () => { called = true; };

    for (let i = 0; i < 5; i++) {
        await limiters.api(req, res, next);
        assert.equal(called, true);
        called = false;
    }

    await limiters.login(req, res, next);
    assert.equal(called, true);
    assert.deepEqual([...counts.keys()].sort(), [
        'ratelimit:api:127.0.0.1',
        'ratelimit:login:127.0.0.1'
    ]);
});
