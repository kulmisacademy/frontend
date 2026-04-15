import { NextRequest, NextResponse } from "next/server";
import { catalogPostJson } from "@/lib/catalog-upstream";

/** Proxies to the Express catalog API so the browser stays same-origin (avoids CORS / wrong API URL in dev). */
export async function POST(req: NextRequest) {
  let body: string;
  try {
    body = await req.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const upstream = await catalogPostJson("/api/catalog/products/batch", body);
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
      console.error("[catalog batch proxy] upstream timeout");
      return NextResponse.json(
        { error: "Catalog API timed out — check backend and database." },
        { status: 504 }
      );
    }
    console.error("[catalog batch proxy]", e);
    return NextResponse.json(
      { error: "Catalog API unavailable — is the backend running on port 4000?" },
      { status: 502 }
    );
  }
}
