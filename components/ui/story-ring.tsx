"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const IG_RING = "conic-gradient(from 90deg, #feda75, #fa7e1e, #d62976, #962fbf, #4f5bd5, #feda75)";

/** Instagram-style story ring around an avatar. */
export function StoryRing({ size = 44, spin = false, className, children }: { size?: number; spin?: boolean; className?: string; children: ReactNode }) {
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center", className)} style={{ width: size, height: size }}>
      <motion.span aria-hidden className="absolute inset-0 rounded-full" style={{ background: IG_RING }}
        animate={spin ? { rotate: 360 } : undefined} transition={spin ? { duration: 7, ease: "linear", repeat: Infinity } : undefined} />
      <span aria-hidden className="absolute inset-[2.5px] rounded-full bg-white" />
      <span className="relative grid place-items-center text-brand-700">{children}</span>
    </span>
  );
}
