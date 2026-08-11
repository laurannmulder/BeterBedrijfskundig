import { setPassword } from './actions'
import { Card, inputClass } from '@/components/ui'

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Kies een wachtwoord</h1>
      <Card className="w-full max-w-sm p-6">
        <form action={setPassword} className="flex flex-col gap-3">
          <input
            name="password"
            type="password"
            placeholder="Nieuw wachtwoord"
            minLength={8}
            required
            autoComplete="new-password"
            className={inputClass}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="mt-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700"
          >
            Wachtwoord instellen
          </button>
        </form>
      </Card>
    </main>
  )
}
