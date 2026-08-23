const http = require('http');
http.get('http://127.0.0.1:3000/api/info/enrollment', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', data.substring(0, 200));
        process.exit(0);
    });
}).on('error', (e) => {
    console.log('Error:', e.message);
    process.exit(1);
});
