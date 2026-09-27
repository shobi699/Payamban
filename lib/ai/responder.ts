import { prisma } from "@/lib/db/client";
import { getAiApiKey } from "@/lib/env";

export interface AiResponseResult {
  answer: string;
  needsHumanIntervention: boolean;
  usedKnowledgeDocs: string[];
}

const HUMAN_HANDOFF_KEYWORDS = [
  "ادمین",
  "اپراتور",
  "پشتیبان",
  "شکایت",
  "کلاهبرداری",
  "پولمو پس بدید",
  "ناراضی",
  "مسئول",
  "انصراف",
  "پلیس فتا",
  "پیگیری قضایی",
  "وصل کن به آدم",
  "انسان",
];

/**
 * Checks if the user's message indicates distress, frustration, or requests human intervention (T033).
 */
export function checkHandoffIntent(messageText: string): boolean {
  const lower = messageText.toLowerCase();
  return HUMAN_HANDOFF_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Generates an AI-powered conversational answer based on workspace knowledge docs (RAG).
 */
export async function generateAiReply(
  workspaceId: string,
  userMessage: string
): Promise<AiResponseResult> {
  // 1. Check for human handoff trigger first (T033)
  if (checkHandoffIntent(userMessage)) {
    return {
      answer:
        "پیام شما به عنوان اولویت پشتیبانی به همکاران واحد ادمین ارجاع داده شد. به زودی ادمین مستقیماً با شما گفتگو خواهد کرد. از شکیبایی شما سپاسگزاریم 🙏",
      needsHumanIntervention: true,
      usedKnowledgeDocs: [],
    };
  }

  // 2. Load active knowledge base documents for this workspace
  const docs = await prisma.aiKnowledgeDoc.findMany({
    where: { workspaceId, isActive: true },
    select: { id: true, title: true, content: true },
  });

  // 3. Read AI Settings from PlatformSetting (T031 - Rule 7)
  const [toneSetting, modelSetting] = await Promise.all([
    prisma.platformSetting.findUnique({ where: { key: "ai.system_tone" } }),
    prisma.platformSetting.findUnique({ where: { key: "ai.openai_model" } }),
  ]);

  const tone = toneSetting?.value ?? "FRIENDLY"; // "FRIENDLY" or "FORMAL"
  const modelName = modelSetting?.value ?? "gpt-4o-mini";
  const apiKey = getAiApiKey();

  // If no knowledge docs exist, return a graceful fallback
  if (docs.length === 0) {
    return {
      answer:
        "سلام و درود! پیام شما دریافت شد. در اسرع وقت پاسخگوی شما عزیزان در دایرکت خواهیم بود 🌸",
      needsHumanIntervention: false,
      usedKnowledgeDocs: [],
    };
  }

  // Build Context for RAG
  const knowledgeContext = docs
    .map((doc) => `[موضوع: ${doc.title}]\n${doc.content}`)
    .join("\n\n---\n\n");

  const systemPrompt = `شما یک دستیار هوشمند و مجرب فروش و پشتیبانی اینستاگرام برای این فروشگاه هستید.
لحن صحبت: ${
    tone === "FORMAL"
      ? "کاملاً رسمی، اداری، متین، محترمانه و دقیق بدون افراط در ایموجی"
      : "بسیار صمیمی، دوستانه، پرانرژی، خوش‌رو و همراه با ایموجی‌های مناسب اینستاگرام"
  }

پایگاه دانش فروشگاه:
"""
${knowledgeContext}
"""

دستورالعمل‌ها:
۱. تنها و تنها بر اساس حقایق و داده‌های پایگاه دانش بالا پاسخ دهید.
۲. اگر پاسخ سوال کاربر در پایگاه دانش موجود نیست، صادقانه بفرمایید که پاسخ دقیق این موضوع را از همکاران ادمین جویا می‌شوید. هرگز پاسخ ساختگی ندهید.
۳. طول پاسخ‌ها متناسب با چت اینستاگرام باشد (حداکثر ۲ تا ۳ جمله کوتاه، روان و کاربردی).`;

  // If API key is available, call OpenAI chat completions API
  if (apiKey && !apiKey.startsWith("demo_") && apiKey.length > 20) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          temperature: 0.3,
          max_tokens: 300,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (res.ok) {
        interface OpenAiResponse {
          choices?: Array<{ message?: { content?: string } }>;
        }
        const json = (await res.json()) as OpenAiResponse;
        const reply = json.choices?.[0]?.message?.content?.trim();
        if (reply) {
          return {
            answer: reply,
            needsHumanIntervention: false,
            usedKnowledgeDocs: docs.map((d) => d.title),
          };
        }
      }
    } catch (apiError) {
      console.warn("[AI Responder] OpenAI call failed, falling back to local extractor:", apiError);
    }
  }

  // Local rule-based extractor fallback (for development, offline, or when no external key)
  const normalizedQuery = userMessage.toLowerCase();
  const matchedDoc = docs.find(
    (d) =>
      normalizedQuery.includes(d.title.toLowerCase()) ||
      d.content.toLowerCase().includes(normalizedQuery) ||
      d.title.toLowerCase().split(" ").some((w) => w.length > 2 && normalizedQuery.includes(w))
  );

  if (matchedDoc) {
    const summary = matchedDoc.content.slice(0, 200).trim();
    return {
      answer: `${summary} 🙏`,
      needsHumanIntervention: false,
      usedKnowledgeDocs: [matchedDoc.title],
    };
  }

  return {
    answer:
      "سلام دوست عزیز! سوال شما بررسی شد و برای راهنمایی دقیق‌تر به همکاران ارجاع گردید. به زودی در خدمتتون هستیم 🌸",
    needsHumanIntervention: false,
    usedKnowledgeDocs: [],
  };
}
