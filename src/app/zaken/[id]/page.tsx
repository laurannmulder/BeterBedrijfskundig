import Link from 'next/link'
import {
  Archive,
  Building2,
  CheckCircle2,
  ExternalLink,
  FileText,
  Mic,
  ClipboardList,
  RotateCcw,
  StickyNote,
  Trash2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  DOCUMENT_LABELS,
  ONDERNEMING_DOCUMENT_VOLGORDE,
  RECHTSVORM_LABELS,
  type DocumentType,
  type Rechtsvorm,
} from '@/lib/documenten/vereisten'
import { formatKosten } from '@/lib/rapportage/kosten'
import { Header } from '@/components/Header'
import { Badge, Card, LinkButton, PageHeader, inputClass } from '@/components/ui'
import {
  genereerInventarisatie,
  heropenZaak,
  sluitZaak,
  verwijderDocument,
  verwijderZaak,
  voegInventarisatieItemToe,
  voegNotitieToe,
  zetStapMarkering,
} from './actions'
import { UploadDocumentenForm } from './upload-documenten-form'
import { GenereerRapportForm } from './genereer-rapport-form'
import { VerwijderZaakForm } from './verwijder-zaak-form'
import { VragenForm } from './vragen-form'
import { SluitZaakForm } from './sluit-zaak-form'
import { NotitieBlok } from './notitie-blok'
import { GesprekBlok } from './gesprek-blok'
import { InventariseerKnop } from './inventariseer-knop'
import { InventarisatieLijst } from './inventarisatie-lijst'
import { StapSectie, ZaakProces, type ProcesStap, type StapStatus } from './zaak-proces'

// Zonder deze export gebruikt Vercel de standaard functietijd-limiet, die bij
// een omvangrijke zaak (veel PDF's, een eerdere rapportage als context, de
// web_search-tool) al overschreden kan worden vóórdat Claude klaar is — de
// generatie lijkt dan vast te lopen terwijl de functie simpelweg is
// afgebroken. 300s is bevestigd de daadwerkelijke bovengrens op het huidige
// Vercel-project (800s gaf een mislukte deploy — dat vereist "Fluid Compute"
// aan te zetten via Vercel → Settings → Functions, wat niet via CLI/code
// kan). Zie ook het verlaagde max_tokens/web_search-budget in genereer.ts,
// bedoeld om de generatie zelf beter binnen 300s te laten passen.
export const maxDuration = 300

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
  const { data: rapportages } = await supabase
    .from('rapportages')
    .select('id, status, voor_bezoek, kosten_usd, created_at')
    .eq('zaak_id', id)
    .order('created_at', { ascending: false })
  const { data: notities } = await supabase
    .from('zaak_notities')
    .select('id, tekst, soort')
    .eq('zaak_id', id)
    .order('created_at')
  const aanvullendeNotities = (notities ?? []).filter((n) => n.soort !== 'bezoek')
  const bezoekNotities = (notities ?? []).filter((n) => n.soort === 'bezoek')
  const { data: gesprekken } = await supabase
    .from('zaak_gesprekken')
    .select('id, status, transcript, foutmelding, opgenomen_op')
    .eq('zaak_id', id)
    .order('opgenomen_op', { ascending: false })
  const { data: inventarisatieItems } = await supabase
    .from('zaak_inventarisatie_items')
    .select('id, tekst, vraag, bron, afgevinkt')
    .eq('zaak_id', id)
    .order('volgorde')
    .order('created_at')

  if (!zaak) {
    return (
      <>
        <Header />
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
  const afgesloten = Boolean(zaak.afgesloten_op)
  const documenten = (alleDocumenten ?? []).filter((d) => d.status === 'geupload')
  const zaakDocumenten = documenten.filter((d) => d.onderneming_id === null && d.type !== 'overig')
  const overigeDocumenten = documenten.filter((d) => d.type === 'overig')

  const alleRapportages = rapportages ?? []
  const conceptRapportages = alleRapportages.filter((r) => r.voor_bezoek)
  const eindRapportages = alleRapportages.filter((r) => !r.voor_bezoek)
  const items = inventarisatieItems ?? []
  const openItems = items.filter((i) => !i.afgevinkt).length
  const aantalGesprekken = (gesprekken ?? []).filter((g) => g.status === 'klaar').length

  // Wanneer is een stap klaar? Stap 1-4 en 7 volgen vanzelf uit de gegevens;
  // 5 en 6 ook, maar kunnen daarnaast handmatig worden afgerond (bv. als er
  // niets meer opgevraagd hoeft te worden).
  const klaar: Record<number, boolean> = {
    1: true,
    2: documenten.length > 0,
    3: Boolean(zaak.vragen?.trim()),
    4: alleRapportages.length > 0,
    5: items.length > 0 || Boolean(zaak.inventarisatie_klaar_op),
    6: Boolean(zaak.bezoek_afgerond_op),
    7: eindRapportages.length > 0,
  }
  const huidigeStap = [2, 3, 4, 5, 6, 7].find((n) => !klaar[n])
  const statusVan = (n: number): StapStatus => (klaar[n] ? 'klaar' : n === huidigeStap ? 'huidig' : 'open')

  const procesStappen: ProcesStap[] = [
    { nummer: 1, titel: 'Zaak aangemaakt', status: statusVan(1), hint: new Date(zaak.created_at).toLocaleDateString('nl-NL', { dateStyle: 'medium' }) },
    {
      nummer: 2,
      titel: 'Bestanden uploaden',
      status: statusVan(2),
      hint: documenten.length > 0 ? `${documenten.length} bestand${documenten.length === 1 ? '' : 'en'}` : 'Nog niets geüpload',
    },
    { nummer: 3, titel: 'Vragen plakken', status: statusVan(3), hint: klaar[3] ? 'Vragen opgeslagen' : 'Nog geen vragen' },
    {
      nummer: 4,
      titel: 'Concept opstellen',
      status: statusVan(4),
      hint: alleRapportages.length > 0 ? `${alleRapportages.length} rapportage${alleRapportages.length === 1 ? '' : 's'}` : 'Nog geen concept',
    },
    {
      nummer: 5,
      titel: 'Ontbrekende gegevens',
      status: statusVan(5),
      hint: items.length > 0 ? `${openItems} van ${items.length} nog open` : klaar[5] ? 'Niets meer nodig' : 'Nog niet geïnventariseerd',
    },
    {
      nummer: 6,
      titel: 'Fysieke afspraak',
      status: statusVan(6),
      hint:
        bezoekNotities.length + aantalGesprekken > 0
          ? `${bezoekNotities.length + aantalGesprekken} bron${bezoekNotities.length + aantalGesprekken === 1 ? '' : 'nen'} toegevoegd`
          : 'Nog niets toegevoegd',
    },
    {
      nummer: 7,
      titel: 'Rapport genereren',
      status: statusVan(7),
      hint: eindRapportages.length > 0 ? `${eindRapportages.length} gegenereerd` : 'Nog niet gegenereerd',
    },
  ]

  const rapportLink = (r: { id: string; created_at: string; status: string; kosten_usd: number | null }) => (
    <Link
      key={r.id}
      href={`/zaken/${id}/rapportages/${r.id}`}
      className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-zinc-50"
    >
      <span className="flex items-center gap-2 text-zinc-900">
        <FileText className="h-4 w-4 text-zinc-400" />
        {new Date(r.created_at).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' })}
      </span>
      <span className="flex items-center gap-2">
        {formatKosten(r.kosten_usd) && <span className="text-xs text-zinc-400">{formatKosten(r.kosten_usd)}</span>}
        <Badge tone={r.status === 'definitief' ? 'success' : 'neutral'}>{r.status}</Badge>
      </span>
    </Link>
  )

  const submitKnopClass =
    'self-start rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700'
  const markeerKnopClass =
    'inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50'

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-8">
        <PageHeader
          backHref={afgesloten ? '/afgesloten' : '/'}
          backLabel={afgesloten ? 'Afgesloten zaken' : 'Lopende zaken'}
          title={zaak.naam_betrokkene}
          subtitle={zaak.dossiernummer ? `Dossier ${zaak.dossiernummer}` : undefined}
          actions={
            <>
              {alleRapportages.length > 0 && (
                <LinkButton href={`/zaken/${id}/rapportages`} variant="secondary" size="sm">
                  <FileText className="h-3.5 w-3.5" />
                  Rapportages ({alleRapportages.length})
                </LinkButton>
              )}
              {afgesloten ? (
                <form action={heropenZaak} className="contents">
                  <input type="hidden" name="zaak_id" value={id} />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#12756A] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#0f5f57]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Zaak heropenen
                  </button>
                </form>
              ) : (
                <SluitZaakForm zaakId={id} naamBetrokkene={zaak.naam_betrokkene} action={sluitZaak} />
              )}
            </>
          }
        />

        {afgesloten && (
          <Card className="flex items-start gap-3 border-zinc-300 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            <Archive className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
            <p>
              Deze zaak is afgesloten op{' '}
              <strong className="font-semibold text-zinc-900">
                {new Date(zaak.afgesloten_op).toLocaleDateString('nl-NL', { dateStyle: 'long' })}
              </strong>{' '}
              en wordt bewaard in het archief. Heropen de zaak om weer een rapport te genereren.
            </p>
          </Card>
        )}

        <ZaakProces stappen={procesStappen} />

        {error && <Card className="border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</Card>}

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <div id="stap-1" className="flex w-full shrink-0 scroll-mt-24 flex-col gap-6 lg:sticky lg:top-20 lg:w-64">
            <Card className="flex flex-col gap-4 p-5">
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
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-12">
            <StapSectie
              nummer={2}
              titel="Bestanden uploaden"
              status={statusVan(2)}
              uitleg="Upload alles wat voor deze zaak is aangeleverd. Elk bestand wordt automatisch herkend en ingedeeld."
            >
              <Card className="p-5">
                <UploadDocumentenForm zaakId={id} />
              </Card>

              {zaakDocumenten.length > 0 && (
                <div className="flex flex-col gap-5">
                  <h3 className="text-sm font-semibold text-zinc-900">Zaak</h3>
                  {ZAAK_DOCUMENT_VOLGORDE.map((type) => (
                    <CategorieBlok key={type} type={type} documenten={zaakDocumenten} zaakId={id} />
                  ))}
                </div>
              )}

              {ondernemingen?.map((onderneming) => {
                const documentenOnderneming = documenten.filter((d) => d.onderneming_id === onderneming.id)
                const rechtsvorm = onderneming.rechtsvorm as Rechtsvorm | null

                return (
                  <div key={onderneming.id} className="flex flex-col gap-3">
                    <h3 className="text-sm font-semibold text-zinc-900">
                      {onderneming.naam}{' '}
                      <span className="font-normal text-zinc-400">
                        ({rechtsvorm ? RECHTSVORM_LABELS[rechtsvorm] : 'rechtsvorm onbekend'})
                      </span>
                    </h3>
                    {documentenOnderneming.length === 0 ? (
                      <p className="text-xs text-zinc-400">Nog geen documenten herkend voor deze onderneming.</p>
                    ) : (
                      <div className="flex flex-col gap-5">
                        {ONDERNEMING_DOCUMENT_VOLGORDE.map((type) => (
                          <CategorieBlok key={type} type={type} documenten={documentenOnderneming} zaakId={id} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {overigeDocumenten.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">Overige documenten</h3>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Bestanden die niet als een specifieke categorie herkend konden worden.
                    </p>
                  </div>
                  <Card className="divide-y divide-zinc-100">
                    {overigeDocumenten.map((doc) => (
                      <DocumentRij key={doc.id} zaakId={id} doc={doc} />
                    ))}
                  </Card>
                </div>
              )}
            </StapSectie>

            <StapSectie
              nummer={3}
              titel="Vragen van partijen"
              status={statusVan(3)}
              uitleg="Plak de vragen van de verzekeraar en de belangenbehartiger uit hun e-mail, inclusief eventuele aanvullende vragen. Dit vormt de vraagstelling van de rapportage."
            >
              <VragenForm zaakId={id} beginwaarde={zaak.vragen ?? ''} />
            </StapSectie>

            <StapSectie
              nummer={4}
              titel="Concept rapportage opstellen"
              status={statusVan(4)}
              uitleg="Een eerste concept op basis van de nu aanwezige gegevens, vóór het fysieke gesprek. Vragen die nog niet te beantwoorden zijn, worden als aanname gemarkeerd."
            >
              {!afgesloten && (
                <div className="flex flex-wrap items-center gap-3">
                  <GenereerRapportForm
                    zaakId={id}
                    voorBezoek
                    label={conceptRapportages.length > 0 ? 'Nieuw concept opstellen' : 'Concept opstellen'}
                    disabled={documenten.length === 0}
                  />
                  {documenten.length === 0 && (
                    <span className="text-xs text-zinc-500">Upload eerst bestanden (stap 2).</span>
                  )}
                  {documenten.length > 0 && !klaar[3] && (
                    <span className="text-xs text-amber-700">
                      Er zijn nog geen vragen geplakt (stap 3) — het concept bevat dan geen beantwoording.
                    </span>
                  )}
                </div>
              )}
              {conceptRapportages.length > 0 && (
                <Card className="divide-y divide-zinc-100">{conceptRapportages.map(rapportLink)}</Card>
              )}
            </StapSectie>

            <StapSectie
              nummer={5}
              titel="Nog aan te leveren gegevens"
              status={statusVan(5)}
              uitleg="Welke gegevens zijn nog nodig om de onbeantwoorde vragen te kunnen beantwoorden? Neem deze lijst mee naar de fysieke afspraak en vink af wat je hebt ontvangen of besproken."
            >
              {!afgesloten && (
                <div className="flex flex-wrap items-center gap-3">
                  {alleRapportages.length > 0 ? (
                    <InventariseerKnop
                      zaakId={id}
                      action={genereerInventarisatie}
                      label={items.some((i) => i.bron === 'ai') ? 'Opnieuw inventariseren' : 'Laat Claude inventariseren'}
                      bevestig={
                        items.some((i) => i.bron === 'ai')
                          ? 'De eerdere voorzet van Claude wordt vervangen (ook wat je hebt afgevinkt). Je eigen toevoegingen blijven staan. Doorgaan?'
                          : undefined
                      }
                    />
                  ) : (
                    <span className="text-xs text-zinc-500">Stel eerst een concept op (stap 4).</span>
                  )}
                </div>
              )}

              {items.length > 0 ? (
                <InventarisatieLijst zaakId={id} items={items} />
              ) : (
                <p className="text-xs text-zinc-400">
                  {klaar[5] ? 'Er hoeft niets meer opgevraagd te worden.' : 'Nog geen lijst gemaakt.'}
                </p>
              )}

              {!afgesloten && (
                <form action={voegInventarisatieItemToe} className="flex gap-2">
                  <input type="hidden" name="zaak_id" value={id} />
                  <input
                    name="tekst"
                    placeholder="Zelf een gegeven toevoegen, bijv. Jaarrekening 2024 van de holding"
                    className={inputClass}
                  />
                  <button type="submit" className={`${submitKnopClass} shrink-0`}>
                    Toevoegen
                  </button>
                </form>
              )}

              {!afgesloten && (
                <form action={zetStapMarkering}>
                  <input type="hidden" name="zaak_id" value={id} />
                  <input type="hidden" name="kolom" value="inventarisatie_klaar_op" />
                  <input type="hidden" name="klaar" value={zaak.inventarisatie_klaar_op ? '0' : '1'} />
                  {items.length === 0 && (
                    <button type="submit" className={markeerKnopClass}>
                      {zaak.inventarisatie_klaar_op ? 'Weer openen' : 'Markeer als klaar: niets meer nodig'}
                    </button>
                  )}
                </form>
              )}
            </StapSectie>

            <StapSectie
              nummer={6}
              titel="Fysieke afspraak"
              status={statusVan(6)}
              uitleg="Voeg na de afspraak de informatie toe: neem het gesprek op en/of typ je aantekeningen. Alles wat hier staat wordt meegenomen bij het genereren van het rapport."
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
                    <Mic className="h-4 w-4" />
                    Gesprekken
                  </h3>
                  <LinkButton href={`/zaken/${id}/gesprek/nieuw`} variant="secondary" size="sm">
                    <Mic className="h-3.5 w-3.5" />
                    Opnemen
                  </LinkButton>
                </div>
                {gesprekken && gesprekken.length > 0 ? (
                  <Card className="divide-y divide-zinc-100">
                    {gesprekken.map((gesprek) => (
                      <GesprekBlok key={gesprek.id} zaakId={id} gesprek={gesprek} />
                    ))}
                  </Card>
                ) : (
                  <p className="text-xs text-zinc-400">Nog geen opgenomen gesprekken.</p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
                  <ClipboardList className="h-4 w-4" />
                  Aantekeningen bezoek
                </h3>
                {bezoekNotities.length > 0 && (
                  <Card className="divide-y divide-zinc-100">
                    {bezoekNotities.map((notitie) => (
                      <NotitieBlok key={notitie.id} zaakId={id} notitie={notitie} />
                    ))}
                  </Card>
                )}
                <form action={voegNotitieToe} className="flex flex-col gap-2">
                  <input type="hidden" name="zaak_id" value={id} />
                  <input type="hidden" name="soort" value="bezoek" />
                  <textarea
                    name="tekst"
                    rows={4}
                    placeholder="Bijv. wat betrokkene vertelde over de onderneming, de gevolgen van het ongeval en de huidige situatie."
                    className={inputClass}
                  />
                  <button type="submit" className={submitKnopClass}>
                    Toevoegen
                  </button>
                </form>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
                    <StickyNote className="h-4 w-4" />
                    Aanvullende informatie
                  </h3>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Blijvende aandachtspunten voor deze zaak; worden bij elke rapportgeneratie meegegeven.
                  </p>
                </div>
                {aanvullendeNotities.length > 0 && (
                  <Card className="divide-y divide-zinc-100">
                    {aanvullendeNotities.map((notitie) => (
                      <NotitieBlok key={notitie.id} zaakId={id} notitie={notitie} />
                    ))}
                  </Card>
                )}
                <form action={voegNotitieToe} className="flex flex-col gap-2">
                  <input type="hidden" name="zaak_id" value={id} />
                  <textarea
                    name="tekst"
                    rows={2}
                    placeholder="Bijv. een blijvend aandachtspunt of achtergrondinformatie voor deze zaak."
                    className={inputClass}
                  />
                  <button type="submit" className={submitKnopClass}>
                    Toevoegen
                  </button>
                </form>
              </div>

              {!afgesloten && (
                <form action={zetStapMarkering}>
                  <input type="hidden" name="zaak_id" value={id} />
                  <input type="hidden" name="kolom" value="bezoek_afgerond_op" />
                  <input type="hidden" name="klaar" value={zaak.bezoek_afgerond_op ? '0' : '1'} />
                  <button type="submit" className={markeerKnopClass}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {zaak.bezoek_afgerond_op ? 'Afspraak weer openen' : 'Afspraak afgerond: informatie compleet'}
                  </button>
                </form>
              )}
            </StapSectie>

            <StapSectie
              nummer={7}
              titel="Rapport genereren"
              status={statusVan(7)}
              uitleg="Het rapport met alle beschikbare gegevens, inclusief de informatie uit de fysieke afspraak. Het concept uit stap 4 wordt hierbij niet als eerdere rapportage behandeld."
            >
              {!afgesloten && (
                <div className="flex flex-wrap items-center gap-3">
                  <GenereerRapportForm zaakId={id} label="Rapport genereren" disabled={documenten.length === 0} />
                  {!klaar[6] && (
                    <span className="text-xs text-amber-700">
                      De fysieke afspraak is nog niet als afgerond gemarkeerd (stap 6).
                    </span>
                  )}
                </div>
              )}
              {eindRapportages.length > 0 && (
                <Card className="divide-y divide-zinc-100">{eindRapportages.map(rapportLink)}</Card>
              )}
            </StapSectie>
          </div>
        </div>
      </main>
    </>
  )
}
