const http = require('http');

function ask(question) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ user_id: 0, question_text: question });
        const req = http.request({
            hostname: '127.0.0.1',
            port: 3000,
            path: '/api/qa/ask',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
        }, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                try { resolve(JSON.parse(body)); } catch (e) { resolve({ raw: body }); }
            });
        });
        req.on('error', e => resolve({ error: e.message }));
        req.setTimeout(30000, () => { req.destroy(); resolve({ error: 'timeout' }); });
        req.write(data);
        req.end();
    });
}

async function run() {
    // 测试一个应该走LLM的问题
    const r = await ask('学校有多少学生');
    console.log('Response:', JSON.stringify(r, null, 2));
    process.exit(0);
}

run();
