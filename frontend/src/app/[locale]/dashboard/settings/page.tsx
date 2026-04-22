"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";
import {
  apiFetch,
  apiPostForm,
  VENDOR_STORE_IMAGE_MAX_BYTES,
} from "@/lib/api";
import { SOMALIA_REGIONS, capitalForRegion } from "@/lib/somalia-regions";
import { cn } from "@/lib/utils";

export default function DashboardSettingsPage() {
  const router = useRouter();
  const { user, loading, token, refreshUser } = useAuth();
  const [busy, setBusy] = React.useState(false);
  const [loadErr, setLoadErr] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  const [storeName, setStoreName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [whatsapp, setWhatsapp] = React.useState("");
  const [region, setRegion] = React.useState(SOMALIA_REGIONS[0] ?? "");
  const [logo, setLogo] = React.useState<File | null>(null);
  const [banner, setBanner] = React.useState<File | null>(null);

  React.useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/dashboard/settings");
  }, [loading, user, router]);

  React.useEffect(() => {
    if (!token || user?.role !== "vendor") return;
    let cancelled = false;
    (async () => {
      setLoadErr(null);
      try {
        const data = await apiFetch<{ store: Record<string, unknown> }>(
          "/api/vendor/store",
          { token }
        );
        const s = data.store as {
          store_name?: string;
          description?: string | null;
          whatsapp_phone?: string | null;
          location?: { region?: string } | null;
        };
        if (cancelled) return;
        setStoreName(s.store_name || "");
        setDescription(s.description || "");
        setWhatsapp(s.whatsapp_phone || "");
        if (s.location?.region) setRegion(s.location.region);
      } catch (e) {
        if (!cancelled) {
          setLoadErr(e instanceof Error ? e.message : "Could not load store.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, user?.role]);

  const capital = React.useMemo(() => capitalForRegion(region), [region]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      if (logo && logo.size > VENDOR_STORE_IMAGE_MAX_BYTES) {
        throw new Error(
          `Logo must be ${VENDOR_STORE_IMAGE_MAX_BYTES / (1024 * 1024)} MB or smaller.`
        );
      }
      if (banner && banner.size > VENDOR_STORE_IMAGE_MAX_BYTES) {
        throw new Error(
          `Banner must be ${VENDOR_STORE_IMAGE_MAX_BYTES / (1024 * 1024)} MB or smaller.`
        );
      }

      const fd = new FormData();
      fd.append("store_name", storeName);
      fd.append("description", description);
      fd.append("whatsapp_phone", whatsapp);
      fd.append("country", "Somalia");
      fd.append("region", region);
      fd.append("city", capital);
      if (logo) fd.append("logo", logo);
      if (banner) fd.append("banner", banner);

      await apiPostForm<{ store: Record<string, unknown> }>(
        "/api/vendor/store",
        fd,
        { token }
      );

      setOk("Store updated.");
      setLogo(null);
      setBanner(null);
      await refreshUser();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center py-20">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">
            Store settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update branding, description, location, and WhatsApp.
          </p>
        </div>
        <Button variant="outline" className="rounded-2xl" asChild>
          <Link href="/dashboard">Back to overview</Link>
        </Button>
      </div>

      {loadErr ? (
        <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadErr}
        </p>
      ) : null}
      {err ? (
        <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {err}
        </p>
      ) : null}
      {ok ? (
        <p className="mt-4 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
          {ok}
        </p>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="mt-8 max-w-xl space-y-4 rounded-2xl border border-border/80 bg-card p-6 shadow-sm"
      >
        <label className="space-y-2">
          <span className="text-sm font-medium">Store name</span>
          <Input
            className="rounded-2xl"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            required
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Description</span>
          <textarea
            className={cn(
              "min-h-[100px] w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm shadow-sm"
            )}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">WhatsApp number</span>
          <Input
            className="rounded-2xl"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="+252…"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Region</span>
          <select
            className="h-12 w-full rounded-2xl border border-input bg-background px-3 text-sm font-medium"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            {SOMALIA_REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Capital</span>
          <Input className="rounded-2xl bg-muted/50" value={capital} readOnly />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">New logo (optional)</span>
          <span className="block text-xs text-muted-foreground">
            Max 5 MB. Resize large images before uploading.
          </span>
          <Input
            type="file"
            accept="image/*"
            className="rounded-2xl"
            onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Banner image (optional)</span>
          <span className="block text-xs text-muted-foreground">
            Max 5 MB. Very large files may fail if your host limits request size.
          </span>
          <Input
            type="file"
            accept="image/*"
            className="rounded-2xl"
            onChange={(e) => setBanner(e.target.files?.[0] ?? null)}
          />
        </label>
        <Button type="submit" className="rounded-2xl" disabled={busy}>
          {busy ? <Spinner className="size-4" /> : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
