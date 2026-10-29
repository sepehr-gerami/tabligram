import { LayoutDashboard, Megaphone, ShieldCheck, type LucideIcon } from "lucide-react";

export type RoleId = "advertiser" | "publisher" | "admin";
export const ROLES: { id: RoleId; label: string; href: string; icon: LucideIcon }[] = [
  { id: "advertiser", label: "تبلیغ‌دهنده", href: "/campaigns/new", icon: Megaphone },
  { id: "publisher", label: "صاحب پیج", href: "/publisher/dashboard", icon: LayoutDashboard },
  { id: "admin", label: "مدیر", href: "/admin", icon: ShieldCheck },
];
