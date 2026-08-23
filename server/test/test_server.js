const http = require('http');

const data = JSON.stringify({ user_id: 0, question_text: '学校怎么去' });

const r = http.request({
    hostname: '127.0.0.1', port: 3000, path: '/api/qa/ask', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
}, res => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => {
        const j = JSON.parse(body);
        console.log('Source:', j.source);
        console.log('Channel:', j.data?.channel);
        console.log('Answer:\n' + (j.data?.answer || 'null'));
        process.exit(0);
    });
});
r.on('error', e => { console.log('Error:', e.message); process.exit(1); });
r.write(data);
r.end();
