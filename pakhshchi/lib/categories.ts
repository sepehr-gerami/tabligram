import {
  Briefcase, Building2, Car, Cpu, Dumbbell, GraduationCap, HeartPulse, Home,
  Landmark, Laugh, Palette, Plane, Shirt, Sparkles, UtensilsCrossed, Users, Wallet,
  type LucideIcon,
} from "lucide-react";
import type { CategoryId } from "@/types";

/**
 * The single source of truth for categories.
 * The page form, page cards, home filters and campaign form all read from here,
 * so adding or renaming a category never needs a second list.
 */
export const CATEGORIES: { value: CategoryId; label: string; icon: LucideIcon }[] = [
  { value: "fashion", label: "پوشاک و مد", icon: Shirt },
  { value: "food", label: "غذا و رستوران", icon: UtensilsCrossed },
  { value: "tech", label: "فناوری و دیجیتال", icon: Cpu },
  { value: "beauty", label: "زیبایی و آرایشی", icon: Sparkles },
  { value: "travel", label: "گردشگری و سفر", icon: Plane },
  { value: "sport", label: "ورزش و تناسب‌اندام", icon: Dumbbell },
  { value: "education", label: "آموزش", icon: GraduationCap },
  { value: "health", label: "سلامت", icon: HeartPulse },
  { value: "home", label: "خانه و دکوراسیون", icon: Home },
  { value: "auto", label: "خودرو", icon: Car },
  { value: "kids", label: "کودک و خانواده", icon: Users },
  { value: "fun", label: "سرگرمی و طنز", icon: Laugh },
  { value: "art", label: "هنر و عکاسی", icon: Palette },
  { value: "business", label: "کسب‌وکار و خدمات", icon: Briefcase },
  { value: "realestate", label: "املاک", icon: Building2 },
  { value: "finance", label: "مالی", icon: Wallet },
  { value: "other", label: "سایر", icon: Landmark },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.value);

const BY_ID = new Map(CATEGORIES.map((c) => [c.value, c]));

export const categoryLabel = (v: CategoryId | null | undefined) =>
  (v && BY_ID.get(v)?.label) || "بدون دسته‌بندی";

export const categoryIcon = (v: CategoryId | null | undefined): LucideIcon =>
  (v && BY_ID.get(v)?.icon) || Landmark;

export const isCategoryId = (v: unknown): v is CategoryId =>
  typeof v === "string" && BY_ID.has(v as CategoryId);

/** Kept for older imports: maps the icon table by category id. */
export const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.icon]),
) as Record<CategoryId, LucideIcon>;
