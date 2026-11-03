import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight, KeyRound, LogOut, Users } from 'lucide-react'
import { signOut } from '@/app/actions'
import { Header } from '@/components/Header'
import { Badge, Card } from '@/components/ui'
import { huidigeGebruiker } from '@/lib/gebruiker'
import { createClient } from '@/lib/supabase/server'

function Sectie({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{titel}</h2>
      <Card className="divide-y divide-zinc-100">{children}</Card>
    </section>
  )
}

const rijClass = 'flex items-center justify-between gap-4 px-5 py-4 text-sm'
const actieRijClass = `${rijClass} transition-colors hover:bg-zinc-50`

export default async function ProfielPage() {
  const gebruiker = await huidigeGebruiker()
  if (!gebruiker) redirect('/login')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const lidSinds = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('nl-NL', { dateStyle: 'long' })
    : 'onbekend'

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8 sm:px-8">
        <Card className="flex items-center gap-4 px-5 py-5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#12756A] text-xl font-semibold text-white">
            {gebruiker.email[0]?.toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-zinc-900">{gebruiker.email}</h1>
            <div className="mt-1">
              <Badge tone={gebruiker.isBeheerder ? 'success' : 'neutral'}>
                {gebruiker.isBeheerder ? 'Beheerder' : 'Medewerker'}
              </Badge>
            </div>
          </div>
        </Card>

        <Sectie titel="Account">
          <div className={rijClass}>
            <span className="text-zinc-500">E-mailadres</span>
            <span className="truncate text-zinc-900">{gebruiker.email}</span>
          </div>
          <div className={rijClass}>
            <span className="text-zinc-500">Rol</span>
            <span className="text-zinc-900">{gebruiker.isBeheerder ? 'Beheerder' : 'Medewerker'}</span>
          </div>
          <div className={rijClass}>
            <span className="text-zinc-500">Account aangemaakt</span>
            <span className="text-zinc-900">{lidSinds}</span>
          </div>
        </Sectie>

        <Sectie titel="Beveiliging">
          <Link href="/wachtwoord-instellen" className={actieRijClass}>
            <span className="flex items-center gap-3 text-zinc-900">
              <KeyRound className="h-4 w-4 text-zinc-400" />
              Wachtwoord wijzigen
            </span>
            <ChevronRight className="h-4 w-4 text-zinc-300" />
          </Link>
        </Sectie>

        {gebruiker.isBeheerder && (
          <Sectie titel="Instellingen">
            <Link href="/admin/gebruikers" className={actieRijClass}>
              <span className="flex items-center gap-3 text-zinc-900">
                <Users className="h-4 w-4 text-zinc-400" />
                Gebruikers beheren en uitnodigen
              </span>
              <ChevronRight className="h-4 w-4 text-zinc-300" />
            </Link>
          </Sectie>
        )}

        <form action={signOut}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50"
          >
            <LogOut className="h-4 w-4 text-zinc-500" />
            Uitloggen
          </button>
        </form>
      </main>
    </>
  )
}
