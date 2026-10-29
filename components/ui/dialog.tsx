"use client";

import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({ className, children, ...p }: ComponentProps<typeof D.Content>) {
  return (
    <D.Portal>
      <D.Overlay className="dlg-overlay fixed inset-0 z-50 bg-navy-900/40 backdrop-blur-[2px]" />
      <D.Content
        className={cn("dlg-content fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-1.5rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-5 shadow-lift sm:p-6", className)}
        {...p}
      >
        {children}
        <D.Close aria-label="بستن" className="absolute end-3 top-3 grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">
          <X className="size-4" />
        </D.Close>
      </D.Content>
    </D.Portal>
  );
}

export const DialogHeader = ({ className, ...p }: ComponentProps<"div">) => <div className={cn("mb-4 space-y-1.5 pe-8", className)} {...p} />;
export const DialogTitle = ({ className, ...p }: ComponentProps<typeof D.Title>) => <D.Title className={cn("text-lg font-bold text-navy-900", className)} {...p} />;
export const DialogDescription = ({ className, ...p }: ComponentProps<typeof D.Description>) => <D.Description className={cn("text-sm leading-6 text-slate-500", className)} {...p} />;
export const DialogFooter = ({ className, ...p }: ComponentProps<"div">) => <div className={cn("mt-5 flex flex-wrap items-center justify-end gap-2", className)} {...p} />;
