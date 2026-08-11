import Link from 'next/link'
import { vraagWachtwoordResetAan } from './actions'
import { Card, inputClass } from '@/components/ui'

export default async function WachtwoordVergetenPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; verzonden?: string }>
}) {
  const { error, verzonden } = await searchParams

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Wachtwoord vergeten</h1>

      <Card className="w-full max-w-sm p-6">
        {verzonden ? (
          <p className="text-center text-sm text-zinc-600">
            Als dit e-mailadres bekend is, is er een link verstuurd om een nieuw wachtwoord in te
            stellen.
          </p>
        ) : (
          <form action={vraagWachtwoordResetAan} className="flex flex-col gap-3">
            <input
              name="email"
              type="email"
              placeholder="E-mailadres"
              required
              autoComplete="email"
              className={inputClass}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              className="mt-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700"
            >
              Verstuur resetlink
            </button>
          </form>
        )}
      </Card>

      <Link href="/login" className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline">
        Terug naar inloggen
      </Link>
    </main>
  )
}
