require("dotenv").config({ path: __dirname + "/.env" });

module.exports = {
  apps: [
    {
      name: "payamban-web",
      cwd: __dirname,
      script: "npm",
      args: "start",
      autorestart: true,
      max_restarts: 10,
      env: {
        ...process.env,
        NODE_ENV: "production",
        PORT: "3000",
        PRISMA_SCHEMA_ENGINE_BINARY: "/home/daytona/schema-engine",
      },
    },
    {
      name: "payamban-worker",
      cwd: __dirname,
      script: "npm",
      args: "run worker",
      autorestart: true,
      max_restarts: 10,
      env: {
        ...process.env,
        NODE_ENV: "production",
        PRISMA_SCHEMA_ENGINE_BINARY: "/home/daytona/schema-engine",
      },
    },
    {
      name: "payamban-tunnel",
      script: "/home/daytona/cloudflared",
      args: "tunnel --url http://127.0.0.1:3000 --no-autoupdate",
      autorestart: true,
      max_restarts: 10,
    },
  ],
};
