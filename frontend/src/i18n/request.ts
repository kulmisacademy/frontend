import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return (
    v !== null &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    Object.getPrototypeOf(v) === Object.prototype
  );
}

/** Non-locale keys fall back to English so missing Somali strings never break the UI. */
function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> {
  const keys = new Set([...Object.keys(base), ...Object.keys(override)]);
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    const av = base[key];
    const bv = override[key];
    if (bv === undefined) {
      out[key] = av;
    } else if (av === undefined) {
      out[key] = bv;
    } else if (isPlainObject(av) && isPlainObject(bv)) {
      out[key] = deepMerge(av, bv);
    } else {
      out[key] = bv;
    }
  }
  return out;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const en = (await import("../messages/en.json")).default as Record<
    string,
    unknown
  >;

  const messages =
    locale === "en"
      ? en
      : deepMerge(
          en,
          (await import(`../messages/${locale}.json`)).default as Record<
            string,
            unknown
          >
        );

  return {
    locale,
    messages,
  };
});
