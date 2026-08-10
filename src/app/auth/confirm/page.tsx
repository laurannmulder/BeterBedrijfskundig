import { confirmInvite } from './actions'

export default async function ConfirmInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>
}) {
  const { token_hash, type, next } = await searchParams

  if (!token_hash || !type) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <p className="text-red-600">Uitnodigingslink is ongeldig of verlopen.</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-xl font-semibold">Uitnodiging bevestigen</h1>
      <p className="max-w-sm text-center text-sm text-zinc-600">
        Klik op de knop om je uitnodiging voor BeterBedrijfskundig te bevestigen.
      </p>
      <form action={confirmInvite} className="flex flex-col items-center gap-3">
        <input type="hidden" name="token_hash" value={token_hash} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="next" value={next ?? '/wachtwoord-instellen'} />
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-white hover:bg-neutral-800"
        >
          Uitnodiging bevestigen
        </button>
      </form>
    </main>
  )
}
