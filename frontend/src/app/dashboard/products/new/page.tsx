"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";
import { ProductForm } from "@/components/dashboard/product-form";

export default function NewProductPage() {
  const router = useRouter();
  const { user, loading, token } = useAuth();

  React.useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/dashboard/products/new");
  }, [loading, user, router]);

  if (loading || !user || !token) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center py-20">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Add product
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use the AI assistant to draft copy from one photo, then edit and add
          media—or fill everything manually.
        </p>
      </div>
      <ProductForm
        mode="create"
        token={token}
        onSuccess={() => router.push("/dashboard/products")}
      />
    </div>
  );
}
