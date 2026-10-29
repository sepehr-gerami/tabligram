import { Cpu, Plane, Shirt, Sparkles, UtensilsCrossed, type LucideIcon } from "lucide-react";
import type { CategoryId } from "@/types";

export const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  fashion: Shirt,
  food: UtensilsCrossed,
  tech: Cpu,
  beauty: Sparkles,
  travel: Plane,
};
