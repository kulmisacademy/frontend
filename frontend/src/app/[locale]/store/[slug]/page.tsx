import { notFound } from "next/navigation";
import { getApiBaseUrl, SERVER_FETCH_TIMEOUT_MS } from "@/lib/api";
import type {
  ApiProductPublic,
  ApiStorePublic,
  StoreReviewPublic,
} from "@/lib/map-api-product";
import { StoreProfileClient } from "./store-profile-client";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

async function fetchApiStore(slug: string) {
  try {
    const res = await fetch(
      `${getApiBaseUrl()}/api/stores/public/${encodeURIComponent(slug)}`,
      {
        next: { revalidate: 30 },
        signal: AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS),
      }
    );
    if (!res.ok) return null;
    return res.json() as Promise<{
      store: ApiStorePublic;
      products: ApiProductPublic[];
      reviews: StoreReviewPublic[];
    }>;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const api = await fetchApiStore(slug);
  if (!api?.store) return { title: "Store" };
  return {
    title: api.store.store_name,
    description: `Shop ${api.store.store_name} on LAAS24`,
  };
}

export default async function StorePage({ params }: Props) {
  const { slug } = await params;
  const api = await fetchApiStore(slug);
  if (!api?.store) notFound();
  return <StoreProfileClient api={api} />;
}
