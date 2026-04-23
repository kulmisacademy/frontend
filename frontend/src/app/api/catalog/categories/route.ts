import { NextResponse } from "next/server";
import { catalogGet } from "@/lib/catalog-upstream";

export async function GET() {
  try {
    const upstream = await catalogGet("/api/catalog/categories");
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
      console.error("[catalog categories proxy] upstream timeout");
      return NextResponse.json(
        { error: "Catalog API timed out.", categories: [] },
        { status: 504 }
      );
    }
    console.error("[catalog categories proxy]", e);
    return NextResponse.json(
      { error: "Catalog API unavailable.", categories: [] },
      { status: 502 }
    );
  }
}
