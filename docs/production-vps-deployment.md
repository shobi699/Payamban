# راهنمای جامع استقرار در محیط پروداکشن (Production VPS Deployment Guide)
## پلتفرم اتوماسیون اینستاگرام و تجارت هوشمند دی‌رکت پرو (Dayrect Pro)

این راهنما فرآیند گام‌به‌گام و استاندارد استقرار سیستم دی‌رکت پرو را بر روی سرور مجازی لینوکس (Ubuntu 22.04 / 24.04 LTS) با استفاده از **Docker Compose**، وب‌سرور **Nginx** و گواهینامه **SSL رایگان Let's Encrypt (Certbot)** تشریح می‌کند.

---

## ۱. مشخصات سرور پیشنهادی (System Hardware Requirements)

| مؤلفه سخت‌افزاری | حداقل مشخصات (Minimum) | مشخصات پیشنهادی (Enterprise) |
| :--- | :--- | :--- |
| **پردازنده (CPU)** | ۲ هسته (۲ Cores) | ۴ هسته با فرکانس بالا |
| **حافظه رم (RAM)** | ۲ گیگابایت | ۴ الی ۸ گیگابایت |
| **فضای دیسک (Disk)** | ۳۰ گیگابایت SSD / NVMe | ۵۰+ گیگابایت NVMe |
| **سیستم‌عامل (OS)** | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS (x64) |
| **شبکه و آی‌پی** | ۱ گیگابیت + آی‌پی استاتیک | ترافیک بین‌الملل بدون فیلتر / سرور خارج یا تونل تمیز |

> [!IMPORTANT]
> **نکته حیاتی برای سرورهای داخل ایران:** به دلیل محدودیت‌های دسترسی به Graph API اینستاگرام از داخل کشور، در صورتی که سرور شما در ایران مستقر است، باید متغیر `HTTPS_PROXY` را در فایل محیطی به یک پراکسی مطمئن (مانند SOCKS5 یا HTTP Proxy خارج کشور) متصل نمایید.

---

## ۲. آماده‌سازی و امن‌سازی اولیه سرور (Server Hardening)

پس از اتصال به سرور از طریق SSH، ابتدا بسته‌های امنیتی سیستم‌عامل را به‌روزرسانی کرده و منطقه زمانی را روی ایران تنظیم کنید:

```bash
# به‌روزرسانی سیستم‌عامل
sudo apt update && sudo apt upgrade -y

# تنظیم منطقه زمانی
sudo timedatectl set-timezone Asia/Tehran

# نصب ابزارهای کاربردی پایه
sudo apt install -y curl wget git ufw htop net-tools
```

### تنظیم فایروال سرور (UFW Firewall):
تنها پورت‌های ضروری را باز کنید:

```bash
# باز کردن پورت SSH، HTTP و HTTPS
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# فعال‌سازی فایروال
sudo ufw enable
```

---

## ۳. نصب داکر و داکر کامپوز (Docker & Docker Compose)

نصب آخرین نسخه پایدار موتور داکر و پلاگین کامپوز:

```bash
# نصب کلید رسمی مخزن Docker
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# اضافه کردن مخزن
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# اطمینان از راه‌اندازی سرویس
sudo systemctl enable --now docker
```

---

## ۴. کلون سورس پروژه و ایجاد فایل پیکربندی محیطی (`.env.production`)

پروژه را در مسیر استاندارد `/opt/dayrect` کلون کنید:

```bash
sudo mkdir -p /opt/dayrect
sudo chown -R $USER:$USER /opt/dayrect
cd /opt/dayrect

# کلون مخزن گیت
git clone <URL_مخزن_شما> .
```

### تولید کلیدهای رمزنگاری قوی:
برای متغیرهای حساس امنیتی، کلیدهای تصادفی ۶۴ کاراکتری تولید کنید:

```bash
# تولید کلید رمزنگاری توکن‌های اینستاگرام (AES-256)
openssl rand -hex 32

# تولید کلید نشست سشن احراز هویت (NextAuth Secret)
openssl rand -hex 32
```

### تنظیم فایل `.env.production`:
فایل `.env.production` را بر اساس نمونه زیر تکمیل کنید:

```bash
cp .env.example .env.production
nano .env.production
```

نمونه مقادیر مورد نیاز:
```env
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://app.yourdomain.ir

# دیتابیس داخلی داکر
DATABASE_URL=postgresql://dayrect_user:StrongPassword123@postgres:5432/dayrect_db?schema=public

# ردیس داخلی داکر
REDIS_URL=redis://:RedisStrongPass456@redis:6379

# کلیدهای امنیتی تولیدشده در مرحله قبل
ENCRYPTION_KEY=کلید_تولیدشده_با_openssl
NEXTAUTH_SECRET=کلید_تولیدشده_با_openssl
NEXTAUTH_URL=https://app.yourdomain.ir

# تنظیمات فیسبوک و اینستاگرام
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_WEBHOOK_VERIFY_TOKEN=your_secure_verify_token

# درگاه‌های پرداخت شتابی
ZARINPAL_MERCHANT_ID=your_zarinpal_merchant
ZIBAL_MERCHANT_ID=zibal

# پیامک کاوه‌نگار
KAVENEGAR_API_KEY=your_kavenegar_api_key

# هوش مصنوعی
OPENAI_API_KEY=your_openai_or_openrouter_api_key

# پراکسی خروجی (در صورت نیاز به عبور از فیلترینگ)
# HTTPS_PROXY=http://proxy_user:proxy_pass@proxy_host:8080
```

---

## ۵. اجرای کانتینرها با Docker Compose

معماری پروژه در فایل `docker-compose.prod.yml` تعریف شده است و شامل ۴ سرویس اصلی است:
1. `postgres`: پایگاه داده رابطه‌ای با والیوم دائمی داده‌ها
2. `redis`: حافظه پنهان و صف BullMQ برای اینجکشن غیرمسدودکننده وب‌هوک
3. `web`: وب‌اپلیکیشن فول‌استک Next.js 16 (پورت داخلی ۳۰۰۰)
4. `worker`: ورکر دائمی پردازش هوشمند دایرکت‌ها و کمپین‌ها

برای ساخت ایمیج‌ها و اجرای سرویس‌ها در پس‌زمینه:

```bash
# بیلد ایمیج و استارت سرویس‌ها
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# اعمال ساختار جداول دیتابیس (Prisma Migration)
docker compose -f docker-compose.prod.yml exec web npx prisma migrate deploy

# ثبت داده‌های پایه پلن‌ها و تنظیمات اولیه
docker compose -f docker-compose.prod.yml exec web npx tsx scripts/seed-demo.ts
```

بررسی وضعیت اجرای کانتینرها:
```bash
docker compose -f docker-compose.prod.yml ps
```

---

## ۶. پیکربندی وب‌سرور Nginx (Reverse Proxy)

وب‌سرور Nginx درخواست‌های کاربران روی پورت‌های ۸۰ و ۴۴۳ را با عملکرد بالا دریافت کرده و به کانتینر اپلیکیشن هدایت می‌کند:

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/dayrect.conf
```

محتوای کانفیگ را مطابق الگوی زیر قرار دهید (دامنه `app.yourdomain.ir` را با دامنه خود جایگزین کنید):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name app.yourdomain.ir;

    # مسدود کردن دسترسی به فایل‌های حساس
    location ~ /\. {
        deny all;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # تنظیم هدرهای مدرن سوکت و پراکسی
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # پشتیبانی از ترافیک سنگین و جلوگیری از وقفه
        proxy_read_timeout 90;
        proxy_connect_timeout 90;
        client_max_body_size 25M;
    }
}
```

فعال‌سازی کانفیگ و بارگذاری مجدد Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/dayrect.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## ۷. فعال‌سازی گواهینامه SSL رایگان با Let's Encrypt (Certbot)

برای فعال‌سازی پروتکل امن HTTPS و اعتبارسنجی الزامی وب‌هوک‌های متا و اینستاگرام:

```bash
# نصب ابزار Certbot و افزونه Nginx
sudo apt install -y certbot python3-certbot-nginx

# دریافت خودکار گواهینامه و تنظیم SSL در Nginx
sudo certbot --nginx -d app.yourdomain.ir
```

در طول فرآیند، ایمیل خود را وارد کرده و قوانین را تایید کنید. Certbot کانفیگ Nginx را به‌صورت خودکار به پورت ۴۴۳ مجهز و ریدایرکت خودکار HTTP به HTTPS را فعال می‌کند.

### اطمینان از تمدید خودکار گواهینامه:
```bash
sudo certbot renew --dry-run
```

---

## ۸. ارزیابی سلامت سامانه (Health Check & Diagnostics)

پس از بالا آمدن کامل کانتینرها، اسکریپت مانیتورینگ سلامت را اجرا کنید:

```bash
docker compose -f docker-compose.prod.yml exec web npx tsx scripts/health-check.ts
```

این اسکریپت موارد زیر را در لحظه چک می‌کند:
- اتصال پایدار به دیتابیس PostgreSQL
- اتصال بدون تاخیر به Redis
- اتصال و شمارش جاب‌های صف BullMQ (`dm-processing`)
- وضعیت اکانت‌های متصل اینستاگرام
- در دسترس بودن درگاه‌های پرداخت زرین‌پال و زیبال

---

## ۹. بکاپ‌گیری خودکار روزانه از پایگاه داده (Automated Backup)

یک اسکریپت ساده جهت تهیه بکاپ شبانه از PostgreSQL در مسیر `/opt/dayrect/scripts/db-backup.sh` تنظیم کنید:

```bash
cat << 'EOF' > /opt/dayrect/scripts/db-backup.sh
#!/bin/bash
BACKUP_DIR="/opt/dayrect/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p $BACKUP_DIR

docker compose -f /opt/dayrect/docker-compose.prod.yml exec -T postgres pg_dump -U dayrect_user dayrect_db | gzip > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz"

# حذف بکاپ‌های قدیمی‌تر از ۱۴ روز
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +14 -delete
echo "Backup completed successfully at $TIMESTAMP"
EOF

chmod +x /opt/dayrect/scripts/db-backup.sh
```

تنظیم کرون‌جاب لینوکس برای اجرا در ساعت ۳:۳۰ بامداد هر روز:
```bash
(crontab -l 2>/dev/null; echo "30 3 * * * /opt/dayrect/scripts/db-backup.sh >> /var/log/dayrect-backup.log 2>&1") | crontab -
```

---

## ۱۰. دستورات کاربردی نگهداری سیستم

```bash
# مشاهده لاگ‌های ورکر دایرکت در زمان واقعی:
docker compose -f docker-compose.prod.yml logs -f worker

# مشاهده لاگ‌های وب‌سرور:
docker compose -f docker-compose.prod.yml logs -f web

# راه‌اندازی مجدد سرویس‌ها:
docker compose -f docker-compose.prod.yml restart

# متوقف کردن موقت سرویس‌ها:
docker compose -f docker-compose.prod.yml down
```

سیستم شما با پایداری کامل و معماری Enterprise آماده سرویس‌دهی ۲۴ ساعته است. 🚀
