const net = require('net');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

function checkPort(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(port, () => { server.close(); resolve(false); });
        server.on('error', () => resolve(true));
    });
}

function asyncExec(cmd) {
    return new Promise(resolve => {
        exec(cmd, { windowsHide: true }, () => resolve());
    });
}

async function main() {
    const inUse = await checkPort(3000);
    if (inUse) {
        try {
            const output = require('child_process').execSync('netstat -ano', { encoding: 'utf8', windowsHide: true });
            const match = output.split('\n').find(l => l.includes(':3000') && l.includes('LISTENING'));
            if (match) {
                const pid = match.trim().match(/\s(\d+)$/)?.[1];
                if (pid) {
                    await asyncExec(`taskkill /F /PID ${pid}`);
                    console.log('Killed old server, PID:', pid);
                }
            }
        } catch (e) {}
    }

    const server = spawn('node', ['app.js'], { 
        cwd: __dirname, detached: true, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true 
    });
    server.unref();

    server.stdout.on('data', d => {
        if (d.toString().includes('已启动')) {
            console.log('New server started, PID:', server.pid);
            fs.writeFileSync(path.join(__dirname, 'server.pid'), String(server.pid));
            process.exit(0);
        }
    });

    setTimeout(() => {
        console.log('Server launched, PID:', server.pid);
        process.exit(0);
    }, 3000);
}

main();
