export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-baseline leading-none ${className ?? ''}`}
      style={{ fontFamily: "'Liberation Sans', Arial, Helvetica, sans-serif" }}
      role="img"
      aria-label="oliver.bb"
    >
      <span className="font-bold text-[#141414]">oliver</span>
      <span className="mx-[0.06em] mb-[0.02em] inline-block h-[0.2em] w-[0.2em] self-end rounded-full bg-[#12756A]" />
      <span className="font-normal text-[#5A6360]">bb</span>
    </span>
  )
}
