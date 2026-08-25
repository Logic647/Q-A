const https = require('https');
const http = require('http');

const LLM_API_URL = 'https://api.xiaomimimo.com/v1/chat/completions';
const LLM_API_KEY = process.env.LLM_API_KEY || '';
const LLM_MODEL = 'mimo-v2.5';

// 从推理内容中提取纯回答（去掉思考过程）
function extractAnswer(text) {
    // 推理内容中，实际回答通常在最后几段
    // 常见的思考前缀模式
    const thinkPatterns = [
        /^嗯[，,]/, /^首先[，,]/, /^用户[问想要]/, /^我需要[根据根据]/,
        /^参考[资资料]/, /^根据[资料问题]/, /^我应该/, /^让我/,
        /^这是一个/, /^从[问资料]/, /^关于[这用户]/
    ];
    
    const lines = text.split('\n').filter(l => l.trim());
    
    // 找到最后一个不含思考模式的段落
    let lastAnswerStart = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
        const isThink = thinkPatterns.some(p => p.test(lines[i].trim()));
        if (!isThink) {
            lastAnswerStart = i;
            break;
        }
    }
    
    if (lastAnswerStart >= 0) {
        return lines.slice(lastAnswerStart).join('\n').trim();
    }
    
    // 找不到明确分界，返回全文
    return text;
}

const SYSTEM_PROMPT = `你是"无锡学院新生助手"，专门帮助大学新生解答入学相关问题。

【重要】直接输出最终回答，不要输出任何思考过程、分析过程、推理步骤。不要出现"用户问的是""我需要""根据资料""我应该"等思考性文字。直接给用户答案。

规则：
1. 如果【参考资料】中有相关信息，用友好自然的语气组织回答，分点列出关键信息，控制在200字以内
2. 如果【参考资料】为空或没有相关信息：
   - 如果问题是关于无锡学院的（入学、校园、专业、费用等），回复："这个问题暂时还没有被收录，但你的问题已经被记录啦，后续会逐步解答的～"
   - 如果是一般常识性问题（天气、地理、通用知识等），可以自由回答
3. 回答简洁实用
4. 语气亲切友好，像学长学姐在帮忙
5. 纯文本回复，禁止使用任何 Markdown 格式符号（不要用**、*、#、-等标记符号，用数字编号代替）
6. 不要输出"参考资料显示""根据以上资料""我应该"等引导语，直接说答案内容`;

// 单次 LLM 调用
function callLLM(body) {
    if (!LLM_API_KEY) return Promise.resolve('');

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
                    if (json.choices && json.choices[0]) {
                        const msg = json.choices[0].message;
                        const content = (msg.content || '').trim();
                        const reasoning = (msg.reasoning_content || '').trim();
                        
                        // 优先用 content（模型直接输出的回答）
                        if (content) { resolve(content); }
                        // content 为空时，从 reasoning 中提取回答
                        else if (reasoning) { resolve(extractAnswer(reasoning)); }
                        else { resolve(''); }
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
        max_tokens: 1024,
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

// 规则提取关键词（从问题中提取核心名词）
function extractKeywordsRule(question) {
    const stopWords = ['学校', '我们', '的', '吗', '呢', '啊', '吧', '是', '有', '在', '能', '可以', '怎么', '如何', '什么', '哪里', '几个', '多少', '有没有', '怎么样', '好不好', '从', '到', '去'];
    const clean = question.replace(/[？?！!。，,、\s\?]/g, '');

    // 提取整个清洗后的问题作为主搜索词
    const keywords = [clean];

    // 同义词扩展
    const SYNONYMS = {
        '售货机': ['自动售货', '贩卖机', '自动贩卖'],
        '饮料': ['饮品', '奶茶'],
        '咖啡': ['咖啡厅', '咖啡店', '咖啡机'],
        '上床下桌': ['床位', '床铺', '宿舍布局'],
        '空调': ['冷气', '暖气'],
        '开门': ['开放时间', '营业时间', '几点开'],
        '怎么去': ['路线', '如何到达', '坐车'],
        '学费': ['费用', '收费', '多少钱'],
        '食堂': ['餐厅', '饭堂', '吃饭'],
    };

    for (const [word, synonyms] of Object.entries(SYNONYMS)) {
        if (clean.includes(word)) {
            synonyms.forEach(s => { if (!keywords.includes(s)) keywords.push(s); });
        }
    }

    return keywords.slice(0, 5);
}

module.exports = { askLLM, extractKeywordsRule };
