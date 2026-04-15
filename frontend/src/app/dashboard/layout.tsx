import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardAppShell } from "@/components/dashboard/dashboard-app-shell";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardAppShell variant="vendor">{children}</DashboardAppShell>;
}
