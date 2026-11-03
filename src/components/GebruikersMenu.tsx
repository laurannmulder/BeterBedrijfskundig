'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, LogOut, User, Users } from 'lucide-react'
import { signOut } from '@/app/actions'

// Uitklapmenu achter het e-mailadres: profiel, instellingen (alleen
// beheerders, nu alleen gebruikersbeheer) en uitloggen. Sluit bij een klik
// ernaast, op Escape, en na het kiezen van een optie.
export function GebruikersMenu({ email, isBeheerder }: { email: string; isBeheerder: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function bijKlik(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    function bijToets(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', bijKlik)
    document.addEventListener('keydown', bijToets)
    return () => {
      document.removeEventListener('mousedown', bijKlik)
      document.removeEventListener('keydown', bijToets)
    }
  }, [open])

  const itemClass =
    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white py-1 pl-1 pr-2.5 text-sm text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#12756A] text-xs font-semibold text-white">
          {email[0]?.toUpperCase()}
        </span>
        <span className="hidden max-w-[180px] truncate sm:inline">{email}</span>
        <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg"
        >
          <div className="border-b border-zinc-100 px-3 pb-2.5 pt-2">
            <p className="truncate text-sm font-medium text-zinc-900">{email}</p>
            <p className="text-xs text-zinc-500">{isBeheerder ? 'Beheerder' : 'Medewerker'}</p>
          </div>

          <div className="py-1.5">
            <Link href="/profiel" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
              <User className="h-4 w-4 text-zinc-400" />
              Mijn profiel
            </Link>
          </div>

          {isBeheerder && (
            <div className="border-t border-zinc-100 py-1.5">
              <p className="px-3 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Instellingen
              </p>
              <Link href="/admin/gebruikers" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
                <Users className="h-4 w-4 text-zinc-400" />
                Gebruikers
              </Link>
            </div>
          )}

          <div className="border-t border-zinc-100 pt-1.5">
            <form action={signOut}>
              <button type="submit" role="menuitem" className={itemClass}>
                <LogOut className="h-4 w-4 text-zinc-400" />
                Uitloggen
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
