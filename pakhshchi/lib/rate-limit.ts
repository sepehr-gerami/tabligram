// محدودکنندهٔ نرخ درخواست، در حافظهٔ پروسه.
// مناسب توسعه و یک سرور واحد است. اگر چند instance اجرا شود، باید به Redis یا جدول دیتابیس منتقل شود.

interface Bucket { count: number; resetAt: number }

const g = globalThis as unknown as { __tabligramRate?: Map<string, Bucket> };
const buckets: Map<string, Bucket> = (g.__tabligramRate ??= new Map());

function sweep(now: number) {
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

/** یک تلاش را می‌شمارد. اگر از سقف گذشت، ok=false و زمان انتظار برمی‌گردد. */
export function hit(key: string, limit: number, windowMs: number, now = Date.now()) {
  if (buckets.size > 5000) sweep(now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  b.count += 1;
  if (b.count > limit) return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  return { ok: true, retryAfterSec: 0 };
}

export function reset(key: string) {
  buckets.delete(key);
}
