# قرارداد ماشین وضعیت دایرکت (DM Conversational State Machine Contract)
# ویژگی: `002-enterprise-growth-and-sales-suite`

---

## ۱. ساختار کلید و داده سشن در ردیس (Redis Session Key & Payload)

### کلید سشن:
```text
session:dm:{instagramAccountId}:{recipientUserId}
```
* **TTL پیش‌فرض:** ۱۸۰۰ ثانیه (۳۰ دقیقه عدم تعامل ➔ حذف خودکار)

### ساختار پیلود سشن (TypeScript Schema):
```typescript
export interface DmSessionPayload {
  version: 1;
  type: "FORM_SUBMISSION";
  formId: string;
  fields: Array<{
    id: string;
    label: string;
    type: "text" | "phone";
    required: boolean;
  }>;
  currentStepIndex: number;
  collectedAnswers: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}
```

---

## ۲. توالی ارسال رویدادها در ورکر (Worker Execution Sequence)

1. **دریافت پیام از کاربر (`process-message`):**
   * آیا کلید `session:dm:{instagramAccountId}:{senderId}` در ردیس وجود دارد؟
   * **اگر بله:** پیام دریافتی به عنوان پاسخ فیلد `fields[currentStepIndex]` ارزیابی می‌شود.
     * اعتبارسنجی: در صورت نامعتبر بودن شماره موبایل، پیام خطای دوستانه ارسال و `currentStepIndex` تغییر نمی‌کند.
     * در صورت معتبر بودن: پاسخ ذخیره شده، `currentStepIndex++` می‌شود.
     * اگر `currentStepIndex === fields.length` ➔ پایان سشن، درج در پایگاه‌داده و حذف کلید از ردیس.
   * **اگر خیر:** بررسی تطابق کلیدواژه‌های کمپین‌های فعال یا کلمات محرک فرم‌ها.
