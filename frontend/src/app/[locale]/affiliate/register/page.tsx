import type { Metadata } from "next";
import { AffiliateRegisterClient } from "./register-client";

export const metadata: Metadata = {
  title: "Affiliate signup",
  description: "Join the LAAS24 affiliate program and earn when stores you refer succeed.",
};

export default function AffiliateRegisterPage() {
  return <AffiliateRegisterClient />;
}
