"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useOptionalAuth } from "@/context/auth-context";
import { Spinner } from "@/components/ui/spinner";

function roleHome(role: string): string {
  switch (role) {
    case "vendor":
      return "/dashboard";
    case "admin":
      return "/admin";
    default:
      return "/profile";
  }
}

export function AuthNav() {
  const t = useTranslations("authNav");
  const router = useRouter();
  const auth = useOptionalAuth();
  if (!auth) {
    return (
      <Button size="sm" className="rounded-xl" asChild>
        <Link href="/login">{t("signIn")}</Link>
      </Button>
    );
  }
  const { loading, user } = auth;

  if (loading) {
    return (
      <div className="flex h-9 w-9 items-center justify-center">
        <Spinner className="size-4" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          className="hidden rounded-xl sm:inline-flex"
          asChild
        >
          <Link href="/register-vendor">{t("sellOnLaas")}</Link>
        </Button>
        <Button size="sm" className="rounded-xl" asChild>
          <Link href="/login">{t("signIn")}</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" className="rounded-xl" asChild>
        <Link href={roleHome(user.role)}>
          {user.role === "vendor"
            ? t("dashboard")
            : user.role === "admin"
              ? t("admin")
              : t("profile")}
        </Link>
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="rounded-xl"
        type="button"
        onClick={() => {
          void auth.logout().then(() => {
            router.push("/");
            router.refresh();
          });
        }}
      >
        {t("signOut")}
      </Button>
    </>
  );
}
