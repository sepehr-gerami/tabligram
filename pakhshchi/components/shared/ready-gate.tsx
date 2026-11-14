"use client";

import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/misc";
import { useStore } from "@/components/shared/store";

/** Shows a skeleton until saved demo data has been read from localStorage. */
export function ReadyGate({ children, rows = 3 }: { children: ReactNode; rows?: number }) {
  const { ready } = useStore();
  if (!ready) {
    return <div role="status" aria-label="در حال بارگذاری" className="space-y-3">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-20" />)}</div>;
  }
  return <>{children}</>;
}
