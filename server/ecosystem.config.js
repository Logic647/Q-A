module.exports = {
    apps: [{
        name: 'qa-server',
        script: 'app.js',
        instances: 1,
        exec_mode: 'fork',
        autorestart: true,
        watch: false,
        max_memory_restart: '200M',
        env: {
            NODE_ENV: 'production',
            PORT: 3000
        },
        error_file: '/root/.pm2/logs/qa-server-error.log',
        out_file: '/root/.pm2/logs/qa-server-out.log',
        merge_logs: true,
        log_date_format: 'YYYY-MM-DD HH:mm:ss',
        // 优雅关闭
        kill_timeout: 5000,
        listen_timeout: 10000,
        // 重启策略
        exp_backoff_restart_delay: 100,
        max_restarts: 10,
        min_uptime: '10s'
    }]
};
