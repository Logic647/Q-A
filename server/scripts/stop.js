const { execSync } = require('child_process');

try {
    const output = execSync('netstat -ano | findstr ":3000" | findstr "LISTENING"', { 
        encoding: 'utf8', 
        windowsHide: true 
    });
    
    const lines = output.split('\n').filter(l => l.trim());
    for (const line of lines) {
        const match = line.match(/(\d+)\s*$/);
        if (match) {
            const pid = match[1];
            console.log(`终止进程 PID: ${pid}`);
            execSync(`taskkill /PID ${pid} /F`, { windowsHide: true });
            console.log('已终止');
        }
    }
} catch (e) {
    console.log('端口 3000 未被占用或无进程');
}

console.log('完成');
