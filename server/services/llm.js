const https = require('https');
const http = require('http');

const LLM_API_URL = 'https://api.xiaomimimo.com/v1/chat/completions';
const LLM_API_KEY = 'REDACTED-LLM-API-KEY';
const LLM_MODEL = 'mimo-v2-flash';

async function askLLM(question) {
    const body = JSON.stringify({
        model: LLM_MODEL,
        messages: [
            {
                role: 'system',
                content: '你是一个新生入学助手，专门回答大学新生关于入学报到、交通出行、费用缴纳、食堂餐饮、校园设施、宿舍生活等方面的问题。回答要简洁实用，分点列出，语气友好亲切。如果问题与大学入学无关，请礼貌地说明你只能回答入学相关问题。'
            },
            {
                role: 'user',
                content: question
            }
        ],
        max_tokens: 500,
        temperature: 0.7
    });

    return new Promise((resolve, reject) => {
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

        const transport = url.protocol === 'https:' ? https : http;
        const req = transport.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.choices && json.choices[0]) {
                        resolve(json.choices[0].message.content);
                    } else {
                        resolve('抱歉，暂时无法回答这个问题。');
                    }
                } catch (e) {
                    resolve('抱歉，暂时无法回答这个问题。');
                }
            });
        });

        req.on('error', () => resolve('抱歉，服务暂时不可用，请稍后重试。'));
        req.setTimeout(30000, () => { req.destroy(); resolve('抱歉，回答超时，请换个问题试试。'); });
        req.write(body);
        req.end();
    });
}

module.exports = { askLLM };
