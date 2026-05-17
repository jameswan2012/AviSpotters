export function getClientIpFromHeaders(headers: Headers): string | null {
  // Prefer X-Forwarded-For (first IP)
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xr = headers.get("x-real-ip");
  if (xr && xr.trim()) return xr.trim();
  const cf = headers.get("cf-connecting-ip");
  if (cf && cf.trim()) return cf.trim();
  return null;
}

