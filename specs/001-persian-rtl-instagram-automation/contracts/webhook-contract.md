# قرارداد وب‌هوک اینستاگرام و ساختار جاب‌های صف (Webhook & Queue Contract)
# ویژگی: `001-persian-rtl-instagram-automation`

این سند ساختار پیلودهای دریافتی از پلتفرم متا، نحوه اعتبارسنجی امضای دیجیتال و ساختار جاب‌های BullMQ را مشخص می‌کند.

---

## ۱. تایید هویت اولیه وب‌هوک (Webhook Handshake / Verification)

هنگامی که آدرس وبهوک در پنل متا ثبت می‌شود، سرور متا یک درخواست `GET` به اندپوینت ارسال می‌کند:

* **اندپوینت:** `GET /api/webhook`
* **کوئری پارامترهای ارسالی متا:**
  * `hub.mode`: با مقدار ثابت `subscribe`
  * `hub.verify_token`: مقدار توکن امنیتی ست‌شده در متغیر محیطی `WEBHOOK_VERIFY_TOKEN`
  * `hub.challenge`: رشته عددی تصادفی ارسالی توسط متا
* **پاسخ مورد انتظار:**
  * در صورت تطابق توکن: بازگرداندن مقدار خالص `hub.challenge` با وضعیت `200 OK`
  * در صورت عدم تطابق: وضعیت `403 Forbidden`

---

## ۲. دریافت رویدادهای زنده (Live Event Ingestion)

هنگامی که کامنت جدیدی ثبت می‌شود یا دایرکت ارسال می‌شود:

* **اندپوینت:** `POST /api/webhook`
* **هدر الزامی:** `x-hub-signature-256: sha256={HMAC_HASH}`
* **نحوه محاسبه امضا:**
  `HMAC_SHA256(payload_raw_body, INSTAGRAM_APP_SECRET)`
* **پاسخ فوری سامانه:**
  * اعتبارسنجی امضا با `crypto.timingSafeEqual`
  * افزودن به صف `dm-queue` با اکشن `raw-webhook-event`
  * پاسخ `200 OK` همراه با `{ "success": true }` در کمتر از ۳۰۰ میلی‌ثانیه

### پیلود نمونه رویداد کامنت اینستاگرام (Comment Event Payload)
```json
{
  "object": "instagram",
  "entry": [
    {
      "id": "17841405793187218",
      "time": 1727415600,
      "changes": [
        {
          "field": "comments",
          "value": {
            "id": "17923485719384721",
            "text": "قیمت رو لطف میکنید؟",
            "from": {
              "id": "17841400123456789",
              "username": "customer_user"
            },
            "media": {
              "id": "17901234567890123",
              "media_product_type": "REELS"
            }
          }
        }
      ]
    }
  ]
}
```

---

## ۳. ساختار جاب صف پردازش (BullMQ Job Payload Contract)

نام صف: `dm-queue`

### جاب پردازش کامنت (`process-comment`)
```typescript
export interface ProcessCommentJobData {
  jobType: "process-comment";
  instagramAccountId: string; // شناسه عددی اکانت در اینستاگرام
  commentId: string;          // شناسه یکتای کامنت
  commentText: string;        // متن کامنت کاربر
  commenterId: string;        // شناسه عددی کاربر کامنت‌گذار
  commenterUsername?: string; // نام کاربری کامنت‌گذار
  mediaId: string;            // شناسه پست یا ریلز
  mediaProductType?: string;  // نوع رسانه (POST, REELS, AD)
  receivedAt: number;         // تایم‌استمپ دریافت وب‌هوک
}
```

### تنظیمات تلاش مجدد و محدودیت صف (Retry & Rate Limit Config)
```typescript
export const QUEUE_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5000, // 5s, 10s, 20s
  },
  removeOnComplete: 1000,
  removeOnFail: 5000,
};
```
