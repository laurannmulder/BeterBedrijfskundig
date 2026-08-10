import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from './actions'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <Image src="/logo.svg" alt="BeterBedrijfskundig" width={205} height={50} priority />
      <p className="text-zinc-600">Ingelogd als {user?.email}</p>
      <Link href="/zaken" className="text-sm underline">
        Zaken
      </Link>
      <Link href="/admin/gebruikers" className="text-sm underline">
        Gebruikers uitnodigen
      </Link>
      <form action={signOut}>
        <button type="submit" className="text-sm text-zinc-500 underline">
          Uitloggen
        </button>
      </form>
    </main>
  )
}
