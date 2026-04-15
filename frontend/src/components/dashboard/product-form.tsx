"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { PlanPayload } from "@/lib/plan-types";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { PRODUCT_CATEGORIES } from "@/lib/product-categories";
import { apiFetch } from "@/lib/api";

const schema = z.object({
  name: z.string().min(1).max(300),
  description: z.string().max(8000).optional(),
  category: z.string().min(1),
  price: z.coerce.number().nonnegative(),
  old_price: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().nonnegative().optional()
  ),
  location: z.string().max(200).optional(),
  video_url: z
    .union([z.string().url(), z.literal("")])
    .optional()
    .or(z.literal(undefined)),
  in_stock: z.boolean(),
});

export type ProductFormInitial = {
  id?: string;
  name: string;
  description?: string | null;
  category?: string;
  price: number;
  old_price?: number | null;
  images?: string[];
  video_url?: string | null;
  in_stock?: boolean;
  features?: string[] | unknown;
  location?: string | null;
};

type AiGenerateRes = {
  title: string;
  description: string;
  features: string[];
  language?: "en" | "so";
};

export function ProductForm({
  mode,
  initial,
  token,
  onSuccess,
}: {
  mode: "create" | "edit";
  initial?: ProductFormInitial | null;
  token: string;
  onSuccess: () => void;
}) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [description, setDescription] = React.useState(
    initial?.description ?? ""
  );
  const [category, setCategory] = React.useState(
    initial?.category ?? "General"
  );
  const [price, setPrice] = React.useState(
    initial != null ? String(initial.price) : ""
  );
  const [oldPrice, setOldPrice] = React.useState(
    initial?.old_price != null ? String(initial.old_price) : ""
  );
  const [location, setLocation] = React.useState(initial?.location ?? "");
  const [videoUrl, setVideoUrl] = React.useState(initial?.video_url ?? "");
  const [inStock, setInStock] = React.useState(initial?.in_stock !== false);
  const [featureInput, setFeatureInput] = React.useState("");
  const [features, setFeatures] = React.useState<string[]>(() => {
    const f = initial?.features;
    return Array.isArray(f) ? f.map(String).filter(Boolean) : [];
  });

  /** Create: optional first image used for AI + primary gallery slot */
  const [aiImageFile, setAiImageFile] = React.useState<File | null>(null);
  /** Create: up to 4 more when AI image set, else up to 5 total */
  const [extraImages, setExtraImages] = React.useState<File[]>([]);
  /** Edit: new files to replace gallery */
  const [images, setImages] = React.useState<File[]>([]);
  const [videoFile, setVideoFile] = React.useState<File | null>(null);
  const [existingImages, setExistingImages] = React.useState<string[]>(
    initial?.images ?? []
  );

  const [aiLanguage, setAiLanguage] = React.useState<"en" | "so">("en");
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);
  const [aiFilled, setAiFilled] = React.useState(false);

  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);
  const [planUsage, setPlanUsage] = React.useState<PlanPayload | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    apiFetch<PlanPayload>("/api/vendor/plan", { token })
      .then((d) => {
        if (!cancelled) setPlanUsage(d);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const aiExhausted =
    planUsage != null &&
    ((planUsage.limits.maxAiDaily != null &&
      (planUsage.usage.aiGenerationsToday ?? 0) >= planUsage.limits.maxAiDaily) ||
      (planUsage.limits.maxAiDaily == null &&
        planUsage.limits.maxAiGenerations != null &&
        planUsage.usage.aiGenerations >= planUsage.limits.maxAiGenerations));

  const atProductLimit =
    mode === "create" &&
    planUsage != null &&
    planUsage.usage.products >= planUsage.limits.maxProducts;

  const aiPreviewUrl = React.useMemo(() => {
    if (!aiImageFile) return null;
    return URL.createObjectURL(aiImageFile);
  }, [aiImageFile]);

  const extraPreviews = React.useMemo(() => {
    return extraImages.map((f) => ({ url: URL.createObjectURL(f), file: f }));
  }, [extraImages]);

  const editPreviews = React.useMemo(() => {
    return images.map((f) => ({ url: URL.createObjectURL(f), file: f }));
  }, [images]);

  React.useEffect(() => {
    return () => {
      if (aiPreviewUrl) URL.revokeObjectURL(aiPreviewUrl);
    };
  }, [aiPreviewUrl]);

  React.useEffect(() => {
    return () => {
      extraPreviews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [extraPreviews]);

  React.useEffect(() => {
    return () => {
      editPreviews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [editPreviews]);

  const maxExtra = mode === "create" && aiImageFile ? 4 : 5;

  function buildCreateImageFiles(): File[] {
    const list: File[] = [];
    if (aiImageFile) list.push(aiImageFile);
    list.push(...extraImages);
    return list.slice(0, 5);
  }

  function addFeature() {
    const t = featureInput.trim();
    if (!t || features.includes(t)) return;
    if (features.length >= 20) return;
    setFeatures((f) => [...f, t]);
    setFeatureInput("");
  }

  function removeFeature(i: number) {
    setFeatures((f) => f.filter((_, j) => j !== i));
  }

  async function runAiGenerate() {
    setAiError(null);
    if (!aiImageFile) {
      setAiError("Choose one product image first.");
      return;
    }
    setAiLoading(true);
    try {
      const fd = new FormData();
      fd.append("language", aiLanguage);
      fd.append("image", aiImageFile);
      const data = await apiFetch<AiGenerateRes>("/api/ai/generate-product", {
        method: "POST",
        body: fd,
        token,
      });
      setName(data.title);
      setDescription(data.description);
      setFeatures(data.features.filter(Boolean).slice(0, 20));
      setAiFilled(true);
    } catch (e) {
      setAiFilled(false);
      setAiError(e instanceof Error ? e.message : "AI request failed");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    const parsed = schema.safeParse({
      name,
      description: description || undefined,
      category,
      price,
      old_price: oldPrice,
      location: location || undefined,
      video_url: videoUrl || undefined,
      in_stock: inStock,
    });
    if (!parsed.success) {
      setErr("Please check all required fields.");
      return;
    }

    const createFiles = mode === "create" ? buildCreateImageFiles() : [];
    if (
      mode === "create" &&
      createFiles.length === 0 &&
      existingImages.length === 0
    ) {
      setErr("Add at least one product image (AI image and/or additional).");
      return;
    }
    if (mode === "edit" && images.length === 0 && existingImages.length === 0) {
      setErr("Add at least one product image.");
      return;
    }

    const fd = new FormData();
    fd.append("name", parsed.data.name);
    fd.append("description", parsed.data.description ?? "");
    fd.append("category", parsed.data.category);
    fd.append("price", String(parsed.data.price));
    if (parsed.data.old_price != null) {
      fd.append("old_price", String(parsed.data.old_price));
    }
    fd.append("in_stock", parsed.data.in_stock ? "true" : "false");
    if (parsed.data.location) fd.append("location", parsed.data.location);
    if (parsed.data.video_url) fd.append("video_url", parsed.data.video_url);
    fd.append("features", JSON.stringify(features));

    if (mode === "create") {
      createFiles.forEach((f) => fd.append("images", f));
    } else {
      images.forEach((f) => fd.append("images", f));
    }
    if (videoFile) fd.append("video", videoFile);

    setBusy(true);
    try {
      if (mode === "create") {
        await apiFetch("/api/vendor/products", {
          method: "POST",
          body: fd,
          token,
        });
        setOk("Product created.");
      } else if (initial?.id) {
        await apiFetch(`/api/vendor/products/${initial.id}`, {
          method: "PATCH",
          body: fd,
          token,
        });
        setOk("Product updated.");
      }
      onSuccess();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {atProductLimit ? (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-foreground">
          You have reached your product limit for your plan.{" "}
          <Link href="/dashboard/plan" className="font-semibold text-primary underline">
            Upgrade
          </Link>{" "}
          to continue.
        </p>
      ) : null}
      {err ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {err}
        </p>
      ) : null}
      {ok ? (
        <p className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
          {ok}
        </p>
      ) : null}

      {mode === "create" ? (
        <section className="rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/[0.06] to-card p-6 shadow-sm dark:from-primary/10">
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="size-5 text-primary" aria-hidden />
            <h2 className="font-heading text-lg font-semibold">
              AI product assistant
            </h2>
            <Badge variant="secondary" className="font-medium">
              Optional
            </Badge>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Upload one clear photo. Choose output language for AI copy. We
            suggest a title, description, and features—you can edit everything.
            The same image becomes your first gallery photo.
          </p>
          {aiExhausted ? (
            <p className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
              AI usage for your plan is exhausted.{" "}
              <Link
                href="/dashboard/plan"
                className="font-semibold text-primary underline"
              >
                Upgrade to Premium
              </Link>{" "}
              for unlimited AI.
            </p>
          ) : null}

          <div className="mt-6 max-w-xs space-y-2">
            <label className="text-sm font-medium" htmlFor="ai-language">
              AI language
            </label>
            <select
              id="ai-language"
              className="flex h-12 w-full rounded-2xl border border-input bg-background px-3 text-sm font-medium shadow-sm"
              value={aiLanguage}
              disabled={aiLoading}
              onChange={(e) =>
                setAiLanguage(e.target.value === "so" ? "so" : "en")
              }
            >
              <option value="en">English</option>
              <option value="so">Somali (Soomaali)</option>
            </select>
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-2">
              <span className="text-sm font-medium">Image for AI (1 file)</span>
              <p className="text-xs text-muted-foreground">
                Use <strong>JPEG, PNG, GIF, or WebP</strong>. iPhone HEIC: export as
                JPEG first (or change Camera → Formats → Most Compatible).
              </p>
              <Input
                type="file"
                accept="image/*"
                className="cursor-pointer rounded-2xl"
                disabled={aiLoading}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setAiImageFile(f);
                  setAiFilled(false);
                  setAiError(null);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="rounded-2xl"
                disabled={aiLoading || !aiImageFile || aiExhausted}
                onClick={() => void runAiGenerate()}
              >
                {aiLoading ? (
                  <>
                    <Spinner className="mr-2 size-4" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 size-4" />
                    Generate with AI
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl"
                disabled={aiLoading || !aiImageFile || aiExhausted}
                onClick={() => void runAiGenerate()}
              >
                Regenerate
              </Button>
            </div>
          </div>

          {aiError ? (
            <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {aiError}
            </p>
          ) : null}

          {aiPreviewUrl ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                AI source preview
              </p>
              <div className="relative h-40 w-full max-w-xs overflow-hidden rounded-xl border border-border/80 bg-muted sm:h-44">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={aiPreviewUrl}
                  alt=""
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Product info
            </h2>
            {aiFilled && mode === "create" ? (
              <Badge variant="success" className="text-[10px] uppercase">
                AI-generated
              </Badge>
            ) : null}
          </div>
          <label className="space-y-2">
            <span className="text-sm font-medium">Product title</span>
            <Input
              className="h-12 rounded-2xl"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Category</span>
            <select
              className="flex h-12 w-full rounded-2xl border border-input bg-background px-3 text-sm font-medium shadow-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Description</span>
            <textarea
              className="min-h-[140px] w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your product…"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Location (optional)</span>
            <Input
              className="h-12 rounded-2xl"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City or area"
            />
          </label>
        </div>

        <div className="space-y-4">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Pricing
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Price</span>
              <Input
                className="h-12 rounded-2xl"
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Old price (optional)</span>
              <Input
                className="h-12 rounded-2xl"
                type="number"
                min={0}
                step="0.01"
                value={oldPrice}
                onChange={(e) => setOldPrice(e.target.value)}
              />
            </label>
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border/80 bg-muted/20 px-4 py-3">
            <input
              type="checkbox"
              className="size-4 rounded border-input"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
            />
            <span className="text-sm font-medium">In stock</span>
          </label>

          <h2 className="pt-2 font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Features (optional)
          </h2>
          <div className="flex flex-wrap gap-2">
            {features.map((f, i) => (
              <button
                key={`${f}-${i}`}
                type="button"
                className="rounded-full bg-muted px-3 py-1 text-xs font-medium hover:bg-muted/80"
                onClick={() => removeFeature(i)}
              >
                {f} ×
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              className="h-11 rounded-2xl"
              value={featureInput}
              onChange={(e) => setFeatureInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addFeature();
                }
              }}
              placeholder="Add a feature, press Enter"
            />
            <Button
              type="button"
              variant="secondary"
              className="rounded-2xl"
              onClick={addFeature}
            >
              Add
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Media
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <p className="text-sm font-medium">
              {mode === "create"
                ? "Additional images (max 4)"
                : `Images (max 5)`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {mode === "create"
                ? aiImageFile
                  ? "These appear after your AI image in the gallery. Max 5 images total."
                  : "Up to 5 images. Use the AI section above to set a primary photo and auto-fill copy."
                : "Upload new images to replace all current images."}
            </p>
            <Input
              type="file"
              accept="image/*"
              multiple
              className="mt-3 cursor-pointer rounded-2xl"
              onChange={(e) => {
                const list = e.target.files;
                if (!list) return;
                if (mode === "create") {
                  setExtraImages(Array.from(list).slice(0, maxExtra));
                } else {
                  setImages(Array.from(list).slice(0, 5));
                }
              }}
            />
            {mode === "edit" &&
            existingImages.length > 0 &&
            images.length === 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {existingImages.slice(0, 5).map((url) => (
                  <div
                    key={url}
                    className="relative aspect-square overflow-hidden rounded-xl bg-muted"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : null}
            {mode === "create" && extraPreviews.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {extraPreviews.map((p) => (
                  <div
                    key={p.url}
                    className="relative aspect-square overflow-hidden rounded-xl bg-muted"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : null}
            {mode === "edit" && editPreviews.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {editPreviews.map((p) => (
                  <div
                    key={p.url}
                    className="relative aspect-square overflow-hidden rounded-xl bg-muted"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <p className="text-sm font-medium">Video (optional)</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload a short clip or paste a URL below.
            </p>
            <Input
              type="file"
              accept="video/*"
              className="mt-3 cursor-pointer rounded-2xl"
              onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            />
            <label className="mt-4 block space-y-2">
              <span className="text-sm font-medium">Or video URL</span>
              <Input
                className="h-12 rounded-2xl"
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://…"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          className="rounded-2xl px-8"
          size="lg"
          disabled={busy || aiLoading || atProductLimit}
        >
          {busy ? (
            <>
              <Spinner className="mr-2 size-4" />
              Saving…
            </>
          ) : mode === "create" ? (
            "Publish product"
          ) : (
            "Save changes"
          )}
        </Button>
        <Button variant="outline" className="rounded-2xl" asChild>
          <Link href="/dashboard/products">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
