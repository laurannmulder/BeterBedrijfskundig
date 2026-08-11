import Link from 'next/link'
import { vraagWachtwoordResetAan } from './actions'

export default async function WachtwoordVergetenPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; verzonden?: string }>
}) {
  const { error, verzonden } = await searchParams

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-xl font-semibold">Wachtwoord vergeten</h1>

      {verzonden ? (
        <p className="max-w-sm text-center text-sm text-zinc-600">
          Als dit e-mailadres bekend is, is er een link verstuurd om een nieuw wachtwoord in te
          stellen.
        </p>
      ) : (
        <form action={vraagWachtwoordResetAan} className="flex w-full max-w-sm flex-col gap-3">
          <input
            name="email"
            type="email"
            placeholder="E-mailadres"
            required
            autoComplete="email"
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="rounded-md bg-black px-4 py-2 text-white hover:bg-neutral-800"
          >
            Verstuur resetlink
          </button>
        </form>
      )}

      <Link href="/login" className="text-sm underline">
        Terug naar inloggen
      </Link>
    </main>
  )
}
