/**
 * imageCache.ts
 * src/lib/imageCache.ts
 *
 * Shared authenticated-image blob cache. Chat images are served from
 * endpoints that require a Bearer token, so they can't be used directly as
 * an <img src>  — this fetches them once, turns them into an object URL,
 * and caches the result by path so the same image is never re-fetched.
 */
import { API_BASE } from "@/lib/apiClient";

const blobCache = new Map<string, string>();
const inFlight = new Map<string, Promise<string>>();

/** Synchronous cache lookup — use to skip the loading state entirely for images already fetched. */
export function getCachedBlobUrl(imagePath: string): string | undefined {
  return blobCache.get(imagePath);
}

export async function toAuthenticatedBlobUrl(imagePath: string, token: string): Promise<string> {
  if (blobCache.has(imagePath)) return blobCache.get(imagePath)!;
  const existing = inFlight.get(imagePath);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const res = await fetch(`${API_BASE}${imagePath}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return "";
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      blobCache.set(imagePath, url);
      return url;
    } catch {
      // A failed image fetch (network hiccup, CORS, etc.) shouldn't take down
      // the whole chat response — fall back to no resolved image for this one.
      return "";
    } finally {
      inFlight.delete(imagePath);
    }
  })();

  inFlight.set(imagePath, promise);
  return promise;
}
