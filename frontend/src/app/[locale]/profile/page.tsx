"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { MarketingShell } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { MARKETING_PAGE_PY, PageContainer } from "@/components/ui/section";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=/profile");
    }
  }, [loading, user, router]);

  async function handleLogout() {
    await logout();
    router.push("/");
    router.refresh();
  }

  if (loading || !user) {
    return (
      <MarketingShell>
        <PageContainer className="flex min-h-[40vh] items-center justify-center py-16 md:py-24">
          <Spinner className="size-8" />
        </PageContainer>
      </MarketingShell>
    );
  }

  return (
    <MarketingShell>
      <PageContainer className={MARKETING_PAGE_PY}>
        <div className="mx-auto max-w-lg rounded-2xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
          <h1 className="font-heading text-2xl font-bold">Your profile</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Account details for shopping and orders on LAAS24.
          </p>
          <dl className="mt-8 space-y-4 text-sm">
            <div>
              <dt className="font-medium text-muted-foreground">Name</dt>
              <dd className="mt-1 text-base">{user.name}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Email</dt>
              <dd className="mt-1 text-base">{user.email}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Phone</dt>
              <dd className="mt-1 text-base">{user.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Role</dt>
              <dd className="mt-1 capitalize">{user.role}</dd>
            </div>
          </dl>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button className="rounded-2xl" asChild>
              <Link href="/account/orders">My orders</Link>
            </Button>
            {user.role === "customer" ? (
              <Button variant="outline" className="rounded-2xl" asChild>
                <Link href="/account/followed-stores">Followed stores</Link>
              </Button>
            ) : null}
            <Button
              variant="outline"
              className="rounded-2xl"
              type="button"
              onClick={() => void handleLogout()}
            >
              Sign out
            </Button>
          </div>
        </div>
      </PageContainer>
    </MarketingShell>
  );
}
