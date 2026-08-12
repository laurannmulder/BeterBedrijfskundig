import Link from 'next/link'
import { Building2, CheckCircle2, ExternalLink, FileText, Paperclip, Trash2, UploadCloud } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  DOCUMENT_LABELS,
  ONDERNEMING_DOCUMENT_VOLGORDE,
  RECHTSVORM_LABELS,
  type DocumentType,
  type Rechtsvorm,
} from '@/lib/documenten/vereisten'
import { Header } from '@/components/Header'
import { Card, LinkButton, PageHeader, fileInputClass, inputClass, labelClass } from '@/components/ui'
import { uploadDocumenten, verwijderDocument, verwijderZaak, genereerRapportage } from './actions'
import { GenereerKnop } from './genereer-knop'
import { VerwijderZaakForm } from './verwijder-zaak-form'

const ZAAK_DOCUMENT_VOLGORDE: DocumentType[] = ['opdrachtbrief', 'aangifte_ib']

interface DocumentRow {
  id: string
  onderneming_id: string | null
  type: DocumentType
  jaar: number | null
  status: 'ontbreekt' | 'geupload' | 'gecontroleerd'
  storage_path: string | null
}

async function DocumentRij({ zaakId, doc }: { zaakId: string; doc: DocumentRow }) {
  const isOverig = doc.type === 'overig'
  const bestandsnaam = doc.storage_path?.split('/').pop() ?? null
  const label = isOverig ? DOCUMENT_LABELS.overig : DOCUMENT_LABELS[doc.type] + (doc.jaar ? ` ${doc.jaar}` : '')

  let bekijkUrl: string | null = null
  if (doc.storage_path) {
    const supabase = await createClient()
    const { data } = await supabase.storage.from('documenten').createSignedUrl(doc.storage_path, 600)
    bekijkUrl = data?.signedUrl ?? null
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
        <span className="truncate text-sm text-zinc-800">{label}</span>
      </div>

      <div className="flex items-center gap-3">
        {bestandsnaam &&
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
        <form action={verwijderDocument}>
          <input type="hidden" name="zaak_id" value={zaakId} />
          <input type="hidden" name="document_id" value={doc.id} />
          <button
            type="submit"
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Verwijderen
          </button>
        </form>
      </div>
    </div>
  )
}

function CategorieBlok({ type, documenten, zaakId }: { type: DocumentType; documenten: DocumentRow[]; zaakId: string }) {
  const documentenType = documenten.filter((d) => d.type === type)
  if (documentenType.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{DOCUMENT_LABELS[type]}</h3>
      <Card className="divide-y divide-zinc-100">
        {documentenType.map((doc) => (
          <DocumentRij key={doc.id} zaakId={zaakId} doc={doc} />
        ))}
      </Card>
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
  const { data: alleDocumenten } = await supabase
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

  // Alleen daadwerkelijk geüploade/geclassificeerde documenten tonen — er
  // worden geen lege placeholder-rijen meer aangemaakt, ook oude (vóór deze
  // wijziging vooraf berekende) lege rijen blijven zo verborgen.
  const documenten = (alleDocumenten ?? []).filter((d) => d.status === 'geupload')
  const zaakDocumenten = documenten.filter((d) => d.onderneming_id === null && d.type !== 'overig')
  const overigeDocumenten = documenten.filter((d) => d.type === 'overig')

  return (
    <>
      <Header userEmail={user?.email} />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-8 lg:flex-row lg:items-start">
        <Card className="flex w-full shrink-0 flex-col gap-4 p-5 lg:sticky lg:top-20 lg:w-64">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Zaakgegevens</h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-xs text-zinc-400">Naam betrokkene</dt>
              <dd className="text-zinc-900">{zaak.naam_betrokkene}</dd>
            </div>
            {ondernemingen?.map((onderneming) => (
              <div key={onderneming.id} className="border-t border-zinc-100 pt-3">
                <dt className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Building2 className="h-3.5 w-3.5" />
                  Onderneming
                </dt>
                <dd className="text-zinc-900">{onderneming.naam}</dd>
                <dd className="mt-1 text-xs text-zinc-500">
                  Opgericht: {onderneming.oprichtingsdatum ?? 'onbekend'}
                </dd>
                <dd className="text-xs text-zinc-500">KvK-nummer: {onderneming.kvk_nummer ?? 'onbekend'}</dd>
              </div>
            ))}
            <div className="border-t border-zinc-100 pt-3">
              <dt className="text-xs text-zinc-400">Ongevalsdatum</dt>
              <dd className="text-zinc-900">{zaak.ongevalsdatum ?? 'onbekend'}</dd>
            </div>
            <div className="border-t border-zinc-100 pt-3">
              <dt className="text-xs text-zinc-400">Verzekeraar</dt>
              <dd className="text-zinc-900">{zaak.verzekeraar_naam ?? 'onbekend'}</dd>
              {zaak.verzekeraar_contactpersoon && (
                <dd className="mt-1 text-xs text-zinc-500">{zaak.verzekeraar_contactpersoon}</dd>
              )}
              {zaak.verzekeraar_kenmerk && (
                <dd className="text-xs text-zinc-500">Kenmerk: {zaak.verzekeraar_kenmerk}</dd>
              )}
            </div>
            <div className="border-t border-zinc-100 pt-3">
              <dt className="text-xs text-zinc-400">Belangenbehartiger</dt>
              <dd className="text-zinc-900">{zaak.belangenbehartiger_bureau ?? 'onbekend'}</dd>
              {zaak.belangenbehartiger_naam && (
                <dd className="mt-1 text-xs text-zinc-500">{zaak.belangenbehartiger_naam}</dd>
              )}
              {zaak.belangenbehartiger_kenmerk && (
                <dd className="text-xs text-zinc-500">Kenmerk: {zaak.belangenbehartiger_kenmerk}</dd>
              )}
            </div>
            <div className="border-t border-zinc-100 pt-3">
              <dt className="text-xs text-zinc-400">Aangemaakt op</dt>
              <dd className="text-zinc-900">
                {new Date(zaak.created_at).toLocaleDateString('nl-NL', { dateStyle: 'medium' })}
              </dd>
            </div>
          </dl>
          <div className="border-t border-zinc-100 pt-3">
            <VerwijderZaakForm zaakId={zaak.id} naamBetrokkene={zaak.naam_betrokkene} action={verwijderZaak} />
          </div>
        </Card>

        <div className="flex min-w-0 flex-1 flex-col gap-8">
          <PageHeader
            backHref="/"
            backLabel="Alle zaken"
            title={zaak.naam_betrokkene}
            subtitle={zaak.dossiernummer ? `Dossier ${zaak.dossiernummer}` : undefined}
            actions={
              !!aantalRapportages && (
                <LinkButton href={`/zaken/${id}/rapportages`} variant="secondary" size="sm">
                  <FileText className="h-3.5 w-3.5" />
                  Rapportages ({aantalRapportages})
                </LinkButton>
              )
            }
          />

          {error && <Card className="border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</Card>}

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
                  Worden net als bij &quot;Documenten uploaden&quot; automatisch herkend en toegevoegd aan de documentenlijst.
                </span>
              </label>
              <div>
                <GenereerKnop />
              </div>
            </form>
          </Card>

          {zaakDocumenten.length > 0 && (
            <section className="flex flex-col gap-5">
              <h2 className="text-sm font-semibold text-zinc-900">Zaak</h2>
              {ZAAK_DOCUMENT_VOLGORDE.map((type) => (
                <CategorieBlok key={type} type={type} documenten={zaakDocumenten} zaakId={id} />
              ))}
            </section>
          )}

          {ondernemingen?.map((onderneming) => {
            const documentenOnderneming = documenten.filter((d) => d.onderneming_id === onderneming.id)
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
                  <p className="text-xs text-zinc-400">Nog geen documenten herkend voor deze onderneming.</p>
                ) : (
                  <div className="flex flex-col gap-5">
                    {ONDERNEMING_DOCUMENT_VOLGORDE.map((type) => (
                      <CategorieBlok key={type} type={type} documenten={documentenOnderneming} zaakId={id} />
                    ))}
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
                  Bestanden die niet als een specifieke categorie herkend konden worden.
                </p>
              </div>
              <Card className="divide-y divide-zinc-100">
                {overigeDocumenten.map((doc) => (
                  <DocumentRij key={doc.id} zaakId={id} doc={doc} />
                ))}
              </Card>
            </section>
          )}
        </div>

        <Card className="flex w-full shrink-0 flex-col gap-4 p-5 lg:sticky lg:top-20 lg:w-72">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            <UploadCloud className="h-3.5 w-3.5" />
            Documenten uploaden
          </h2>
          <form action={uploadDocumenten} className="flex flex-col gap-3">
            <input type="hidden" name="zaak_id" value={id} />
            <input
              type="file"
              name="bestanden"
              accept=".pdf,.jpg,.jpeg,.png,.txt,.docx,.xlsx"
              multiple
              className={fileInputClass}
            />
            <p className="text-xs text-zinc-400">
              PDF, Word, Excel, foto&apos;s/scans — meerdere tegelijk mogelijk. Elk bestand wordt automatisch
              herkend (bijv. jaarcijfers, aangifte IB, KvK-uittreksel) — één bestand kan aan meerdere categorieën
              voldoen. Ontbrekende zaak-/ondernemingsgegevens (KvK-nummer, oprichtingsdatum, ongevalsdatum) worden
              zo mogelijk automatisch aangevuld. Dit kan bij grote bestanden een tijdje duren.
            </p>
            <button
              type="submit"
              className="self-start rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700"
            >
              Uploaden
            </button>
          </form>
        </Card>
      </main>
    </>
  )
}
