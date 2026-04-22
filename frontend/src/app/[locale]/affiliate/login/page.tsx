import type { Metadata } from "next";
import { AffiliateLoginClient } from "./login-client";

export const metadata: Metadata = {
  title: "Affiliate login",
};

export default function AffiliateLoginPage() {
  return <AffiliateLoginClient />;
}
