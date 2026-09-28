#!/usr/bin/env bash
set -e

echo "=== 1. Starting PostgreSQL and Redis services ==="
sudo service postgresql start
sudo service redis-server start

echo "=== 2. Configuring PostgreSQL user and database ==="
sudo -u postgres psql << 'SQL_INIT'
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'payamban') THEN
      CREATE ROLE payamban WITH LOGIN PASSWORD 'payamban_secure_pass_2026' SUPERUSER CREATEDB;
   ELSE
      ALTER ROLE payamban WITH PASSWORD 'payamban_secure_pass_2026' SUPERUSER CREATEDB;
   END IF;
END
$$;
SELECT 'CREATE DATABASE payamban OWNER payamban' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'payamban')\gexec
GRANT ALL PRIVILEGES ON DATABASE payamban TO payamban;
SQL_INIT

echo "=== 3. Testing Redis connection ==="
redis-cli ping

echo "=== 4. Testing PostgreSQL connection ==="
PGPASSWORD='payamban_secure_pass_2026' psql -h 127.0.0.1 -U payamban -d payamban -c "SELECT 'PostgreSQL Connected Successfully!' as status;"

echo "=== 5. Setting up .env for Payamban ==="
cd /home/daytona/payamban

cat << 'ENV_FILE' > .env
# Application
NODE_ENV=production
PORT=3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=9f8c63a5e84b2d109f8c63a5e84b2d109f8c63a5e84b2d109f8c63a5e84b2d10
CRON_SECRET=7b2e91d04ca5f8e27b2e91d04ca5f8e27b2e91d04ca5f8e27b2e91d04ca5f8e2
ENCRYPTION_KEY=e83a45c79b12d56ef018273645bca981e83a45c79b12d56ef018273645bca981

# Database & Queue
DATABASE_URL=postgresql://payamban:payamban_secure_pass_2026@127.0.0.1:5432/payamban
REDIS_URL=redis://127.0.0.1:6379

# Email Magic Link (Console fallback if empty)
EMAIL_FROM=Payamban <auth@payamban.local>

# Meta / Instagram
META_GRAPH_API_VERSION=v25.0
INSTAGRAM_APP_ID=dummy_app_id
INSTAGRAM_APP_SECRET=dummy_app_secret
FACEBOOK_APP_SECRET=dummy_fb_secret
WEBHOOK_VERIFY_TOKEN=payamban_webhook_verify_token_2026

# Zarinpal Gateway
ZARINPAL_MERCHANT_ID=zarinpal_demo_merchant
ZARINPAL_SANDBOX=true

# AI Sales Agent
AI_API_MODEL=gpt-4o-mini
ENV_FILE

echo "=== 6. Installing dependencies ==="
npm ci --prefer-offline || npm install

echo "=== 7. Applying database migrations ==="
npm run db:migrate

echo "=== 8. Seeding initial demo and platform settings ==="
npx tsx scripts/seed-demo.ts

echo "=== 9. Building Next.js production bundle ==="
npm run build

echo "=== 10. Installing PM2 Process Manager ==="
sudo npm install -g pm2

echo "=== 11. Starting Application and Worker with PM2 ==="
pm2 delete all || true

# Start Next.js Web server
pm2 start npm --name "payamban-web" -- start -- -p 3000

# Start BullMQ Background Worker
pm2 start npm --name "payamban-worker" -- run worker

pm2 save

echo "=== 12. Deployment Complete! Status: ==="
pm2 status
curl -s -I http://127.0.0.1:3000 | head -n 5
