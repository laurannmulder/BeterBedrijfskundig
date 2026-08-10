import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'

export default async function RapportagesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: zaak } = await supabase.from('zaken').select('naam_betrokkene').eq('id', id).single()
  const { data: rapportages } = await supabase
    .from('rapportages')
    .select('id, status, extra_context, created_at')
    .eq('zaak_id', id)
    .order('created_at', { ascending: false })

  return (
    <>
      <Header userEmail={user?.email} />
      <main className="flex flex-col items-center gap-6 p-8">
        <div className="w-full max-w-2xl">
          <Link href={`/zaken/${id}`} className="text-sm underline">
            ← Terug naar zaak
          </Link>
          <h1 className="mt-2 text-xl font-semibold">Rapportages — {zaak?.naam_betrokkene}</h1>
        </div>

        <ul className="flex w-full max-w-2xl flex-col gap-2">
          {rapportages?.map((r) => (
            <li key={r.id}>
              <Link
                href={`/zaken/${id}/rapportages/${r.id}`}
                className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-3 hover:bg-zinc-50"
              >
                <span className="flex flex-col">
                  <span className="text-sm">
                    {new Date(r.created_at).toLocaleString('nl-NL', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                  {r.extra_context && (
                    <span className="mt-0.5 max-w-md truncate text-xs text-zinc-500" title={r.extra_context}>
                      {r.extra_context}
                    </span>
                  )}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-xs ${
                    r.status === 'definitief' ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-500'
                  }`}
                >
                  {r.status}
                </span>
              </Link>
            </li>
          ))}
          {rapportages?.length === 0 && <p className="text-sm text-zinc-500">Nog geen rapportages gegenereerd.</p>}
        </ul>
      </main>
    </>
  )
}
