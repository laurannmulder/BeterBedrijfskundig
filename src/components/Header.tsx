import Image from 'next/image'
import Link from 'next/link'
import { signOut } from '@/app/actions'

export function Header({ userEmail }: { userEmail?: string }) {
  return (
    <header className="flex w-full items-center justify-between border-b border-zinc-200 px-6 py-3">
      <Link href="/" className="flex items-center">
        <Image src="/logo.svg" alt="BeterBedrijfskundig" width={164} height={40} priority />
      </Link>
      <nav className="flex items-center gap-4 text-sm text-zinc-600">
        <Link href="/zaken/nieuw" className="hover:text-black">
          Nieuwe zaak
        </Link>
        <Link href="/admin/gebruikers" className="hover:text-black">
          Gebruikers
        </Link>
        {userEmail && <span className="text-zinc-400">{userEmail}</span>}
        <form action={signOut}>
          <button type="submit" className="underline hover:text-black">
            Uitloggen
          </button>
        </form>
      </nav>
    </header>
  )
}
