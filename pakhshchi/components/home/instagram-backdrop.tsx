"use client";

import { MotionConfig, motion } from "framer-motion";
import { Bookmark, Camera, Heart, MessageCircle, Send, Sparkles, type LucideIcon } from "lucide-react";
import { IG_RING } from "@/components/ui/story-ring";

const ORBS = [
  { c: "#feda75", s: 420, pos: "-top-24 -end-20", dx: [0, -40, 0], dy: [0, 30, 0], d: 18 },
  { c: "#fa7e1e", s: 340, pos: "top-32 start-[8%]", dx: [0, 50, 0], dy: [0, -30, 0], d: 21 },
  { c: "#d62976", s: 460, pos: "-top-10 start-[30%]", dx: [0, -30, 0], dy: [0, 40, 0], d: 24 },
  { c: "#962fbf", s: 380, pos: "top-56 -end-16", dx: [0, 40, 0], dy: [0, -40, 0], d: 20 },
  { c: "#4f5bd5", s: 360, pos: "-start-24 -top-16", dx: [0, 30, 0], dy: [0, 30, 0], d: 26 },
];

const GLYPHS: { Icon: LucideIcon; pos: string; size: number; d: number; hide?: boolean }[] = [
  { Icon: Heart, pos: "top-[12%] start-[6%]", size: 34, d: 7 },
  { Icon: Camera, pos: "top-[28%] end-[5%]", size: 38, d: 9 },
  { Icon: MessageCircle, pos: "top-[46%] start-[3%]", size: 30, d: 8, hide: true },
  { Icon: Send, pos: "top-[8%] end-[22%]", size: 28, d: 6.5, hide: true },
  { Icon: Bookmark, pos: "top-[55%] end-[3%]", size: 28, d: 7.5, hide: true },
  { Icon: Sparkles, pos: "top-[20%] start-[26%]", size: 24, d: 6, hide: true },
];

const RINGS = [
  { pos: "top-[16%] end-[12%]", s: 56, d: 8 },
  { pos: "top-[38%] start-[10%]", s: 72, d: 10 },
  { pos: "top-[6%] start-[44%]", s: 40, d: 7 },
];

/** Decorative Instagram-themed background. Colors stay pastel so headline text keeps its contrast. */
export function InstagramBackdrop() {
  return (
    <MotionConfig reducedMotion="user">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[#fffaf8] [mask-image:linear-gradient(to_bottom,black_82%,transparent)]">
        {ORBS.map((o, i) => (
          <motion.span key={i} className={`absolute rounded-full opacity-[.34] blur-3xl ${o.pos}`} style={{ width: o.s, height: o.s, background: o.c }}
            animate={{ x: o.dx, y: o.dy, scale: [1, 1.12, 1] }} transition={{ duration: o.d, ease: "easeInOut", repeat: Infinity }} />
        ))}
        <span className="absolute inset-0 opacity-50 [background-image:radial-gradient(#e9d3dc_1px,transparent_1px)] [background-size:24px_24px]" />
        {RINGS.map((r, i) => (
          <motion.span key={i} className={`absolute hidden rounded-full sm:block ${r.pos}`} style={{ width: r.s, height: r.s, background: IG_RING, opacity: 0.55 }}
            animate={{ y: [0, -16, 0], rotate: [0, 12, 0] }} transition={{ duration: r.d, ease: "easeInOut", repeat: Infinity }}>
            <span className="absolute inset-[3px] rounded-full bg-[#fffaf8]" />
          </motion.span>
        ))}
        {GLYPHS.map(({ Icon, pos, size, d, hide }, i) => (
          <motion.span key={i} className={`absolute text-[#d62976]/35 ${hide ? "hidden md:block" : ""} ${pos}`}
            animate={{ y: [0, -14, 0], rotate: [-8, 8, -8] }} transition={{ duration: d, ease: "easeInOut", repeat: Infinity }}>
            <Icon style={{ width: size, height: size }} strokeWidth={1.6} />
          </motion.span>
        ))}
      </div>
    </MotionConfig>
  );
}
