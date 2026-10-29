import { LayoutDashboard, Megaphone, ShieldCheck, type LucideIcon } from "lucide-react";

export type RoleId = "advertiser" | "publisher" | "admin";

export interface RoleMeta {
  id: RoleId;
  label: string;
  href: string;
  icon: LucideIcon;
}

/** All roles, including the admin role. Use only where the admin role is intentionally allowed. */
export const ROLES: RoleMeta[] = [
  { id: "advertiser", label: "تبلیغ‌دهنده", href: "/campaigns/new", icon: Megaphone },
  { id: "publisher", label: "صاحب پیج", href: "/publisher/dashboard", icon: LayoutDashboard },
  { id: "admin", label: "مدیر", href: "/admin", icon: ShieldCheck },
];

export type PublicRoleId = Exclude<RoleId, "admin">;
export type PublicRoleMeta = Omit<RoleMeta, "id"> & { id: PublicRoleId };

/**
 * Roles a visitor may pick from the public header / sign-in forms.
 * The admin role is deliberately excluded: administrative access must never be
 * selectable from public UI (it belongs to server-side authentication, not to a client choice).
 */
export const PUBLIC_ROLES: PublicRoleMeta[] = ROLES.filter(
  (r): r is PublicRoleMeta => r.id !== "admin",
);
