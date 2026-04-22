import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardAppShell } from "@/components/dashboard/dashboard-app-shell";
import { AdminSessionProvider } from "@/components/dashboard/admin-session-context";

export const metadata: Metadata = {
  title: "Admin",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminSessionProvider>
      <DashboardAppShell variant="admin">{children}</DashboardAppShell>
    </AdminSessionProvider>
  );
}
