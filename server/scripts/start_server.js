const { exec } = require('child_process');
const path = require('path');

// Start server
const server = exec('node app.js', { cwd: path.join(__dirname) });

server.stdout.on('data', (data) => {
    console.log(data.toString());
});

server.stderr.on('data', (data) => {
    console.error(data.toString());
});

server.on('exit', (code) => {
    console.log(`Server exited with code ${code}`);
});
