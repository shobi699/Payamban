# Cloudflare Tunnel Runner for Payamban Webhook Local Testing
# راهنمای اجرای تانل کلودفلر برای اتصال وب‌هوک متا به محیط لوکال

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
Set-Location $RootDir

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🚀 سامانه هوشمند پیام‌بان - اجرای تانل لوکال برای وب‌هوک متا" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

$CloudflaredPath = Join-Path $RootDir "cloudflared.exe"

if (-not (Test-Path $CloudflaredPath)) {
    Write-Host "در حال دانلود فایل اجرایی cloudflared.exe..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile $CloudflaredPath
    Write-Host "✅ دانلود با موفقیت انجام شد." -ForegroundColor Green
}

# بررسی فعال بودن سرور محلی Next.js
$PortInUse = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if (-not $PortInUse) {
    Write-Host "⚠️ توجه: سرور Next.js روی پورت ۳۰۰۰ اجرا نشده است." -ForegroundColor Yellow
    Write-Host "لطفاً در یک ترمینال جداگانه دستور 'npm run dev' را اجرا کنید." -ForegroundColor Gray
}

Write-Host ""
Write-Host "🔗 در حال راه‌اندازی تانل امن به سمت http://localhost:3000 ..." -ForegroundColor Cyan
Write-Host "پس از ظاهر شدن لینک trycloudflare.com، آن را کپی کرده و به انتهای آن /api/webhook را اضافه کنید." -ForegroundColor White
Write-Host "نمونه آدرس وب‌هوک در پنل متا: https://xxxx.trycloudflare.com/api/webhook" -ForegroundColor Magenta
Write-Host "----------------------------------------------------------" -ForegroundColor DarkGray

& $CloudflaredPath tunnel --url http://localhost:3000
