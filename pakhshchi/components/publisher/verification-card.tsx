"use client";

import { useState } from "react";
import { BadgeCheck, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { Alert } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { pageTitle } from "@/components/shared/page-card";
import { useStore } from "@/lib/store";
import { formatNumber } from "@/lib/utils";
import { BIO_CODE_TTL_HOURS, bioInstruction, emptyVerification, isCodeExpired, methodLabel } from "@/lib/verification";
import type { InstaPage, VerificationMethod } from "@/types";

/**
 * Owner-side ownership verification. Two flows:
 *  - Bio code: owner pastes the code into their Instagram bio, then confirms here.
 *    In production the confirm step must call an API route that reads the live
 *    profile server-side — this demo trusts the owner's confirmation.
 *  - Graph token: owner pastes a long-lived Instagram token; the demo only checks
 *    its shape. Production exchanges and validates it on the server.
 */
export function VerificationCard({ page }: { page: InstaPage }) {
  const { startVerification, confirmVerification, cancelVerification } = useStore();
  const toast = useToast();
  // Old saved data may lack the verification object entirely — treat it as unverified.
  const v = page.verification ?? emptyVerification();
  const verified = v.status === "verified";
  const awaiting = v.status === "awaiting";
  const expired = awaiting && isCodeExpired(v);

  function begin(method: VerificationMethod) {
    startVerification(page.id, method);
    toast({ tone: "info", title: "فرایند تأیید شروع شد", description: method === "graph" ? "توکن حساب را وارد کنید." : "کد را در بیو پیج بگذارید." });
  }

  function confirm() {
    confirmVerification(page.id);
    toast({ tone: "success", title: "مالکیت تأیید شد", description: pageTitle(page) });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-bold text-navy-900">تأیید مالکیت پیج</h4>
          {verified && <Badge tone="success"><BadgeCheck aria-hidden className="size-3.5" />تأییدشده · {v.method ? methodLabel[v.method] : ""}</Badge>}
          {awaiting && <Badge tone="warning">در انتظار تأیید</Badge>}
          {v.status === "unverified" && <Badge tone="neutral">تأیید نشده</Badge>}
        </div>

        {verified ? (
          <Alert tone="success"><ShieldCheck aria-hidden className="inline size-4" /> {v.note}</Alert>
        ) : awaiting ? (
          <div className="space-y-3">
            <p className="rounded-xl bg-mist p-3 text-sm leading-7">
              این کد را در بیو پیج بگذارید: <strong dir="ltr">{bioInstruction(v.code ?? "")}</strong>
              <span className="block text-xs text-slate-500">
                اعتبار کد {formatNumber(BIO_CODE_TTL_HOURS)} ساعت است.{expired ? " کد منقضی شده؛ کد جدید بگیرید." : ""}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={confirm}>کد را منتشر کردم؛ بررسی کن</Button>
              <Button size="sm" variant="outline" onClick={() => begin("bio-code")}><RefreshCw />کد جدید</Button>
              <Button size="sm" variant="ghost" onClick={() => cancelVerification(page.id)}>انصراف</Button>
            </div>
            <GraphTokenInput pageId={page.id} />
            {v.note && <p className="text-xs text-slate-500">{v.note}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <Alert tone="warning">
              <ShieldAlert aria-hidden className="inline size-4" /> پیج‌های تأییدشده اولویت نمایش دارند و آمارشان «تأییدشده» محسوب می‌شود.
            </Alert>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => begin("bio-code")}>تأیید با کد بیو</Button>
              <Button size="sm" variant="outline" onClick={() => begin("graph")}>اتصال حساب (Graph API)</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GraphTokenInput({ pageId }: { pageId: string }) {
  const { confirmVerification } = useStore();
  const toast = useToast();
  const [token, setToken] = useState("");
  function submitToken() {
    if (token.trim().length < 20) {
      toast({ tone: "error", title: "توکن نامعتبر است", description: "توکن کامل اینستاگرام را وارد کنید." });
      return;
    }
    confirmVerification(pageId);
    setToken("");
    toast({ tone: "success", title: "حساب متصل شد", description: "مالکیت از طریق Graph API تأیید شد." });
  }
  return (
    <div className="flex gap-2">
      <input
        dir="ltr" className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm" spellCheck={false}
        placeholder="IGQVJ… (long-lived token)" value={token} onChange={(e) => setToken(e.target.value)} />
      <Button variant="outline" size="sm" onClick={submitToken}>تأیید با توکن</Button>
    </div>
  );
}
