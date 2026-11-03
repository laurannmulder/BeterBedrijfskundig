import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { HeaderNav } from '@/components/HeaderNav'
import { GebruikersMenu } from '@/components/GebruikersMenu'
import { huidigeGebruiker } from '@/lib/gebruiker'

// Haalt de gebruiker zelf op, zodat elke pagina hem alleen als <Header />
// hoeft te renderen en het beheerdersvinkje niet door de hele boom hoeft.
// Op smalle schermen zakt de navigatie naar een eigen rij onder het logo.
export async function Header() {
  const gebruiker = await huidigeGebruiker()

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex shrink-0 items-center" aria-label="Naar lopende zaken">
            <Logo className="text-xl" />
          </Link>
          <div className="hidden sm:block">
            <HeaderNav />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/zaken/nieuw"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#12756A] px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#0f5f57]"
          >
            <Plus className="h-4 w-4" />
            <span>Nieuwe zaak</span>
          </Link>
          {gebruiker?.email && <GebruikersMenu email={gebruiker.email} isBeheerder={gebruiker.isBeheerder} />}
        </div>

        <div className="-mx-1 w-full overflow-x-auto sm:hidden">
          <HeaderNav />
        </div>
      </div>
    </header>
  )
}
