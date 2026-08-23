const { spawn } = require('child_process');
const path = require('path');

// 直接启动服务器，不检查端口，不杀进程
const server = spawn('node', ['app.js'], {
    cwd: path.join(__dirname),
    detached: true,
    stdio: 'ignore',
    windowsHide: true
});
server.unref();
console.log('PID:', server.pid);
process.exit(0);
