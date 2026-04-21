"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { persistReferralCode } from "@/lib/referral-cookie";

/**
 * Persists `?ref=AFFCODE` from the URL so vendor registration can attribute the store.
 */
export function ReferralCapture() {
  const searchParams = useSearchParams();
  React.useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref && ref.trim()) persistReferralCode(ref.trim());
  }, [searchParams]);
  return null;
}
