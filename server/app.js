const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/user', require('./routes/user'));
app.use('/api/qa', require('./routes/qa'));
app.use('/api/info', require('./routes/info'));
app.use('/api/admin', require('./routes/admin'));

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器已启动: http://0.0.0.0:${PORT}`);
});
