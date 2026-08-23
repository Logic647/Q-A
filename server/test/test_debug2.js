const http = require('http');
const data = JSON.stringify({ user_id: 0, question_text: '从无锡东站怎么去学校' });
const r = http.request({
    hostname: '127.0.0.1', port: 3000, path: '/api/qa/ask', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
}, res => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => { console.log(JSON.stringify(JSON.parse(body), null, 2)); process.exit(0); });
});
r.on('error', e => { console.log('Error:', e.message); process.exit(1); });
r.write(data);
r.end();
