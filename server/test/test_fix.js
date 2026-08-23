const Redis = require('ioredis');
const http = require('http');

async function flushAndTest() {
    // Clear cache
    const redis = new Redis({ host: '127.0.0.1', port: 6379, retryStrategy: () => null });
    const keys = await redis.keys('qa:*');
    for (const k of keys) await redis.del(k);
    console.log(`Cleared ${keys.length} cached entries`);
    redis.disconnect();

    // Test the three fixed questions
    const questions = [
        '学校怎么去',
        '食堂有什么好吃的',
        '有没有奖学金'
    ];

    for (const q of questions) {
        const data = JSON.stringify({ user_id: 0, question_text: q });
        const r = await new Promise(resolve => {
            const req = http.request({
                hostname: '127.0.0.1', port: 3000, path: '/api/qa/ask', method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
            }, res => {
                let body = '';
                res.on('data', c => body += c);
                res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { resolve({}); } });
            });
            req.on('error', e => resolve({ error: e.message }));
            req.setTimeout(30000, () => { req.destroy(); resolve({}); });
            req.write(data);
            req.end();
        });
        
        const source = r.source || r.data?.source || '?';
        const answer = (r.data?.answer || '').substring(0, 120).replace(/\n/g, ' | ');
        console.log(`\n[${r.data?.channel}|${source}] ${q}`);
        console.log(`  -> ${answer}`);
    }
}

flushAndTest().then(() => process.exit(0));
