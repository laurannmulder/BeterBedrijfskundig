import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Badge, Card, PageHeader } from '@/components/ui'
import { wijzigRapportageExtraContext, wijzigRapportageStatus } from '../../actions'

export default async function RapportageDetailPage({
  params,
}: {
  params: Promise<{ id: string; rapportageId: string }>
}) {
  const { id, rapportageId } = await params
  const supabase = await createClient()

  const { data: zaak } = await supabase.from('zaken').select('naam_betrokkene').eq('id', id).single()
  const { data: rapportage } = await supabase
    .from('rapportages')
    .select('*')
    .eq('id', rapportageId)
    .single()

  if (!rapportage) {
    return (
      <>
        <Header />
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
      <Header />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
        <PageHeader
          backHref={`/zaken/${id}/rapportages`}
          backLabel="Alle rapportages"
          title={`Rapportage — ${zaak?.naam_betrokkene}`}
          subtitle={new Date(rapportage.created_at).toLocaleString('nl-NL', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
          actions={
            <>
              <a
                href={`/zaken/${id}/rapportages/${rapportageId}/docx`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-zinc-700"
              >
                <Download className="h-3.5 w-3.5" />
                Download als Word
              </a>
              <form action={wijzigRapportageStatus}>
                <input type="hidden" name="zaak_id" value={id} />
                <input type="hidden" name="rapportage_id" value={rapportageId} />
                <input type="hidden" name="status" value={volgendeStatus} />
                <button type="submit">
                  <Badge tone={rapportage.status === 'definitief' ? 'success' : 'neutral'}>
                    {rapportage.status} — markeer als {volgendeStatus}
                  </Badge>
                </button>
              </form>
            </>
          }
        />

        <Card className="border-amber-200 bg-amber-50 p-5">
          <p className="mb-2 text-sm font-medium text-amber-900">Extra informatie bij deze versie</p>
          <form action={wijzigRapportageExtraContext} className="flex flex-col gap-2">
            <input type="hidden" name="zaak_id" value={id} />
            <input type="hidden" name="rapportage_id" value={rapportageId} />
            <textarea
              name="extra_context"
              defaultValue={rapportage.extra_context ?? ''}
              placeholder="Geen extra informatie meegegeven bij deze versie."
              rows={3}
              className="w-full rounded-lg border border-amber-200 bg-white p-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-900/10"
            />
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-amber-800"
              >
                Opslaan
              </button>
              {rapportage.extra_context && (
                <button
                  type="submit"
                  name="verwijderen"
                  value="1"
                  className="text-xs text-amber-900 underline-offset-4 hover:text-amber-700 hover:underline"
                >
                  Verwijderen
                </button>
              )}
            </div>
          </form>
        </Card>

        <Card className="p-8">
          <article className="prose prose-sm max-w-none prose-headings:text-zinc-900 prose-h1:text-2xl">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{rapportage.inhoud}</ReactMarkdown>
          </article>
        </Card>
      </main>
    </>
  )
}
