"use client";

import { useState, useTransition } from "react";
import { setLocale } from "@/lib/i18n/actions";
import { useI18n } from "@/lib/i18n/provider";
import { useRouter } from "next/navigation";

export default function LanguageSwitcher() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  return (
    <div className="space-y-1">
      <label className="inline-flex items-center gap-2 text-sm text-muted">
        <span>{t("common.labels.language")}</span>
        <select
          value={locale}
          disabled={pending}
          aria-busy={pending}
          onChange={(event) => {
            const nextLocale = event.target.value;
            setFailed(false);
            startTransition(async () => {
              try {
                await setLocale(nextLocale);
                router.refresh();
              } catch {
                setFailed(true);
              }
            });
          }}
          className="min-h-9 rounded-lg border border-border bg-surface px-3 py-1 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 cursor-pointer transition-colors hover:border-border-hover"
        >
          <option value="fa" lang="fa">
            فارسی (RTL)
          </option>
          <option value="en" lang="en">
            English
          </option>
        </select>
      </label>
      {failed && (
        <p role="alert" className="text-xs text-error">
          {t("common.messages.error_occurred")}
        </p>
      )}
    </div>
  );
}
