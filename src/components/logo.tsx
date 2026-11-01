export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="Pickleball Finder">
      <rect x="1" y="1" width="46" height="46" rx="14" fill="#123B2C" />
      <path d="M8 34h32" stroke="#D8F26A" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 34V20a10 10 0 0 1 20 0v14" stroke="#D8F26A" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="24" cy="16" r="7" fill="#D8F26A" />
      <circle cx="21.6" cy="14.4" r="1.1" fill="#123B2C" />
      <circle cx="26.4" cy="14.4" r="1.1" fill="#123B2C" />
      <circle cx="21.6" cy="18" r="1.1" fill="#123B2C" />
      <circle cx="26.4" cy="18" r="1.1" fill="#123B2C" />
      <path d="M34 12l6-6" stroke="#FF6B4A" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark className="h-9 w-9 shrink-0" />
      <span className="leading-none">
        <span className="block font-display text-[1.05rem] font-extrabold tracking-tight text-ink">
          Pickleball Finder
        </span>
        {!compact && <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-soft">NSW discovery</span>}
      </span>
    </span>
  );
}
