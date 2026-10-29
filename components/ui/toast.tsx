"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "success" | "error" | "info";
interface ToastItem { id: number; title: string; description?: string; tone: Tone }
const ToastContext = createContext<((t: Omit<ToastItem, "id">) => void) | null>(null);

const icons = { success: CheckCircle2, error: AlertCircle, info: Info };
const colors: Record<Tone, string> = { success: "text-emerald-600", error: "text-red-600", info: "text-brand-600" };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const toast = useCallback((t: Omit<ToastItem, "id">) => {
    const id = nextId.current++;
    setItems((l) => [...l.slice(-2), { ...t, id }]);
    setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);
  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-3 bottom-3 z-[60] flex flex-col gap-2 sm:inset-x-auto sm:start-4 sm:bottom-4 sm:w-96">
        <AnimatePresence>
          {items.map((t) => {
            const Icon = icons[t.tone];
            return (
              <motion.div key={t.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
                className="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lift">
                <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", colors[t.tone])} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-navy-900">{t.title}</p>
                  {t.description && <p className="mt-0.5 text-sm leading-6 text-slate-500">{t.description}</p>}
                </div>
                <button type="button" onClick={() => dismiss(t.id)} aria-label="بستن پیام" className="grid size-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100">
                  <X className="size-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
