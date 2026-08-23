const Redis = require('ioredis');

async function flushCache() {
    const redis = new Redis({
        host: '127.0.0.1',
        port: 6379,
        retryStrategy: () => null
    });

    try {
        const keys = await redis.keys('qa:*');
        console.log(`Found ${keys.length} cached QA entries`);
        
        if (keys.length > 0) {
            for (const key of keys) {
                const val = await redis.get(key);
                const parsed = JSON.parse(val);
                if (parsed.answer && parsed.answer.includes('抱歉')) {
                    await redis.del(key);
                    console.log(`Deleted cached entry with placeholder: ${key}`);
                }
            }
            console.log('Cache cleanup done');
        } else {
            console.log('No cached entries');
        }
        
        // Verify
        const remaining = await redis.keys('qa:*');
        console.log(`Remaining cache entries: ${remaining.length}`);
        
        redis.disconnect();
        process.exit(0);
    } catch (e) {
        console.log('Error:', e.message);
        redis.disconnect();
        process.exit(1);
    }
}

flushCache();
