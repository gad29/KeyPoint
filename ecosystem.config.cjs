module.exports = {
  apps: [
    {
      name: 'keypoint',
      cwd: __dirname,
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
      max_restarts: 10,
      min_uptime: '10s',
      instances: 1,
      autorestart: true,
      watch: false,
    },
  ],
};
