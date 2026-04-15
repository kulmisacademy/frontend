import { NextResponse } from "next/server";
import { catalogGet } from "@/lib/catalog-upstream";

type RouteContext = { params: Promise<{ id: string }> };

/** Proxies to the Express catalog API (same-origin from the browser). */
export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const upstream = await catalogGet(
      `/api/catalog/products/${encodeURIComponent(id)}`
    );
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      console.error("[catalog product proxy] upstream timeout");
      return NextResponse.json(
        { error: "Catalog API timed out — check backend and database." },
        { status: 504 }
      );
    }
    console.error("[catalog product proxy]", e);
    return NextResponse.json(
      { error: "Catalog API unavailable — is the backend running on port 4000?" },
      { status: 502 }
    );
  }
}
