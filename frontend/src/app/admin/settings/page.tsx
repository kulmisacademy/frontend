"use client";

import * as React from "react";
import { Spinner } from "@/components/ui/spinner";
import { useAdminSession } from "@/components/dashboard/admin-session-context";

export default function AdminSettingsPage() {
  const { user, loading } = useAdminSession();

  if (loading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center py-20">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform configuration will live here (feature flags, roles, support
          contacts).
        </p>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">
          Signed in as{" "}
          <span className="font-medium text-foreground">{user.email}</span>.
          Admin session uses an httpOnly cookie and a short-lived token. Use the
          secure admin sign-in URL only on trusted devices.
        </p>
      </div>
    </div>
  );
}
