import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { wijzigRapportageStatus } from '../../actions'

export default async function RapportageDetailPage({
  params,
}: {
  params: Promise<{ id: string; rapportageId: string }>
}) {
  const { id, rapportageId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: zaak } = await supabase.from('zaken').select('naam_betrokkene').eq('id', id).single()
  const { data: rapportage } = await supabase
    .from('rapportages')
    .select('*')
    .eq('id', rapportageId)
    .single()

  if (!rapportage) {
    return (
      <>
        <Header userEmail={user?.email} />
        <main className="flex flex-col items-center justify-center gap-4 p-8">
          <p>Rapportage niet gevonden.</p>
          <Link href={`/zaken/${id}/rapportages`} className="text-sm underline">
            Terug naar rapportages
          </Link>
        </main>
      </>
    )
  }

  const volgendeStatus = rapportage.status === 'definitief' ? 'concept' : 'definitief'

  return (
    <>
      <Header userEmail={user?.email} />
      <main className="flex flex-col items-center gap-6 p-8">
        <div className="w-full max-w-3xl">
          <Link href={`/zaken/${id}/rapportages`} className="text-sm underline">
            ← Alle rapportages
          </Link>
          <div className="mt-2 flex items-center justify-between">
            <h1 className="text-xl font-semibold">
              Rapportage — {zaak?.naam_betrokkene}{' '}
              <span className="text-sm font-normal text-zinc-500">
                (
                {new Date(rapportage.created_at).toLocaleString('nl-NL', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
                )
              </span>
            </h1>
            <div className="flex items-center gap-2">
              <a
                href={`/zaken/${id}/rapportages/${rapportageId}/docx`}
                className="rounded bg-zinc-900 px-2 py-1 text-xs text-white hover:bg-zinc-700"
              >
                Download als Word
              </a>
              <form action={wijzigRapportageStatus}>
                <input type="hidden" name="zaak_id" value={id} />
                <input type="hidden" name="rapportage_id" value={rapportageId} />
                <input type="hidden" name="status" value={volgendeStatus} />
                <button
                  type="submit"
                  className={`rounded px-2 py-1 text-xs ${
                    rapportage.status === 'definitief'
                      ? 'bg-green-50 text-green-700 hover:bg-green-100'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {rapportage.status} — markeer als {volgendeStatus}
                </button>
              </form>
            </div>
          </div>
        </div>

        {rapportage.extra_context && (
          <div className="w-full max-w-3xl rounded-md bg-amber-50 p-4 text-sm text-amber-900">
            <p className="mb-1 font-medium">Extra informatie meegegeven bij deze versie:</p>
            <p className="whitespace-pre-wrap">{rapportage.extra_context}</p>
          </div>
        )}

        <article className="prose prose-sm w-full max-w-3xl rounded-md border border-zinc-200 p-6">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{rapportage.inhoud}</ReactMarkdown>
        </article>
      </main>
    </>
  )
}
