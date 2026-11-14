import { supabase } from "./supabase";

type StorageBucket = "incident-evidence" | "id-photos";

interface CachedUrl {
  url: string;
  expiresAt: number;
}

const SIGNED_URL_TTL_MS = 55 * 60 * 1000;
const MAX_CACHED_URLS = 200;
const signedUrlCache = new Map<string, CachedUrl>();
const inFlightRequests = new Map<string, Promise<string>>();

export async function getCachedSignedStorageUrl(
  bucket: StorageBucket,
  path: string,
): Promise<string> {
  const key = `${bucket}:${path}`;
  const now = Date.now();
  const cached = signedUrlCache.get(key);
  if (cached && cached.expiresAt > now) {
    signedUrlCache.delete(key);
    signedUrlCache.set(key, cached);
    return cached.url;
  }
  if (cached) signedUrlCache.delete(key);

  const inFlight = inFlightRequests.get(key);
  if (inFlight) return inFlight;

  const request = supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60)
    .then(({ data, error }) => {
      if (error) {
        throw new Error(
          `Could not create a signed URL for ${bucket}/${path}: ${error.message}`,
        );
      }

      const currentTime = Date.now();
      for (const [cachedKey, value] of signedUrlCache) {
        if (value.expiresAt <= currentTime) signedUrlCache.delete(cachedKey);
      }
      while (signedUrlCache.size >= MAX_CACHED_URLS) {
        const oldestKey = signedUrlCache.keys().next().value;
        if (oldestKey === undefined) break;
        signedUrlCache.delete(oldestKey);
      }
      signedUrlCache.set(key, {
        url: data.signedUrl,
        expiresAt: currentTime + SIGNED_URL_TTL_MS,
      });
      return data.signedUrl;
    })
    .finally(() => {
      inFlightRequests.delete(key);
    });

  inFlightRequests.set(key, request);
  return request;
}
