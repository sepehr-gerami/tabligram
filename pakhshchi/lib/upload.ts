// فقط سمت سرور. خواندن بدنهٔ درخواست با سقف حجم سخت‌گیرانه.
// اگر بدنه از سقف بزرگ‌تر شود، خواندن همان لحظه قطع می‌شود و null برمی‌گردد (نه فقط بر اساس هدر Content-Length).

export async function readBodyCapped(req: Request, maxBytes: number): Promise<Buffer | null> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > maxBytes) return null;
  if (!req.body) return null;

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks, total);
}