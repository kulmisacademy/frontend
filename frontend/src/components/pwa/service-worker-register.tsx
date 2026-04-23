"use client";

import * as React from "react";

const SW_PATH = "/sw.js";

function canUseServiceWorker(): boolean {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  return window.isSecureContext || window.location.hostname === "localhost";
}

export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (!canUseServiceWorker()) return;
    void navigator.serviceWorker
      .register(SW_PATH, { scope: "/", updateViaCache: "none" })
      .catch(() => {
        /* ignore — optional enhancement */
      });
  }, []);

  return null;
}
