type RateLimitEntry = {count: number; expiresAt: number};

declare global {
  // `var` is required for a shared global declaration across Next.js reloads.
  var vitinhoRateLimits: Map<string, RateLimitEntry> | undefined;
}

const entries = globalThis.vitinhoRateLimits ?? new Map<string, RateLimitEntry>();
globalThis.vitinhoRateLimits = entries;

export function requestIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'local';
}

export function rateLimited(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = entries.get(key);

  if (!current || current.expiresAt <= now) {
    entries.set(key, {count: 1, expiresAt: now + windowMs});
    return false;
  }

  current.count += 1;

  if (entries.size > 5_000) {
    for (const [entryKey, entry] of entries) {
      if (entry.expiresAt <= now) entries.delete(entryKey);
    }
  }

  return current.count > limit;
}

export function clearRateLimit(key: string) {
  entries.delete(key);
}
