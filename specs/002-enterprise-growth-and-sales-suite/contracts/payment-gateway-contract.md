# قرارداد رابط درگاه پرداخت ریالی (Payment Gateway Interface Contract)
# ویژگی: `002-enterprise-growth-and-sales-suite`

---

## ۱. ساختار درخواست پرداخت (Payment Request)

### Endpoint:
`POST /api/billing/payment/request`

### هدرها:
* `Content-Type: application/json`
* دارای سشن فعال NextAuth (کوکی مجاز)

### بدنه درخواست (JSON Request Body):
```json
{
  "planId": "cmujl50li0003z0uhgye9p3yw"
}
```

### پاسخ موفق (۲۰۰ OK):
```json
{
  "success": true,
  "paymentUrl": "https://payment.zarinpal.com/pg/StartPay/00000000-0000-0000-0000-000000000000",
  "authority": "A00000000000000000000000000000000000"
}
```

---

## ۲. ساختار بازگشت از درگاه (Payment Callback)

### Endpoint:
`GET /api/billing/payment/callback`

### پارامترهای ارسالی از بانک (URL Query Params):
* `Authority`: شناسه پیگیری بانکی
* `Status`: مقدار `OK` (موفق) یا `NOK` (ناموفق / انصراف)

### رفتار سیستم:
1. در صورت `Status === "OK"`: فراخوانی متد `verifyPayment` به سرور زرین‌پال با شناسه مرچنت و مبلغ ذخیره‌شده در تراکنش.
2. دریافت کد وضعیت ۱۰۰ یا ۱۰۱ از بانک ➔ ثبت `status = SUCCESS` و ذخیره `refId`.
3. به‌روزرسانی تاریخ انقضای اشتراک کاربر (`expiresAt += 30 days`).
4. ریدایرکت ۳۰۲ کاربر به `/billing?payment=success&refId={refId}`.
5. در صورت ناموفق بودن ➔ ثبت `status = FAILED` و ریدایرکت به `/billing?payment=failed`.
