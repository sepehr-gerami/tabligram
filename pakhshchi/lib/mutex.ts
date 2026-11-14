// قفل درون‌پروسه‌ای برای عملیات حساس پول.
// SQLite/Prisma تراکنش را اتمیک می‌کند، ولی دو درخواست هم‌زمان می‌توانند موجودی را
// قبل از نوشتن بخوانند. این قفل، عملیات کیف پول هر کاربر را در یک پروسه سریالی می‌کند.
// در استقرار چندنمونه‌ای باید با قفل دیتابیس/Redis جایگزین شود (در مستندات ذکر شده).
const chains = new Map<string, Promise<unknown>>();

export function withKeyLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = chains.get(key) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(fn);
  const tail = run.finally(() => {
    if (chains.get(key) === tail) chains.delete(key);
  });
  chains.set(key, tail);
  return run;
}

/** فقط برای تست‌ها: پاک کردن زنجیره‌ها. */
export function resetKeyLocks(): void {
  chains.clear();
}
