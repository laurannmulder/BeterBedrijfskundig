'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Archive, FolderOpen } from 'lucide-react'

const ITEMS = [
  { href: '/', label: 'Lopende zaken', Icon: FolderOpen },
  { href: '/afgesloten', label: 'Afgesloten zaken', Icon: Archive },
]

// Aparte client component omdat de actieve stand uit de URL komt
// (usePathname) — de rest van de header blijft een servercomponent.
export function HeaderNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1" aria-label="Hoofdnavigatie">
      {ITEMS.map(({ href, label, Icon }) => {
        const actief = pathname === href
        return (
          <Link
            key={href}
            href={href}
            aria-current={actief ? 'page' : undefined}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              actief ? 'bg-[#12756A]/10 text-[#0f5f57]' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
