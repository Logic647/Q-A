const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
    'bolt://localhost:7687',
    neo4j.auth.basic('neo4j', 'password') // 默认密码，需要修改
);

async function getSession() {
    return driver.session();
}

module.exports = { driver, getSession };
