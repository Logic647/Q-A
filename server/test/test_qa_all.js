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
    const questions = [
        '学校怎么去',
        '从火车站到学校怎么走',
        '学费多少钱',
        '食堂有什么好吃的',
        '宿舍有空调吗',
        '报到需要带什么材料',
        '图书馆几点开门',
        '学校有WiFi吗',
        '怎么选课',
        '学校周边有什么好玩的',
        '学校附近有医院吗',
        '校医院在哪里',
        '开学什么时候',
        '有没有奖学金',
        '食堂贵不贵',
        '怎么去图书馆',
        '学校专业有哪些',
        '军训什么时候',
        '校园卡怎么充值',
        '学校有多少学生'
    ];

    console.log('=== 问答匹配测试 ===\n');

    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const r = await ask(q);
        
        let status = '';
        let answer = '';
        
        if (r.error) {
            status = 'ERROR';
            answer = r.error;
        } else if (r.code === 0 && r.data) {
            const channel = r.data.channel;
            const source = r.source || r.data.source || '?';
            answer = (r.data.answer || '').substring(0, 80).replace(/\n/g, ' ');
            status = `[ch=${channel}|${source}]`;
        } else {
            status = 'UNKNOWN';
            answer = JSON.stringify(r).substring(0, 80);
        }
        
        console.log(`${i+1}. ${q}`);
        console.log(`   ${status} ${answer}\n`);
    }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
