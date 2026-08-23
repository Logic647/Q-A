const { askLLM } = require('./services/llm');
askLLM('无锡学院学费多少钱').then(r => {
    console.log('LLM Response:', r.substring(0, 300));
    process.exit(0);
}).catch(e => { console.log('Error:', e.message); process.exit(1); });
