import "dotenv/config";
import { getPrisma } from "../lib/db/client";
import { encryptToken } from "../lib/meta/oauth";

async function main() {
  const prisma = getPrisma();
  console.log("🌱 Seeding Persian commercial SaaS demo data for Dayrect Pro...");

  // 1. Create or update Demo Admin User with SUPER_ADMIN role
  const email = "admin@openreply.ir";
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: "مدیر سیستم دی‌رکت",
      role: "SUPER_ADMIN",
      referralCode: "DAYRECT100",
    },
    create: {
      email,
      name: "مدیر سیستم دی‌رکت",
      role: "SUPER_ADMIN",
      referralCode: "DAYRECT100",
      emailVerified: new Date(),
    },
  });
  console.log(`✅ Super Admin ready: ${user.name} (${user.email}, role: ${user.role})`);

  // 2. Create Commercial SaaS Plans
  const plans = [
    {
      name: "free",
      nameFa: "آزمایشی رایگان",
      descriptionFa: "مناسب برای تست و ارزیابی سیستم در پیج‌های تازه‌تاسیس",
      priceTomans: 0,
      durationDays: 14,
      maxInstagramAccounts: 1,
      monthlyDmLimit: 250,
      monthlySmsLimit: 0,
      hasAiResponder: false,
      hasFormBuilder: true,
      hasShowcase: true,
      hasAffiliate: true,
      isActive: true,
      isDefault: true,
      sortOrder: 1,
    },
    {
      name: "starter",
      nameFa: "پلن استارتر (برنزی)",
      descriptionFa: "مناسب برای آنلاین‌شاپ‌ها و پیج‌های در حال رشد",
      priceTomans: 290000,
      durationDays: 30,
      maxInstagramAccounts: 1,
      monthlyDmLimit: 2500,
      monthlySmsLimit: 50,
      hasAiResponder: false,
      hasFormBuilder: true,
      hasShowcase: true,
      hasAffiliate: true,
      isActive: true,
      isDefault: false,
      sortOrder: 2,
    },
    {
      name: "pro",
      nameFa: "پلن حرفه‌ای (طلایی - پرفروش)",
      descriptionFa: "دایرکت نامحدود هوشمند، هوش مصنوعی و پیگیری خودکار",
      priceTomans: 690000,
      durationDays: 30,
      maxInstagramAccounts: 3,
      monthlyDmLimit: 10000,
      monthlySmsLimit: 250,
      hasAiResponder: true,
      hasFormBuilder: true,
      hasShowcase: true,
      hasAffiliate: true,
      isActive: true,
      isDefault: false,
      sortOrder: 3,
    },
    {
      name: "enterprise",
      nameFa: "پلن سازمانی و آژانس‌ها",
      descriptionFa: "پشتیبانی VIP، چند اکانته و وب‌سرویس اختصاصی پیامک",
      priceTomans: 1490000,
      durationDays: 30,
      maxInstagramAccounts: 10,
      monthlyDmLimit: 50000,
      monthlySmsLimit: 1000,
      hasAiResponder: true,
      hasFormBuilder: true,
      hasShowcase: true,
      hasAffiliate: true,
      isActive: true,
      isDefault: false,
      sortOrder: 4,
    },
  ];

  for (const p of plans) {
    await prisma.plan.upsert({
      where: { name: p.name },
      update: p,
      create: p,
    });
  }
  console.log("✅ Commercial Plans seeded (Free, Starter, Pro, Enterprise)");

  // 3. Assign Pro Subscription to Demo Admin User
  const proPlan = await prisma.plan.findUnique({ where: { name: "pro" } });
  if (proPlan) {
    const existingSub = await prisma.subscription.findFirst({
      where: { userId: user.id },
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    if (!existingSub) {
      await prisma.subscription.create({
        data: {
          userId: user.id,
          planId: proPlan.id,
          status: "ACTIVE",
          startsAt: new Date(),
          expiresAt,
          dmsUsed: 284,
          smsUsed: 18,
        },
      });
    } else {
      await prisma.subscription.update({
        where: { id: existingSub.id },
        data: {
          planId: proPlan.id,
          status: "ACTIVE",
          expiresAt,
          dmsUsed: 284,
          smsUsed: 18,
        },
      });
    }
  }
  console.log("✅ Active Pro Subscription assigned to admin user");

  // 4. Seed Platform Settings (Rule 7 compliant)
  const defaultSettings = [
    {
      key: "platform.brand_name",
      label: "نام برند پلتفرم",
      description: "نام سامانه در هدر و صفحات کاربری",
      type: "text",
      value: "پیام‌بان (Payamban Pro)",
      defaultValue: "پیام‌بان (Payamban Pro)",
      category: "general",
    },
    {
      key: "platform.free_trial_days",
      label: "مدت تست رایگان (روز)",
      description: "تعداد روزهای فعال بودن پلن تستی برای ثبت‌نامی‌های جدید",
      type: "number",
      value: "14",
      defaultValue: "14",
      category: "pricing",
    },
    {
      key: "sms.provider_default",
      label: "سامانه پیش‌فرض پیامک",
      description: "وب‌سرویس مورد استفاده برای ارسال پیامک‌های خودکار",
      type: "select",
      value: "KAVENEGAR",
      defaultValue: "KAVENEGAR",
      category: "sms",
    },
    {
      key: "payment.zarinpal_merchant",
      label: "مرچنت کد درگاه زرین‌پال",
      description: "کد پذیرنده اختصاصی جهت فعال‌سازی درگاه شتابی",
      type: "text",
      value: "zarinpal_demo_merchant_id_123456",
      defaultValue: "zarinpal_demo_merchant_id_123456",
      category: "payment",
    },
    {
      key: "payment.zarinpal_sandbox",
      label: "حالت آزمایشی (سندباکس) پرداخت",
      description: "تست تراکنش‌ها بدون کسر وجه واقعی",
      type: "boolean",
      value: "true",
      defaultValue: "true",
      category: "payment",
    },
    {
      key: "ai.openai_model",
      label: "مدل هوش مصنوعی پاسخگو",
      description: "مدل هوش مصنوعی جهت چت مستقیم و پاسخ به سوالات مشتری",
      type: "text",
      value: "gpt-4o-mini",
      defaultValue: "gpt-4o-mini",
      category: "ai",
    },
    {
      key: "meta.default_app_id",
      label: "شناسه پیش‌فرض اپلیکیشن متا (Meta App ID)",
      description: "شناسه اپلیکیشن عمومی سیستم برای کاربرانی که اپ مستقل ندارند",
      type: "text",
      value: "test_instagram_app_id",
      defaultValue: "test_instagram_app_id",
      category: "instagram",
    },
    {
      key: "meta.default_app_secret",
      label: "رمز پیش‌فرض اپلیکیشن متا (Meta App Secret)",
      description: "رمز اپلیکیشن عمومی سیستم جهت تبادل توکن",
      type: "text",
      value: "test_facebook_app_secret",
      defaultValue: "test_facebook_app_secret",
      category: "instagram",
    },
    {
      key: "meta.global_verify_token",
      label: "کد تایید سراسری وب‌هوک (Global Verify Token)",
      description: "توکن تایید وب‌هوک متا برای دریافت پیام‌ها و کامنت‌ها",
      type: "text",
      value: "openreply_persian_token",
      defaultValue: "openreply_persian_token",
      category: "instagram",
    },
  ];

  for (const s of defaultSettings) {
    await prisma.platformSetting.upsert({
      where: { key: s.key },
      update: s,
      create: s,
    });
  }
  console.log("✅ Platform settings initialized");

  // 5. Create or update Primary Workspace
  let workspace = await prisma.workspace.findFirst({
    where: { ownerId: user.id },
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: "ورک‌اسپیس دی‌رکت (پروژه اصلی)",
        ownerId: user.id,
        dmsSentThisPeriod: 284,
      },
    });
  }
  console.log(`✅ Workspace ready: ${workspace.name}`);

  // 6. Connected Instagram Account
  const igId = "17841400000000001";
  const encryptedToken = encryptToken("mock_instagram_access_token_dayrect_persian_secure");

  const igAccount = await prisma.instagramAccount.upsert({
    where: { instagramId: igId },
    update: {
      username: "dayrect_official",
      name: "دی‌رکت | اتوماسیون اینستاگرام",
      accessToken: encryptedToken,
      tokenStatus: "HEALTHY",
      webhookSubscribed: true,
      workspaceId: workspace.id,
    },
    create: {
      instagramId: igId,
      workspaceId: workspace.id,
      username: "dayrect_official",
      name: "دی‌رکت | اتوماسیون اینستاگرام",
      accessToken: encryptedToken,
      tokenStatus: "HEALTHY",
      webhookSubscribed: true,
    },
  });
  console.log(`✅ Instagram Account connected: @${igAccount.username}`);

  // 7. Seed Instagram Posts for Media Explorer
  const samplePosts = [
    {
      postId: "post_1799200001",
      caption: "🌸 جشنواره بهاره آغاز شد! کاتالوگ و قیمت تمام محصولات رو همین الان با کامنت 'قیمت' در دایرکت دریافت کنید.",
      mediaType: "IMAGE",
      mediaUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600",
      permalink: "https://instagram.com/p/sample1",
      likeCount: 482,
      commentsCount: 64,
      timestamp: new Date(Date.now() - 86400 * 1000),
    },
    {
      postId: "post_1799200002",
      caption: "🚀 وبینار رایگان اتوماسیون اینستاگرام و رشد فروش آنلاین. برای دریافت بلیت رایگان کلمه 'وبینار' را کامنت کنید.",
      mediaType: "VIDEO",
      mediaUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600",
      permalink: "https://instagram.com/p/sample2",
      likeCount: 1250,
      commentsCount: 183,
      timestamp: new Date(Date.now() - 172800 * 1000),
    },
    {
      postId: "post_1799200003",
      caption: "✨ ۳ ترفند طلایی برای افزایش فروش از طریق دایرکت اینستاگرام. اسلایدها رو ورق بزنید و نظرتون رو بنویسید.",
      mediaType: "CAROUSEL_ALBUM",
      mediaUrl: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=600",
      permalink: "https://instagram.com/p/sample3",
      likeCount: 890,
      commentsCount: 42,
      timestamp: new Date(Date.now() - 259200 * 1000),
    },
  ];

  for (const post of samplePosts) {
    await prisma.instagramPost.upsert({
      where: {
        instagramAccountId_postId: {
          instagramAccountId: igAccount.id,
          postId: post.postId,
        },
      },
      update: post,
      create: {
        ...post,
        instagramAccountId: igAccount.id,
      },
    });
  }
  console.log("✅ Instagram Media cached for visual selector");

  // 8. Seed Unanswered Comments (کامنت‌های بی‌پاسخ)
  const sampleComments = [
    {
      postId: "post_1799200001",
      commentId: "comment_raw_001",
      commenterId: "user_ig_101",
      commenterUsername: "reza.tehrani",
      text: "سلام سایزبندی پیراهن‌ها رو از کجا می‌تونم ببینم؟",
      status: "UNANSWERED" as const,
    },
    {
      postId: "post_1799200001",
      commentId: "comment_raw_002",
      commenterId: "user_ig_102",
      commenterUsername: "shirin_art",
      text: "ارسال به شهرستان هم دارید؟ هزینه ارسال چقدره؟",
      status: "UNANSWERED" as const,
    },
    {
      postId: "post_1799200002",
      commentId: "comment_raw_003",
      commenterId: "user_ig_103",
      commenterUsername: "amirreza_dev",
      text: "وبینار ضبط هم میشه بعدا بتونیم ببینیم؟",
      status: "UNANSWERED" as const,
    },
  ];

  for (const comm of sampleComments) {
    await prisma.unansweredComment.upsert({
      where: { commentId: comm.commentId },
      update: comm,
      create: {
        ...comm,
        instagramAccountId: igAccount.id,
      },
    });
  }
  console.log("✅ Unanswered comments feed populated");

  // 9. Seed Phonebook Contacts (دفترچه تلفن)
  const contacts = [
    {
      instagramUsername: "ali_rezaei",
      name: "علی رضایی",
      phone: "09123456789",
      email: "ali@gmail.com",
      tags: ["خریدار", "کاتالوگ", "تهران"],
      source: "FORM",
      notes: "علاقه‌مند به دوره پیشرفته و کاتالوگ محصولات بهاره",
    },
    {
      instagramUsername: "sara_m",
      name: "سارا محمدی",
      phone: "09351234567",
      email: "sara.m@yahoo.com",
      tags: ["لید_داغ", "وبینار"],
      source: "DM",
      notes: "در وبینار ثبت‌نام کرد، پیگیری برای خرید پیشنهاد ویژه",
    },
    {
      instagramUsername: "mehdi_ahmadi",
      name: "مهدی احمدی",
      phone: "09198765432",
      email: "mehdi.a@chmail.ir",
      tags: ["مشتری_وفادار", "تخفیف"],
      source: "FORM",
      notes: "دو بار خرید موفق از طریق ویترین دایرکت",
    },
    {
      instagramUsername: "maryam_k",
      name: "مریم کاظمی",
      phone: "09301112233",
      email: "maryam@outlook.com",
      tags: ["استعلام_قیمت"],
      source: "DM",
      notes: "استعلام قیمت ست اداری",
    },
  ];

  for (const c of contacts) {
    await prisma.phonebookContact.upsert({
      where: {
        workspaceId_phone: {
          workspaceId: workspace.id,
          phone: c.phone,
        },
      },
      update: c,
      create: {
        ...c,
        workspaceId: workspace.id,
      },
    });
  }
  console.log("✅ Phonebook contacts (دفترچه تلفن) populated with sample leads");

  // 10. Seed DM Form (فرم‌ساز دایرکت)
  const existingForm = await prisma.dmForm.findFirst({
    where: { workspaceId: workspace.id, triggerKeyword: "فرم" },
  });

  if (!existingForm) {
    const form = await prisma.dmForm.create({
      data: {
        workspaceId: workspace.id,
        title: "فرم دریافت کد تخفیف ۲۰ درصدی و مشاوره خرید",
        description: "جمع‌آوری خودکار نام، شماره موبایل و نوع محصول مدنظر در دایرکت",
        triggerKeyword: "فرم",
        isActive: true,
        completionMessage: "اطلاعات شما با موفقیت ثبت شد! 🎉 کد تخفیف اختصاصی شما: DAYRECT20. لینک خرید در ادامه ارسال می‌شود.",
        smsNotificationEnabled: true,
        smsTemplate: "کاربر گرامی، کد تخفیف 20 درصدی شما DAYRECT20 با موفقیت فعال شد. خرید در: dayrect.ir",
        fields: [
          { id: "f1", label: "لطفاً نام و نام خانوادگی خود را ارسال کنید:", type: "text", required: true },
          { id: "f2", label: "شماره موبایل جهت ارسال پیامک کد تخفیف:", type: "phone", required: true },
          { id: "f3", label: "علاقه‌مند به کدام دسته از محصولات هستید؟", type: "text", required: false },
        ],
      },
    });

    // Add a sample submission
    await prisma.dmFormSubmission.create({
      data: {
        formId: form.id,
        commenterId: "user_ig_001",
        commenterUsername: "ali_rezaei",
        phone: "09123456789",
        data: {
          f1: "علی رضایی",
          f2: "09123456789",
          f3: "محصولات دیجیتال و هوش مصنوعی",
        },
      },
    });
  }
  console.log("✅ DM Form Builder (فرم‌ساز دایرکت) & sample submission seeded");

  // 11. Seed Product Showcase (ویترین‌ساز دایرکت)
  const existingShowcase = await prisma.productShowcase.findFirst({
    where: { workspaceId: workspace.id, triggerKeyword: "ویترین" },
  });

  if (!existingShowcase) {
    await prisma.productShowcase.create({
      data: {
        workspaceId: workspace.id,
        title: "ویترین محصولات پرفروش بهاره",
        triggerKeyword: "ویترین",
        isActive: true,
        items: [
          {
            id: "p1",
            name: "دوره جامع اتوماسیون و فروش دایرکت",
            priceTomans: 490000,
            imageUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500",
            buyUrl: "https://dayrect.ir/pay/course1",
            description: "یادگیری کامل تبدیل فالوور به خریدار در کمتر از ۷ روز",
          },
          {
            id: "p2",
            name: "قالب آماده فرم‌ساز و ویترین اینستاگرام",
            priceTomans: 190000,
            imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500",
            buyUrl: "https://dayrect.ir/pay/template1",
            description: "پکیج کامل سناریوهای آماده پاسخگویی خودکار",
          },
        ],
      },
    });
  }
  console.log("✅ Product Showcase (ویترین محصولات دایرکت) seeded");

  // 12. Seed SmsConfiguration & Sample SmsLog
  await prisma.smsConfiguration.upsert({
    where: { workspaceId: workspace.id },
    update: {
      provider: "KAVENEGAR",
      apiKey: "kavenegar_demo_test_api_key",
      senderLine: "10008000",
      isActive: true,
    },
    create: {
      workspaceId: workspace.id,
      provider: "KAVENEGAR",
      apiKey: "kavenegar_demo_test_api_key",
      senderLine: "10008000",
      isActive: true,
    },
  });

  await prisma.smsLog.createMany({
    data: [
      {
        workspaceId: workspace.id,
        recipientPhone: "09123456789",
        messageText: "علی رضایی عزیز، کد تخفیف اختصاصی شما با موفقیت ارسال شد: DAYRECT20",
        status: "SENT",
        providerResponse: "status: 200, messageid: 489102",
      },
      {
        workspaceId: workspace.id,
        recipientPhone: "09351234567",
        messageText: "سارا محمدی گرامی، یادآوری وبینار آنلاین هوش مصنوعی امروز ساعت ۱۹.",
        status: "SENT",
        providerResponse: "status: 200, messageid: 489103",
      },
    ],
  });
  console.log("✅ Smart SMS Configuration and logs ready");

  // 13. Ensure Demo Session Token
  const sessionToken = "demo-session-token-persian-openreply";
  const expires = new Date();
  expires.setDate(expires.getDate() + 30);

  await prisma.session.upsert({
    where: { sessionToken },
    update: {
      userId: user.id,
      expires,
    },
    create: {
      sessionToken,
      userId: user.id,
      expires,
    },
  });

  console.log("✨ ALL Commercial SaaS & Directam features successfully seeded into PostgreSQL!");
}

main().catch((e) => {
  console.error("❌ Seed error:", e);
  process.exit(1);
});
