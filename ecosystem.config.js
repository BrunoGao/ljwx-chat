module.exports = {
  apps: [
    {
      // Auto restart
      autorestart: true,
      cwd: '/Users/brunogao/work/codes/AI/lobe-chat',
      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: 3210,
      },
      // Logging
      error_file: './logs/pm2-error.log',
      exec_mode: 'fork',
      instances: 1,
      interpreter: 'bash',
      // Process management
      kill_timeout: 5000,
      listen_timeout: 10_000,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Memory management
      max_memory_restart: '2G',
      max_restarts: 10,
      merge_logs: true,
      min_uptime: '10s',
      name: 'lingjingwanxiang',
      out_file: './logs/pm2-out.log',
      restart_delay: 4000,
      script: './start-production.sh',
      wait_ready: true,
    },
  ],
};
