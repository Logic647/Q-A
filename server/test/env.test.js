const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

function parseEnv(content) {
    const values = {};
    content.split(/\r?\n/).forEach(line => {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) values[match[1].trim()] = match[2].trim();
    });
    return values;
}

test('.env values are loaded from CRLF files', () => {
    const file = path.join(os.tmpdir(), `codex-env-${Date.now()}.env`);
    fs.writeFileSync(file, 'ADMIN_KEY=token\r\nADMIN_USERNAME=admin\r\n', 'utf8');
    const parsed = parseEnv(fs.readFileSync(file, 'utf8'));
    fs.rmSync(file, { force: true });

    assert.equal(parsed.ADMIN_KEY, 'token');
    assert.equal(parsed.ADMIN_USERNAME, 'admin');
});
