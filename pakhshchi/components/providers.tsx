"use client";

import type { ReactNode } from "react";
import { AuthProvider, type ClientUser } from "@/components/auth/auth-provider";
import { ToastProvider } from "@/components/ui/toast";

export function Providers({ children, user }: { children: ReactNode; user: ClientUser | null }) {
  return (
    <ToastProvider>
      <AuthProvider initialUser={user}>{children}</AuthProvider>
    </ToastProvider>
  );
}
