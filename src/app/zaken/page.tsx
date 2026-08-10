import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function ZakenPage() {
  const supabase = await createClient()
  const { data: zaken } = await supabase
    .from('zaken')
    .select('id, naam_betrokkene, dossiernummer, ongevalsdatum')
    .order('created_at', { ascending: false })

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <h1 className="text-xl font-semibold">Zaken</h1>
      <Link href="/zaken/nieuw" className="rounded-md bg-black px-4 py-2 text-white hover:bg-neutral-800">
        Nieuwe zaak
      </Link>

      <ul className="flex w-full max-w-xl flex-col gap-2">
        {zaken?.map((zaak) => (
          <li key={zaak.id}>
            <Link
              href={`/zaken/${zaak.id}`}
              className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-3 hover:bg-zinc-50"
            >
              <span>{zaak.naam_betrokkene}</span>
              <span className="text-sm text-zinc-500">
                {zaak.dossiernummer ?? '—'} · ongeval {zaak.ongevalsdatum}
              </span>
            </Link>
          </li>
        ))}
        {zaken?.length === 0 && <p className="text-sm text-zinc-500">Nog geen zaken.</p>}
      </ul>

      <Link href="/" className="text-sm underline">
        Terug
      </Link>
    </main>
  )
}
