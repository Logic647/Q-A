module.exports = {
    apps: [{
        name: 'qa-server',
        script: './app.js',
        cwd: '/opt/qa-server/server',
        instances: 1,
        exec_mode: 'fork',
        max_memory_restart: '512M',
        env: {
            NODE_ENV: 'production',
            PORT: 3000
        },
        log_date_format: 'YYYY-MM-DD HH:mm:ss',
        error_file: '/opt/qa-server/logs/error.log',
        out_file: '/opt/qa-server/logs/out.log',
        merge_logs: true,
        autorestart: true,
        watch: false,
        max_restarts: 10,
        restart_delay: 5000
    }]
};
