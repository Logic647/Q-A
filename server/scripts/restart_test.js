const { spawn } = require('child_process');
const net = require('net');
const http = require('http');
const path = require('path');

function checkPort(port) {
    return new Promise(r => {
        const s = net.createServer();
        s.once('error', () => r(true));
        s.once('listening', () => { s.close(); r(false); });
        s.listen(port);
    });
}

async function main() {
    const inUse = await checkPort(3000);
    if (inUse) {
        try {
            const { execSync } = require('child_process');
            const output = execSync('netstat -ano', { encoding: 'utf8', windowsHide: true });
            const match = output.split('\n').find(l => l.includes(':3000') && l.includes('LISTENING'));
            if (match) {
                const pid = match.trim().match(/\s(\d+)$/)?.[1];
                if (pid) {
                    execSync(`taskkill /PID ${pid} /F`, { windowsHide: true });
                    console.log('Killed old server PID:', pid);
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
        } catch (e) {}
    }

    // Start new server
    const server = spawn('node', ['app.js'], {
        cwd: path.join(__dirname),
        detached: true,
        stdio: 'ignore',
        windowsHide: true
    });
    server.unref();
    console.log('New server PID:', server.pid);
    
    // Wait and test
    await new Promise(r => setTimeout(r, 3000));
    
    const questions = ['学校怎么去', '食堂有什么好吃的', '有没有奖学金'];
    for (const q of questions) {
        const data = JSON.stringify({ user_id: 0, question_text: q });
        const r = await new Promise(resolve => {
            const req = http.request({
                hostname: '127.0.0.1', port: 3000, path: '/api/qa/ask', method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
            }, res => {
                let body = '';
                res.on('data', c => body += c);
                res.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { resolve({}); } });
            });
            req.on('error', e => resolve({ error: e.message }));
            req.setTimeout(30000, () => { req.destroy(); resolve({}); });
            req.write(data);
            req.end();
        });
        const src = r.source || r.data?.source || '?';
        const ans = (r.data?.answer || '').substring(0, 150).replace(/\n/g, ' | ');
        console.log(`\n[${r.data?.channel}|${src}] ${q}`);
        console.log(`  -> ${ans}`);
    }
    process.exit(0);
}

main();
