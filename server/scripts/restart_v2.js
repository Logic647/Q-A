const { exec } = require('child_process');

// 找到占用3000端口的进程并杀掉
exec('netstat -ano | findstr ":3000" | findstr "LISTENING"', (err, stdout) => {
    if (stdout) {
        const lines = stdout.split('\n').filter(l => l.trim());
        for (const line of lines) {
            const match = line.trim().match(/(\d+)\s*$/);
            if (match) {
                console.log('Killing PID:', match[1]);
                exec(`taskkill /PID ${match[1]} /F`, (e) => {
                    if (!e) console.log('Killed successfully');
                });
            }
        }
    } else {
        console.log('No process found on port 3000');
    }
    
    // 等待后启动新服务器
    setTimeout(() => {
        const server = spawn('node', ['app.js'], {
            cwd: __dirname,
            detached: true,
            stdio: 'ignore',
            windowsHide: true
        });
        server.unref();
        console.log('New server started, PID:', server.pid);
        
        setTimeout(() => {
            const http = require('http');
            http.get('http://127.0.0.1:3000/api/info/enrollment', res => {
                let d = '';
                res.on('data', c => d += c);
                res.on('end', () => {
                    const r = JSON.parse(d);
                    console.log('Verified:', r.data?.length, 'steps');
                    process.exit(0);
                });
            }).on('error', () => { console.log('Not ready yet'); process.exit(0); });
        }, 3000);
    }, 2000);
});

const { spawn } = require('child_process');
