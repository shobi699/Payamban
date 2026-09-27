# قرارداد استریم زنده اینباکس با SSE (Real-Time Live Inbox Contract)
# ویژگی: `002-enterprise-growth-and-sales-suite`

---

## ۱. درخواست استریم کلاینت (SSE Client Stream)

### Endpoint:
`GET /api/inbox/stream`

### هدرهای پاسخ:
* `Content-Type: text/event-stream`
* `Cache-Control: no-cache, no-transform`
* `Connection: keep-alive`

### ساختار پیام‌های استریم (Event Stream Chunk):
```text
event: new-message
data: {"id":"m_123","conversationId":"t_123","senderId":"user_123","text":"قیمت رو میفرمایید؟","timestamp":"2026-09-27T17:41:00.000Z"}

event: heartbeat
data: {"time":1711584000000}
```

* ورکر پس‌زمینه با دریافت هر رویداد جدید وب‌هوک، آن را روی کانال ردیس `pubsub:inbox:{workspaceId}` منتشر می‌کند و روت Next.js این پیام را بلافاصله به کلاینت متصل ارسال می‌نماید.
