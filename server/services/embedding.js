/**
 * Embedding 向量检索服务
 * 使用 SiliconFlow API 将文本转为向量，存储在内存中，支持余弦相似度搜索
 * 
 * 需要注册 SiliconFlow (https://siliconflow.cn) 获取免费 API Key
 * 免费额度：每天 1000 次调用
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_URL = 'https://api.siliconflow.cn/v1/embeddings';
const MODEL = 'BAAI/bge-m3'; // 免费模型，768维

// 从 .env 文件读取 API Key
function loadApiKey() {
    try {
        const envPath = path.join(__dirname, '../.env');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            const match = content.match(/SF_EMBEDDING_KEY=(.+)/);
            if (match) return match[1].trim();
        }
    } catch (e) {}
    return process.env.SF_EMBEDDING_KEY || '';
}

const API_KEY = loadApiKey();
const VECTOR_FILE = path.join(__dirname, '../data/vectors.json');

// 向量存储
let vectors = []; // [{id, text, vector, metadata}]

// 调用 Embedding API
async function getEmbedding(text) {
    if (!API_KEY) {
        console.log('[Embedding] 未配置 API Key，使用 TF-IDF 回退');
        return null;
    }

    const body = JSON.stringify({ model: MODEL, input: [text] });

    return new Promise((resolve, reject) => {
        const url = new URL(API_URL);
        const opts = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Length': Buffer.byteLength(body)
            },
            timeout: 10000
        };

        const req = https.request(opts, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.data && json.data[0] && json.data[0].embedding) {
                        resolve(json.data[0].embedding);
                    } else {
                        console.log('[Embedding] API 返回异常:', data.substring(0, 200));
                        resolve(null);
                    }
                } catch (e) {
                    console.log('[Embedding] 解析失败:', e.message);
                    resolve(null);
                }
            });
        });
        req.on('error', e => { console.log('[Embedding] 请求失败:', e.message); resolve(null); });
        req.on('timeout', () => { req.destroy(); resolve(null); });
        req.write(body);
        req.end();
    });
}

// 批量获取 Embedding（节省 API 调用）
async function getEmbeddings(texts) {
    if (!API_KEY) return texts.map(() => null);

    const body = JSON.stringify({ model: MODEL, input: texts });

    return new Promise((resolve) => {
        const url = new URL(API_URL);
        const opts = {
            hostname: url.hostname, port: 443, path: url.pathname, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}`, 'Content-Length': Buffer.byteLength(body) },
            timeout: 30000
        };
        const req = https.request(opts, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.data) {
                        resolve(json.data.map(d => d.embedding || null));
                    } else {
                        resolve(texts.map(() => null));
                    }
                } catch (e) {
                    resolve(texts.map(() => null));
                }
            });
        });
        req.on('error', () => resolve(texts.map(() => null)));
        req.on('timeout', () => { req.destroy(); resolve(texts.map(() => null)); });
        req.write(body);
        req.end();
    });
}

// 构建向量索引
async function buildVectorIndex(documents) {
    // documents: [{id, text, ...metadata}]
    const texts = documents.map(d => d.text);
    const embeddings = await getEmbeddings(texts);

    vectors = documents.map((doc, i) => ({
        id: doc.id,
        text: doc.text,
        vector: embeddings[i],
        metadata: doc
    })).filter(v => v.vector !== null);

    // 持久化到文件
    saveVectors();

    console.log(`[Embedding] 索引构建完成: ${vectors.length}/${documents.length} 条向量`);
    return vectors.length;
}

// 添加单条向量
async function addVector(id, text, metadata = {}) {
    const embedding = await getEmbedding(text);
    if (!embedding) return false;

    // 移除已有的同 id 向量
    vectors = vectors.filter(v => v.id !== id);
    vectors.push({ id, text, vector: embedding, metadata });
    saveVectors();
    return true;
}

// 移除单条向量
function removeVector(id) {
    const before = vectors.length;
    vectors = vectors.filter(v => v.id !== id);
    if (vectors.length < before) {
        saveVectors();
        console.log(`[Embedding] 已移除向量 id=${id}`);
        return true;
    }
    return false;
}

// 语义搜索
function searchVectors(queryVector, topK = 3) {
    if (!queryVector || vectors.length === 0) return [];

    const scores = vectors.map((v, idx) => ({
        idx,
        score: cosineSimilarity(queryVector, v.vector)
    }));

    scores.sort((a, b) => b.score - a.score);

    return scores.slice(0, topK)
        .filter(s => s.score > 0.3) // 相似度阈值
        .map(s => ({
            ...vectors[s.idx].metadata,
            similarity: s.score
        }));
}

// 余弦相似度
function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

// 持久化
function saveVectors() {
    try {
        const dir = path.dirname(VECTOR_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        // 只保存 id、text、metadata，不保存向量（太大）
        const lite = vectors.map(v => ({ id: v.id, text: v.text, metadata: v.metadata }));
        fs.writeFileSync(VECTOR_FILE, JSON.stringify(lite));
    } catch (e) {
        console.log('[Embedding] 保存失败:', e.message);
    }
}

// 检查 API Key 是否配置
function isConfigured() {
    return !!API_KEY;
}

module.exports = {
    getEmbedding, getEmbeddings, buildVectorIndex, addVector, removeVector,
    searchVectors, cosineSimilarity, isConfigured
};
