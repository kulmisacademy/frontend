import { NextResponse } from "next/server";
import { catalogGet } from "@/lib/catalog-upstream";

/** Proxies to the Express catalog API (same-origin from the browser). */
export async function GET() {
  try {
    const upstream = await catalogGet("/api/catalog/stores");
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
      console.error("[catalog stores proxy] upstream timeout");
      return NextResponse.json(
        { error: "Catalog API timed out — check backend and database." },
        { status: 504 }
      );
    }
    console.error("[catalog stores proxy]", e);
    return NextResponse.json(
      { error: "Catalog API unavailable — is the backend running on port 4000?" },
      { status: 502 }
    );
  }
}
