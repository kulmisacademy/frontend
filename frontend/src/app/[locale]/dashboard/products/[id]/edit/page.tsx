"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";
import { apiFetch } from "@/lib/api";
import {
  ProductForm,
  type ProductFormInitial,
} from "@/components/dashboard/product-form";

type ProductRes = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  old_price: number | null;
  category: string;
  images: string[];
  video_url: string | null;
  in_stock: boolean;
  features?: unknown;
  location?: string | null;
};

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { user, loading, token } = useAuth();
  const [product, setProduct] = React.useState<ProductFormInitial | null>(null);
  const [loadErr, setLoadErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=/dashboard/products");
    }
  }, [loading, user, router]);

  React.useEffect(() => {
    if (!token || !id) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<{ product: ProductRes }>(
          `/api/vendor/products/${id}`,
          { token }
        );
        if (!cancelled) {
          setProduct({
            id: data.product.id,
            name: data.product.name,
            description: data.product.description,
            category: data.product.category,
            price: Number(data.product.price),
            old_price: data.product.old_price,
            images: Array.isArray(data.product.images) ? data.product.images : [],
            video_url: data.product.video_url,
            in_stock: data.product.in_stock,
            features: data.product.features,
            location: data.product.location,
          });
        }
      } catch (e) {
        if (!cancelled) {
          setLoadErr(e instanceof Error ? e.message : "Failed to load");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, id]);

  if (loading || !user || !token) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center py-20">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (loadErr) {
    return (
      <p className="text-destructive">{loadErr}</p>
    );
  }

  if (!product) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="size-10" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Edit product
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Update details, images, or video.
        </p>
      </div>
      <ProductForm
        mode="edit"
        initial={product}
        token={token}
        onSuccess={() => router.push("/dashboard/products")}
      />
    </div>
  );
}
