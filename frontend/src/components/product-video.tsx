"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  url: string;
  className?: string;
};

function youtubeEmbedId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace(/^\//, "");
      return id || null;
    }
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const m = u.pathname.match(/\/embed\/([^/]+)/);
      if (m) return m[1] ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

export function ProductVideo({ url, className }: Props) {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const yt = youtubeEmbedId(trimmed);
  if (yt) {
    return (
      <div
        className={cn(
          "relative aspect-video w-full overflow-hidden rounded-2xl border border-border/80 bg-black shadow-sm",
          className
        )}
      >
        <iframe
          title="Product video"
          src={`https://www.youtube.com/embed/${yt}`}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/80 bg-black shadow-sm",
        className
      )}
    >
      <video
        src={trimmed}
        controls
        playsInline
        className="max-h-[min(70vh,560px)] w-full"
        preload="metadata"
      />
    </div>
  );
}
