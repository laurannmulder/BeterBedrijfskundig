import Link from 'next/link'
import { CheckCircle2, Circle, ExternalLink, FileText, Paperclip } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  DOCUMENT_LABELS,
  ONDERNEMING_DOCUMENT_VOLGORDE,
  RECHTSVORM_LABELS,
  type DocumentType,
  type Rechtsvorm,
} from '@/lib/documenten/vereisten'
import { Header } from '@/components/Header'
import { Badge, Card, LinkButton, PageHeader, fileInputClass, inputClass, labelClass } from '@/components/ui'
import { uploadDocument, genereerRapportage } from './actions'
import { GenereerKnop } from './genereer-knop'

interface DocumentRow {
  id: string
  onderneming_id: string | null
  type: DocumentType
  jaar: number | null
  verplicht: boolean
  status: 'ontbreekt' | 'geupload' | 'gecontroleerd'
  storage_path: string | null
}

async function DocumentRij({ zaakId, doc }: { zaakId: string; doc: DocumentRow }) {
  const isOverig = doc.type === 'overig'
  const isGeupload = doc.status !== 'ontbreekt'
  const bestandsnaam = doc.storage_path?.split('/').pop() ?? null
  const label = isOverig ? DOCUMENT_LABELS.overig : DOCUMENT_LABELS[doc.type] + (doc.jaar ? ` ${doc.jaar}` : '')

  let bekijkUrl: string | null = null
  if (isGeupload && doc.storage_path) {
    const supabase = await createClient()
    const { data } = await supabase.storage.from('documenten').createSignedUrl(doc.storage_path, 600)
    bekijkUrl = data?.signedUrl ?? null
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {isGeupload ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
        ) : (
          <Circle className={`h-4 w-4 shrink-0 ${doc.verplicht ? 'text-red-400' : 'text-zinc-300'}`} />
        )}
        <span className="truncate text-sm text-zinc-800">{label}</span>
        {!isOverig && (
          <Badge tone={doc.verplicht ? 'danger' : 'neutral'}>{doc.verplicht ? 'verplicht' : 'optioneel'}</Badge>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isGeupload &&
          bestandsnaam &&
          (bekijkUrl ? (
            <a
              href={bekijkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex max-w-[180px] items-center gap-1 truncate text-xs text-zinc-500 hover:text-zinc-900"
              title={bestandsnaam}
            >
              <span className="truncate">{bestandsnaam}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          ) : (
            <span className="max-w-[180px] truncate text-xs text-zinc-500" title={bestandsnaam}>
              {bestandsnaam}
            </span>
          ))}
        <form action={uploadDocument} className="flex items-center gap-2">
          <input type="hidden" name="document_id" value={doc.id} />
          <input type="hidden" name="zaak_id" value={zaakId} />
          <input
            type="file"
            name="file"
            accept=".pdf,.jpg,.jpeg,.png,.txt,.docx,.xlsx"
            required
            className={fileInputClass}
          />
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
          >
            {isGeupload ? 'Vervangen' : 'Uploaden'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default async function ZaakDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const { error } = await searchParams

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: zaak } = await supabase.from('zaken').select('*').eq('id', id).single()
  const { data: ondernemingen } = await supabase
    .from('ondernemingen')
    .select('*')
    .eq('zaak_id', id)
    .order('created_at')
  const { data: documenten } = await supabase
    .from('documenten')
    .select('*')
    .eq('zaak_id', id)
    .order('jaar')
  const { count: aantalRapportages } = await supabase
    .from('rapportages')
    .select('id', { count: 'exact', head: true })
    .eq('zaak_id', id)

  if (!zaak) {
    return (
      <>
        <Header userEmail={user?.email} />
        <main className="flex flex-col items-center justify-center gap-4 p-8">
          <p>Zaak niet gevonden.</p>
          <Link href="/" className="text-sm underline">
            Terug naar zaken
          </Link>
        </main>
      </>
    )
  }

  const aangifteIbDocumenten = (documenten ?? []).filter((d) => d.type === 'aangifte_ib')
  const overigeDocumenten = (documenten ?? []).filter((d) => d.type === 'overig')

  return (
    <>
      <Header userEmail={user?.email} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-8">
        <PageHeader
          backHref="/"
          backLabel="Alle zaken"
          title={zaak.naam_betrokkene}
          subtitle={`${zaak.dossiernummer ? `Dossier ${zaak.dossiernummer} · ` : ''}${zaak.ongevalsdatum ? `Ongevalsdatum ${zaak.ongevalsdatum}` : 'Ongevalsdatum onbekend'}`}
          actions={
            !!aantalRapportages && (
              <LinkButton href={`/zaken/${id}/rapportages`} variant="secondary" size="sm">
                <FileText className="h-3.5 w-3.5" />
                Rapportages ({aantalRapportages})
              </LinkButton>
            )
          }
        />

        {error && (
          <Card className="border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</Card>
        )}

        <Card className="p-6">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">Rapport genereren</h2>
          <form action={genereerRapportage} className="flex flex-col gap-4">
            <input type="hidden" name="zaak_id" value={id} />
            <label className={labelClass}>
              Extra informatie voor deze rapportage (optioneel)
              <textarea
                name="extra_context"
                rows={3}
                placeholder="Bijv. aandachtspunten, context uit een gesprek, of specifieke instructies voor deze versie."
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Extra documenten bij deze informatie (optioneel)
              <input
                type="file"
                name="extra_bestanden"
                accept=".pdf,.jpg,.jpeg,.png,.txt,.docx,.xlsx"
                multiple
                className={fileInputClass}
              />
              <span className="flex items-start gap-1.5 text-xs font-normal text-zinc-400">
                <Paperclip className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                PDF, Word, Excel, foto&apos;s/scans — meerdere tegelijk mogelijk. Deze worden ook toegevoegd aan de
                documentenlijst hieronder, bij &quot;Overige documenten&quot;.
              </span>
            </label>
            <div>
              <GenereerKnop />
            </div>
          </form>
        </Card>

        {aangifteIbDocumenten.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-zinc-900">Aangifte inkomstenbelasting (betrokkene)</h2>
            <Card className="divide-y divide-zinc-100">
              {aangifteIbDocumenten.map((doc) => (
                <DocumentRij key={doc.id} zaakId={id} doc={doc} />
              ))}
            </Card>
          </section>
        )}

        {ondernemingen?.map((onderneming) => {
          const documentenOnderneming = (documenten ?? []).filter((d) => d.onderneming_id === onderneming.id)
          const rechtsvorm = onderneming.rechtsvorm as Rechtsvorm | null

          return (
            <section key={onderneming.id} className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-zinc-900">
                {onderneming.naam}{' '}
                <span className="font-normal text-zinc-400">
                  ({rechtsvorm ? RECHTSVORM_LABELS[rechtsvorm] : 'rechtsvorm onbekend'})
                </span>
              </h2>
              {documentenOnderneming.length === 0 ? (
                <p className="text-xs text-zinc-400">
                  Nog geen documentchecklist — hiervoor zijn ongevalsdatum, rechtsvorm en oprichtingsdatum nodig.
                </p>
              ) : (
                <div className="flex flex-col gap-5">
                  {ONDERNEMING_DOCUMENT_VOLGORDE.map((type) => {
                    const documentenType = documentenOnderneming.filter((d) => d.type === type)
                    if (documentenType.length === 0) return null

                    return (
                      <div key={type} className="flex flex-col gap-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                          {DOCUMENT_LABELS[type]}
                        </h3>
                        <Card className="divide-y divide-zinc-100">
                          {documentenType.map((doc) => (
                            <DocumentRij key={doc.id} zaakId={id} doc={doc} />
                          ))}
                        </Card>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}

        {overigeDocumenten.length > 0 && (
          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Overige documenten</h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Bestanden aangeleverd via &quot;extra informatie&quot; bij het genereren van een rapportage.
              </p>
            </div>
            <Card className="divide-y divide-zinc-100">
              {overigeDocumenten.map((doc) => (
                <DocumentRij key={doc.id} zaakId={id} doc={doc} />
              ))}
            </Card>
          </section>
        )}
      </main>
    </>
  )
}
