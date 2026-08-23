const { spawn, exec } = require('child_process');
const net = require('net');
const path = require('path');
const fs = require('fs');

function checkPort(port) {
    return new Promise(r => {
        const s = net.createServer();
        s.listen(port, () => { s.close(); r(false); });
        s.on('error', () => r(true));
    });
}

function asyncExec(cmd) {
    return new Promise(resolve => {
        exec(cmd, { windowsHide: true }, () => resolve());
    });
}

async function main() {
    // 1. 杀旧进程
    if (await checkPort(3000)) {
        try {
            const out = require('child_process').execSync('netstat -ano', { encoding: 'utf8', windowsHide: true });
            const line = out.split('\n').find(l => l.includes(':3000') && l.includes('LISTENING'));
            if (line) {
                const pid = line.trim().match(/\s(\d+)$/)?.[1];
                if (pid) await asyncExec(`taskkill /F /PID ${pid}`);
            }
        } catch (e) {}
    }

    // 2. 启动新服务器
    const server = spawn('node', ['app.js'], { cwd: __dirname, detached: true, stdio: 'ignore', windowsHide: true });
    server.unref();
    fs.writeFileSync(path.join(__dirname, 'server.pid'), String(server.pid));
    console.log('Server PID:', server.pid);

    // 3. 等2秒后测试
    setTimeout(() => {
        const http = require('http');
        http.get('http://127.0.0.1:3000/api/info/enrollment', res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                console.log('Server OK');
                process.exit(0);
            });
        }).on('error', () => { console.log('Server not ready yet'); process.exit(0); });
    }, 2000);
}

main();
