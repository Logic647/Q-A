const { execSync } = require('child_process');
const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

async function checkPort(port) {
    return new Promise(r => {
        const s = net.createServer();
        s.once('error', () => r(true));
        s.once('listening', () => { s.close(); r(false); });
        s.listen(port);
    });
}

async function main() {
    // Kill old server
    const inUse = await checkPort(3000);
    if (inUse) {
        try {
            const output = execSync('netstat -ano', { encoding: 'utf8', windowsHide: true });
            const lines = output.split('\n').filter(l => l.includes(':3000') && l.includes('LISTENING'));
            for (const line of lines) {
                const match = line.trim().match(/(\d+)\s*$/);
                if (match) {
                    try { execSync(`taskkill /PID ${match[1]} /F`, { windowsHide: true }); } catch(e) {}
                }
            }
        } catch (e) {}
        await new Promise(r => setTimeout(r, 2000));
    }

    // Start new server
    const server = spawn('node', ['app.js'], {
        cwd: path.join(__dirname),
        detached: true,
        stdio: 'ignore',
        windowsHide: true
    });
    server.unref();
    console.log('PID:', server.pid);

    // Wait and verify
    await new Promise(r => setTimeout(r, 4000));
    
    const http = require('http');
    http.get('http://127.0.0.1:3000/api/info/enrollment', res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
            try {
                const r = JSON.parse(d);
                console.log('OK, enrollment:', r.data?.length, 'steps');
            } catch(e) { console.log('Parse error'); }
            process.exit(0);
        });
    }).on('error', () => { console.log('Connection error'); process.exit(1); });
}

main();
