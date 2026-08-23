const https = require('https');

const LLM_API_URL = 'https://api.xiaomimimo.com/v1/chat/completions';
const LLM_API_KEY = 'REDACTED-LLM-API-KEY';
const LLM_MODEL = 'MiMo-7B-RL';

const body = JSON.stringify({
    model: LLM_MODEL,
    messages: [
        { role: 'user', content: '你好' }
    ],
    max_tokens: 100
});

const url = new URL(LLM_API_URL);
const options = {
    hostname: url.hostname,
    port: url.port || 443,
    path: url.pathname,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_API_KEY}`,
        'Content-Length': Buffer.byteLength(body)
    }
};

const req = https.request(options, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', data.substring(0, 500));
        process.exit(0);
    });
});

req.on('error', e => {
    console.log('Error:', e.message);
    process.exit(1);
});

req.setTimeout(15000, () => { console.log('Timeout'); req.destroy(); process.exit(1); });
req.write(body);
req.end();
