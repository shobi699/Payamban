# قرارداد انتشار ریپلای کامنت در اینستاگرام (Meta Comments API Contract)
# ویژگی: `002-enterprise-growth-and-sales-suite`

---

## ۱. درخواست انتشار ریپلای به Graph API

### متد و آدرس:
`POST https://graph.facebook.com/v22.0/{comment-id}/replies`

### هدرها:
* `Content-Type: application/json`
* `Authorization: Bearer {decrypted_access_token}`

### بدنه درخواست:
```json
{
  "message": "پاسخ ارسال شد، دایرکتتون رو چک کنید عزیز ❤️"
}
```

### پاسخ موفق (۲۰۰ OK):
```json
{
  "id": "18012345678901234"
}
```

### کدهای خطای رایج و نحوه رسیدگی:
* **کد ۳۶۸ (Meta Spam Throttle):** سیستم ارسال مجدد را متوقف کرده و خطای «محدودیت موقت ارسال کامنت توسط اینستاگرام (کد ۳۶۸)» را نمایش می‌دهد.
* **کد ۱۹۰ (Token Expired):** توکن اکانت باطل شده؛ وضعیت اکانت در جدول به `EXPIRING_SOON` تبدیل شده و پیام هشدار در بالای داشبورد ظاهر می‌شود.
