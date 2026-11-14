import Link from "next/link";

export function LogoMark({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="11" fill="#2563eb" />
      <g stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none">
        <path d="M12 20h6m0 0 6-7m-6 7 6 0m-6 0 6 7" />
      </g>
      <g fill="#fff">
        <circle cx="12" cy="20" r="3" />
        <circle cx="27" cy="13" r="2.6" />
        <circle cx="27" cy="20" r="2.6" />
        <circle cx="27" cy="27" r="2.6" />
      </g>
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5" aria-label="تبلیگرام، صفحهٔ اصلی">
      <LogoMark />
      <span className={`text-xl font-extrabold ${light ? "text-white" : "text-navy-900"}`}>تبلیگرام</span>
    </Link>
  );
}
