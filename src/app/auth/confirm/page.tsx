import { confirmInvite } from './actions'
import { Card } from '@/components/ui'

export default async function ConfirmInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>
}) {
  const { token_hash, type, next } = await searchParams

  if (!token_hash || !type) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 p-8">
        <Card className="p-6">
          <p className="text-sm text-red-600">Uitnodigingslink is ongeldig of verlopen.</p>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Uitnodiging bevestigen</h1>
      <Card className="flex w-full max-w-sm flex-col items-center gap-4 p-6 text-center">
        <p className="text-sm text-zinc-600">
          Klik op de knop om je uitnodiging voor BeterBedrijfskundig te bevestigen.
        </p>
        <form action={confirmInvite} className="w-full">
          <input type="hidden" name="token_hash" value={token_hash} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="next" value={next ?? '/wachtwoord-instellen'} />
          <button
            type="submit"
            className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700"
          >
            Uitnodiging bevestigen
          </button>
        </form>
      </Card>
    </main>
  )
}
