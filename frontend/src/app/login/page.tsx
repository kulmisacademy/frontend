import { Suspense } from "react";
import { MarketingShell } from "@/components/marketing-shell";
import { PageContainer } from "@/components/ui/section";
import { Spinner } from "@/components/ui/spinner";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <MarketingShell>
          <PageContainer className="flex min-h-[40vh] items-center justify-center py-16 md:py-24">
            <Spinner className="size-8" />
          </PageContainer>
        </MarketingShell>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
