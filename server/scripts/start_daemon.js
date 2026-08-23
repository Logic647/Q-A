const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const server = spawn('node', ['app.js'], { 
    cwd: __dirname, 
    detached: true, 
    stdio: ['ignore', 'pipe', 'pipe'] 
});
server.unref();

server.stdout.on('data', d => {
    const msg = d.toString().trim();
    if (msg.includes('已启动')) {
        console.log('Server started, PID:', server.pid);
        fs.writeFileSync(path.join(__dirname, 'server.pid'), String(server.pid));
        process.exit(0);
    }
});

server.stderr.on('data', d => {
    console.log('Error:', d.toString().trim());
    process.exit(1);
});

// 3秒后强制退出（不等待验证）
setTimeout(() => {
    console.log('Server launched, PID:', server.pid);
    fs.writeFileSync(path.join(__dirname, 'server.pid'), String(server.pid));
    process.exit(0);
}, 3000);
