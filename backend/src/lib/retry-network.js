/**
 * Supabase Storage (and other HTTPS calls) can fail with ECONNRESET / fetch failed
 * on flaky networks, VPNs, or brief Supabase edge issues. Retry a few times.
 */

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isTransientStorageFailure(err) {
  if (!err) return false;
  let e = err;
  for (let depth = 0; depth < 6 && e; depth++) {
    const code = e.code;
    if (
      code === "ECONNRESET" ||
      code === "ETIMEDOUT" ||
      code === "ECONNREFUSED" ||
      code === "ENOTFOUND"
    ) {
      return true;
    }
    const msg = String(e.message || "");
    if (/fetch failed|ECONNRESET|ETIMEDOUT|network/i.test(msg)) return true;
    if (e.__isStorageError && /fetch failed/i.test(msg)) return true;
    e = e.cause || e.originalError;
  }
  return false;
}

/**
 * @param {() => Promise<void>} fn - should throw on failure
 * @param {{ retries?: number, baseDelayMs?: number }} opts
 */
async function withNetworkRetries(fn, opts = {}) {
  const retries = opts.retries ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 400;
  let lastErr;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await fn();
      return;
    } catch (err) {
      lastErr = err;
      if (attempt < retries - 1 && isTransientStorageFailure(err)) {
        await sleep(baseDelayMs * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

module.exports = {
  isTransientStorageFailure,
  withNetworkRetries,
  sleep,
};
