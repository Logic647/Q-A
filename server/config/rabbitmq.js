const amqp = require('amqplib');

let connection = null;
let channel = null;

async function getChannel() {
    if (channel) return channel;
    
    try {
        connection = await amqp.connect('amqp://localhost');
        channel = await connection.createChannel();
        console.log('RabbitMQ连接成功');
        return channel;
    } catch (err) {
        console.log('RabbitMQ连接失败:', err.message);
        return null;
    }
}

async function sendToQueue(queue, message) {
    const ch = await getChannel();
    if (!ch) return false;
    
    await ch.assertQueue(queue, { durable: true });
    ch.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
    return true;
}

async function consumeFromQueue(queue, callback) {
    const ch = await getChannel();
    if (!ch) return;
    
    await ch.assertQueue(queue, { durable: true });
    ch.consume(queue, (msg) => {
        if (msg) {
            const content = JSON.parse(msg.content.toString());
            callback(content);
            ch.ack(msg);
        }
    });
}

module.exports = { getChannel, sendToQueue, consumeFromQueue };
