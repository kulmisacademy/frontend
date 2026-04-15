"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * React 19 warns when next-themes injects its inline theme `<script>` in a client tree.
 * On the client only, mark it `type="application/json"` so React stops treating it as
 * executable script (the SSR HTML already ran the real blocking script). See pacocoursey/next-themes#387.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  const scriptProps =
    typeof window === "undefined"
      ? undefined
      : ({ type: "application/json" } as const);

  return (
    <NextThemesProvider {...props} scriptProps={scriptProps}>
      {children}
    </NextThemesProvider>
  );
}
