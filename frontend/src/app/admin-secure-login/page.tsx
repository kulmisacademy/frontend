import { Suspense } from "react";
import { AdminSecureLoginForm } from "./admin-secure-login-form";
import { Spinner } from "@/components/ui/spinner";

export default function AdminSecureLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center py-20">
          <Spinner className="size-8" />
        </div>
      }
    >
      <AdminSecureLoginForm />
    </Suspense>
  );
}
