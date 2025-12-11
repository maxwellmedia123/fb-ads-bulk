"use client";

import { SessionProvider } from "next-auth/react";
import { AccountProvider } from "@/lib/context/AccountContext";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AccountProvider>{children}</AccountProvider>
    </SessionProvider>
  );
}
