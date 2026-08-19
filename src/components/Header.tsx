import Image from 'next/image'
import Link from 'next/link'
import { FilePlus, Users } from 'lucide-react'
import { signOut } from '@/app/actions'

export function Header({ userEmail }: { userEmail?: string }) {
  return (
    <header className="sticky top-0 z-10 flex w-full items-center justify-between gap-3 border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur-sm sm:px-6">
      <Link href="/" className="flex shrink-0 items-center">
        <Image src="/logo.svg" alt="oliver.bb" width={152} height={40} priority className="h-8 w-auto sm:h-10" />
      </Link>
      <nav className="flex items-center gap-1 text-sm">
        <Link
          href="/zaken/nieuw"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 sm:px-3"
        >
          <FilePlus className="h-4 w-4" />
          <span className="hidden sm:inline">Nieuwe zaak</span>
        </Link>
        <Link
          href="/admin/gebruikers"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 sm:px-3"
        >
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Gebruikers</span>
        </Link>
        <div className="ml-1 flex items-center gap-3 border-l border-zinc-200 pl-3 sm:ml-2 sm:pl-4">
          {userEmail && (
            <span className="hidden items-center gap-2 sm:flex">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-medium text-white">
                {userEmail[0]?.toUpperCase()}
              </span>
              <span className="text-zinc-500">{userEmail}</span>
            </span>
          )}
          <form action={signOut}>
            <button type="submit" className="text-zinc-500 transition-colors hover:text-zinc-900">
              Uitloggen
            </button>
          </form>
        </div>
      </nav>
    </header>
  )
}
