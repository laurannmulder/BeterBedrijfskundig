export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={`leading-none tracking-tight ${className ?? ''}`}
      style={{ fontFamily: "'Liberation Sans', Arial, Helvetica, sans-serif" }}
    >
      <span className="font-bold text-[#141414]">oliver</span>
      <span className="font-bold text-[#12756A]">.</span>
      <span className="font-normal text-[#5A6360]">bb</span>
    </span>
  )
}
