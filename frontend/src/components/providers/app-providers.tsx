"use client";

import * as React from "react";
import { Suspense } from "react";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { CartProvider } from "@/context/cart-context";
import { AuthProvider } from "@/context/auth-context";
import { ReferralCapture } from "@/components/referral-capture";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <CartProvider>
          <Suspense fallback={null}>
            <ReferralCapture />
          </Suspense>
          {children}
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
