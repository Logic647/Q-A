const https = require('https');
const http = require('http');

const LLM_API_URL = 'https://api.xiaomimimo.com/v1/chat/completions';
const LLM_API_KEY = 'REDACTED-LLM-API-KEY';
const LLM_MODEL = 'mimo-v2.5';

const SYSTEM_PROMPT = `你是"无锡学院新生助手"，专门帮助大学新生解答入学相关问题。

规则：
1. 如果【参考资料】中有相关信息，用友好自然的语气组织回答，分点列出关键信息，控制在200字以内
2. 如果【参考资料】为空或没有相关信息：
   - 如果问题是关于无锡学院的（入学、校园、专业、费用等），回复："这个问题暂时还没有被收录，但你的问题已经被记录啦，后续会逐步解答的～"
   - 如果是一般常识性问题（天气、地理、通用知识等），可以自由回答
3. 回答简洁实用
4. 语气亲切友好，像学长学姐在帮忙
5. 纯文本回复，禁止使用任何 Markdown 格式符号（不要用**、*、#、-等标记符号，用数字编号代替）`;

// 单次 LLM 调用
function callLLM(body) {
    return new Promise((resolve) => {
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
                    if (json.choices && json.choices[0]?.message?.content) {
                        resolve(json.choices[0].message.content);
                    } else {
                        resolve('');
                    }
                } catch (e) {
                    resolve('');
                }
            });
        });

        req.on('error', () => resolve(''));
        req.setTimeout(15000, () => { req.destroy(); resolve(''); });
        req.write(body);
        req.end();
    });
}

// 去除 Markdown 格式符号
function stripMarkdown(text) {
    return text
        .replace(/\*\*(.+?)\*\*/g, '$1')   // **粗体** → 粗体
        .replace(/\*(.+?)\*/g, '$1')         // *斜体* → 斜体
        .replace(/^#{1,6}\s+/gm, '')         // ### 标题 → 标题
        .replace(/^[-*+]\s+/gm, (m) => {     // - 列表 → 1. 列表
            return '';
        })
        .replace(/^\d+\.\s*/gm, (m) => m)    // 保留数字编号
        .trim();
}

// 带重试的 LLM 调用
async function askLLM(question, context = '') {
    let userContent;
    if (context) {
        userContent = `【参考资料】\n${context}\n\n【新生提问】${question}`;
    } else {
        userContent = `【参考资料】（暂无相关资料）\n\n【新生提问】${question}`;
    }

    const body = JSON.stringify({
        model: LLM_MODEL,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userContent }
        ],
        max_tokens: 500,
        temperature: 0.7
    });

    // 最多重试 1 次（总共最多 2 次请求）
    for (let i = 0; i < 2; i++) {
        const result = await callLLM(body);
        if (result && result.trim()) return stripMarkdown(result);
        console.log(`[LLM] 第${i + 1}次返回空，${i < 1 ? '重试中...' : '放弃'}`);
        await new Promise(r => setTimeout(r, 1000));
    }

    return '';
}

module.exports = { askLLM };
