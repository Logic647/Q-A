const http = require('http');
const questions = ['从无锡东站怎么去学校', '学校怎么去', '从火车站到学校怎么走'];

async function test(q) {
    const data = JSON.stringify({ user_id: 0, question_text: q });
    return new Promise(resolve => {
        const r = http.request({
            hostname: '127.0.0.1', port: 3000, path: '/api/qa/ask', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
        }, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                try {
                    const j = JSON.parse(body);
                    resolve({ src: j.source, ch: j.data?.channel, ans: j.data?.answer?.substring(0, 200) });
                } catch(e) { resolve({}); }
            });
        });
        r.on('error', e => resolve({ error: e.message }));
        r.setTimeout(20000, () => { r.destroy(); resolve({}); });
        r.write(data);
        r.end();
    });
}

async function main() {
    for (const q of questions) {
        const r = await test(q);
        console.log(`[${r.src}|ch=${r.ch}] ${q}`);
        console.log(`  ${r.ans}\n`);
    }
}
main().then(() => process.exit(0));
