'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'

export function InfoTooltip({ tekst }: { tekst: string }) {
  const [open, setOpen] = useState(false)

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        aria-label="Meer informatie"
        className="flex h-4 w-4 items-center justify-center rounded-full text-zinc-400 transition-colors hover:text-zinc-700"
      >
        <Info className="h-4 w-4" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-0 top-full z-10 mt-1.5 w-64 rounded-lg border border-zinc-200 bg-white p-2.5 text-xs leading-relaxed text-zinc-600 shadow-lg"
        >
          {tekst}
        </span>
      )}
    </span>
  )
}
