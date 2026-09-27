# قرارداد فراخوانی رابط برنامه‌نویسی گراف اینستاگرام (Instagram Graph API Contract)
# ویژگی: `001-persian-rtl-instagram-automation`

این سند اندپوینت‌های رسمی Meta Graph API، پروتکل تبادل و تمدید توکن و ارسال دایرکت را مستند می‌کند.

---

## ۱. چرخه تبادل و تمدید توکن (OAuth & Token Exchange)

### ۱.۱. هدایت کاربر به صفحه لاگین بیزینس
* **آدرس هدایت:** `GET https://www.instagram.com/oauth/authorize`
* **پارامترها:**
  * `client_id`: مقدار `INSTAGRAM_APP_ID`
  * `redirect_uri`: مقدار `{BASE_URL}/api/instagram/callback`
  * `response_type`: `code`
  * `scope`: `instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_manage_insights`
  * `state`: رشته رمزنگاری‌شده امضاشده حاوی `workspaceId` و `nonce`

### ۱.۲. تبادل کد با توکن کوتاه‌مدت (Short-Lived Token)
* **درخواست:** `POST https://api.instagram.com/oauth/access_token`
* **بدنه (Form URL-Encoded):**
  * `client_id`: شناسه اپلیکیشن
  * `client_secret`: سکرت اپلیکیشن
  * `grant_type`: `authorization_code`
  * `redirect_uri`: همان آدرس ریدایرکت
  * `code`: کدی که از اینستاگرام دریافت شده است
* **پاسخ:**
  ```json
  {
    "access_token": "IGQWRP...",
    "user_id": 17841400123456789
  }
  ```

### ۱.۳. تبادل با توکن بلندمدت ۶۰ روزه (Long-Lived Token)
* **درخواست:**
  `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret={SECRET}&access_token={SHORT_LIVED_TOKEN}`
* **پاسخ:**
  ```json
  {
    "access_token": "IGAA...",
    "token_type": "bearer",
    "expires_in": 5184000 // 60 روز به ثانیه
  }
  ```

### ۱.۴. تمدید دوره‌ای توکن بلندمدت (Refresh Token)
* **درخواست:**
  `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token={CURRENT_LONG_LIVED_TOKEN}`
* **پاسخ:**
  ```json
  {
    "access_token": "IGAA_NEW...",
    "token_type": "bearer",
    "expires_in": 5184000
  }
  ```

---

## ۲. ارسال پیام خصوصی در پاسخ به کامنت (Send Private Reply)

* **درخواست:**
  `POST https://graph.instagram.com/v22.0/{instagram_account_id}/messages`
* **هدرها:**
  * `Authorization: Bearer {long_lived_token}`
  * `Content-Type: application/json`

### ۲.۱. ارسال پیام متنی همراه با دکمه لینک (Button Template)
```json
{
  "recipient": {
    "comment_id": "17923485719384721"
  },
  "message": {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "button",
        "text": "سلام {username} عزیز! برای مشاهده جزئیات و تخفیف ویژه، روی دکمه زیر کلیک کنید:",
        "buttons": [
          {
            "type": "web_url",
            "url": "https://example.com/r/discount-code",
            "title": "مشاهده تخفیف 🎁"
          }
        ]
      }
    }
  }
}
```

---

## ۳. ارسال پاسخ عمومی به کامنت (Public Comment Reply)

* **درخواست:**
  `POST https://graph.instagram.com/v22.0/{comment_id}/replies`
* **بدنه:**
  ```json
  {
    "message": "سلام دوست عزیز، جزئیات براتون دایرکت ارسال شد 🙏"
  }
  ```

---

## ۴. ثبت‌نام در وب‌هوک (Subscribed Apps)

* **درخواست:**
  `POST https://graph.instagram.com/v22.0/{instagram_account_id}/subscribed_apps`
* **بدنه:**
  ```json
  {
    "subscribed_fields": ["comments", "messages"]
  }
  ```
