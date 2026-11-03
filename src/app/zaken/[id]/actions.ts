'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { DOCUMENT_LABELS, type DocumentType } from '@/lib/documenten/vereisten'
import { leesBestandInhoud } from '@/lib/documenten/lees-bestand'
import { verwerkGeuploadBestand } from '@/lib/documenten/verwerk-upload'
import {
  GENERATIE_STAPPEN,
  voerGeneratieStapUit,
  type DocumentFeit,
  type OndernemingFeit,
  type RapportageInput,
} from '@/lib/rapportage/genereer'
import { inventariseerOntbrekendeGegevens } from '@/lib/rapportage/inventariseer'
import type { StapVerbruik } from '@/lib/rapportage/kosten'

export interface GeuploadBestand {
  path: string
  naam: string
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

// Bouwt de volledige input voor de generatie opnieuw op uit de database —
// wordt bij elke stap van de generatie opnieuw aangeroepen (zie
// verwerkGeneratieStap hieronder). Dat betekent dat Storage-downloads van de
// documenten per stap herhaald worden, maar dat is snel (seconden); de dure
// stap (Claude's eigen documentverwerking) wordt dankzij prompt caching in
// genereer.ts vanaf de tweede stap overgeslagen.
async function laadRapportageInput(
  supabase: SupabaseClient,
  zaakId: string,
  extraContext: string | null,
  voorBezoek: boolean
): Promise<RapportageInput> {
  const { data: zaak } = await supabase.from('zaken').select('*').eq('id', zaakId).single()
  const { data: ondernemingenRows } = await supabase.from('ondernemingen').select('*').eq('zaak_id', zaakId)
  const { data: documentenRows } = await supabase.from('documenten').select('*').eq('zaak_id', zaakId)
  const { data: notitieRows } = await supabase
    .from('zaak_notities')
    .select('tekst, soort, created_at')
    .eq('zaak_id', zaakId)
    .order('created_at')
  const { data: eerdereRapportageRows } = await supabase
    .from('rapportages')
    .select('inhoud, created_at')
    .eq('zaak_id', zaakId)
    .eq('voor_bezoek', false)
    .order('created_at')
  const { data: gesprekRows } = await supabase
    .from('zaak_gesprekken')
    .select('transcript, opgenomen_op')
    .eq('zaak_id', zaakId)
    .eq('status', 'klaar')
    .order('opgenomen_op')

  if (!zaak || !ondernemingenRows || !documentenRows) {
    throw new Error('Zaakgegevens konden niet worden geladen')
  }

  const ondernemingNaamPerId = new Map(ondernemingenRows.map((o) => [o.id, o.naam]))

  const ondernemingen: OndernemingFeit[] = ondernemingenRows.map((o) => ({
    naam: o.naam,
    rechtsvorm: o.rechtsvorm,
    oprichtingsdatum: o.oprichtingsdatum,
    kvk_nummer: o.kvk_nummer,
  }))

  const geuploadeDocumenten = documentenRows.filter((d) => d.status === 'geupload' && d.storage_path)

  const documenten: DocumentFeit[] = []
  for (const doc of geuploadeDocumenten) {
    const basis = {
      label:
        doc.type === 'overig'
          ? (doc.storage_path?.split('/').pop() ?? DOCUMENT_LABELS.overig)
          : DOCUMENT_LABELS[doc.type as DocumentType],
      jaar: doc.jaar,
      onderneming: doc.onderneming_id ? (ondernemingNaamPerId.get(doc.onderneming_id) ?? null) : null,
    }

    const { data: bestand } = await supabase.storage.from('documenten').download(doc.storage_path!)
    if (!bestand) {
      documenten.push({ ...basis, kind: 'onleesbaar' })
      continue
    }

    documenten.push({ ...basis, ...(await leesBestandInhoud(bestand)) })
  }

  return {
    naamBetrokkene: zaak.naam_betrokkene,
    dossiernummer: zaak.dossiernummer,
    ongevalsdatum: zaak.ongevalsdatum,
    ondernemingen,
    verzekeraar: {
      naam: zaak.verzekeraar_naam,
      contactpersoon: zaak.verzekeraar_contactpersoon,
      email: zaak.verzekeraar_email,
      kenmerk: zaak.verzekeraar_kenmerk,
    },
    belangenbehartiger: {
      bureau: zaak.belangenbehartiger_bureau,
      naam: zaak.belangenbehartiger_naam,
      email: zaak.belangenbehartiger_email,
      kenmerk: zaak.belangenbehartiger_kenmerk,
    },
    documenten,
    notities: (notitieRows ?? []).filter((n) => n.soort !== 'bezoek').map((n) => n.tekst),
    bezoekaantekeningen: (notitieRows ?? [])
      .filter((n) => n.soort === 'bezoek')
      .map((n) => ({ datum: new Date(n.created_at).toLocaleDateString('nl-NL'), tekst: n.tekst })),
    vragen: zaak.vragen,
    voorBezoek,
    extraContext,
    eerdereRapportages: (eerdereRapportageRows ?? []).map((r) => ({
      datum: new Date(r.created_at).toLocaleDateString('nl-NL'),
      inhoud: r.inhoud,
    })),
    gesprekken: (gesprekRows ?? [])
      .filter((g) => g.transcript)
      .map((g) => ({
        datum: new Date(g.opgenomen_op).toLocaleDateString('nl-NL'),
        transcript: g.transcript!,
      })),
  }
}

// De bestanden zelf zijn door de browser al rechtstreeks naar Supabase
// Storage geüpload (zie upload-documenten-form.tsx) — Vercel's serverless
// functions accepteren geen requestbody groter dan 4,5MB, ongeacht Next.js'
// eigen serverActions.bodySizeLimit, dus een batch scans/PDF's via de
// server-action-body sturen loopt daar op vast. Deze actie krijgt alleen de
// (kleine) storage-paden door en classificeert vanaf daar.
export async function verwerkGeuploadeDocumenten(zaakId: string, bestanden: GeuploadBestand[]) {
  if (bestanden.length === 0) {
    redirect(`/zaken/${zaakId}?error=${encodeURIComponent('Kies eerst een of meer bestanden')}`)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const mislukt: string[] = []
  for (const { path, naam } of bestanden) {
    const resultaat = await verwerkGeuploadBestand(supabase, zaakId, user!.id, path, naam)
    if (!resultaat.ok) mislukt.push(`${resultaat.bestandsnaam} (${resultaat.error})`)
  }

  revalidatePath(`/zaken/${zaakId}`)

  if (mislukt.length > 0) {
    redirect(`/zaken/${zaakId}?error=${encodeURIComponent(`Niet gelukt: ${mislukt.join(', ')}`)}`)
  }

  redirect(`/zaken/${zaakId}`)
}

export async function verwijderDocument(formData: FormData) {
  const zaakId = String(formData.get('zaak_id') ?? '')
  const documentId = String(formData.get('document_id') ?? '')

  const supabase = await createClient()

  const { data: document } = await supabase
    .from('documenten')
    .select('storage_path')
    .eq('id', documentId)
    .single()

  const { error: deleteError } = await supabase.from('documenten').delete().eq('id', documentId)

  if (deleteError) {
    redirect(`/zaken/${zaakId}?error=${encodeURIComponent(deleteError.message)}`)
  }

  // Eén geüpload bestand kan aan meerdere categorieën voldoen (meerdere rijen
  // met hetzelfde storage_path) — het bestand zelf pas opruimen als er geen
  // andere rij meer naar verwijst.
  if (document?.storage_path) {
    const { count } = await supabase
      .from('documenten')
      .select('id', { count: 'exact', head: true })
      .eq('storage_path', document.storage_path)

    if (!count) {
      await supabase.storage.from('documenten').remove([document.storage_path])
    }
  }

  revalidatePath(`/zaken/${zaakId}`)
  redirect(`/zaken/${zaakId}`)
}

// "Aanvullende informatie" (zaak_notities) is bewust iets anders dan
// rapportages.extra_context: dit zijn persistente blokken die bij élke
// toekomstige generatie voor deze zaak meegegeven worden, totdat ze bewust
// gewijzigd of verwijderd worden — zie laadRapportageInput hieronder.
export async function voegNotitieToe(formData: FormData) {
  const zaakId = String(formData.get('zaak_id') ?? '')
  const tekst = String(formData.get('tekst') ?? '').trim()
  // 'bezoek' = aantekeningen van de fysieke afspraak (eigen blok op de
  // zaakpagina); alles wat niet expliciet 'bezoek' is, is gewone aanvullende
  // informatie.
  const soort = formData.get('soort') === 'bezoek' ? 'bezoek' : 'aanvullend'

  if (!tekst) {
    redirect(`/zaken/${zaakId}?error=${encodeURIComponent('Vul eerst tekst in')}`)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from('zaak_notities').insert({ zaak_id: zaakId, tekst, soort, created_by: user!.id })

  if (error) {
    redirect(`/zaken/${zaakId}?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath(`/zaken/${zaakId}`)
  redirect(`/zaken/${zaakId}`)
}

// Eén vrij tekstveld per zaak (zaken.vragen) voor de vragen van verzekeraar en
// belangenbehartiger, zoals uit hun e-mail gekopieerd. Een leeg veld wist de
// vragen — dan valt de generatie terug op zoeken in opdrachtbrief/documenten.
export type VragenStatus = { ok: boolean; melding: string; tijd: number } | null

export async function bewaarVragen(_vorige: VragenStatus, formData: FormData): Promise<VragenStatus> {
  const zaakId = String(formData.get('zaak_id') ?? '')
  const vragen = String(formData.get('vragen') ?? '').trim() || null

  const supabase = await createClient()
  const { error } = await supabase.from('zaken').update({ vragen }).eq('id', zaakId)

  if (error) return { ok: false, melding: `Opslaan mislukt: ${error.message}`, tijd: Date.now() }

  revalidatePath(`/zaken/${zaakId}`)
  return { ok: true, melding: 'Opgeslagen', tijd: Date.now() }
}

export async function wijzigNotitie(formData: FormData) {
  const zaakId = String(formData.get('zaak_id') ?? '')
  const notitieId = String(formData.get('notitie_id') ?? '')
  const tekst = String(formData.get('tekst') ?? '').trim()

  if (!tekst) {
    redirect(`/zaken/${zaakId}?error=${encodeURIComponent('Vul eerst tekst in')}`)
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('zaak_notities')
    .update({ tekst, updated_at: new Date().toISOString() })
    .eq('id', notitieId)

  if (error) {
    redirect(`/zaken/${zaakId}?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath(`/zaken/${zaakId}`)
  redirect(`/zaken/${zaakId}`)
}

export async function verwijderNotitie(formData: FormData) {
  const zaakId = String(formData.get('zaak_id') ?? '')
  const notitieId = String(formData.get('notitie_id') ?? '')

  const supabase = await createClient()
  const { error } = await supabase.from('zaak_notities').delete().eq('id', notitieId)

  if (error) {
    redirect(`/zaken/${zaakId}?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath(`/zaken/${zaakId}`)
  redirect(`/zaken/${zaakId}`)
}

// Afsluiten verwijdert niets: de zaak verhuist naar "Afgesloten zaken" (het
// archief) met al zijn documenten, rapportages en aantekeningen, en kan
// altijd weer heropend worden. Verwijderen blijft een aparte, harde actie.
export async function sluitZaak(formData: FormData) {
  const zaakId = String(formData.get('zaak_id') ?? '')
  const supabase = await createClient()

  const { error } = await supabase
    .from('zaken')
    .update({ afgesloten_op: new Date().toISOString() })
    .eq('id', zaakId)

  if (error) {
    redirect(`/zaken/${zaakId}?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/')
  revalidatePath('/afgesloten')
  redirect('/afgesloten')
}

export async function heropenZaak(formData: FormData) {
  const zaakId = String(formData.get('zaak_id') ?? '')
  const supabase = await createClient()

  const { error } = await supabase.from('zaken').update({ afgesloten_op: null }).eq('id', zaakId)

  if (error) {
    redirect(`/zaken/${zaakId}?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/')
  revalidatePath('/afgesloten')
  redirect(`/zaken/${zaakId}`)
}

export async function verwijderZaak(formData: FormData) {
  const zaakId = String(formData.get('zaak_id') ?? '')
  const supabase = await createClient()

  // Bestandspaden vooraf ophalen — na het verwijderen van de zaak zijn de
  // documenten-rijen (en daarmee hun storage_path) al weg door de cascade.
  const { data: documentenRows } = await supabase.from('documenten').select('storage_path').eq('zaak_id', zaakId)
  const paths = Array.from(
    new Set((documentenRows ?? []).map((d) => d.storage_path).filter((p): p is string => Boolean(p)))
  )

  // Cascade in de database ruimt ondernemingen, documenten en rapportages
  // vanzelf mee op (on delete cascade, zie migratie 0001/0002).
  const { error } = await supabase.from('zaken').delete().eq('id', zaakId)

  if (error) {
    redirect(`/zaken/${zaakId}?error=${encodeURIComponent(error.message)}`)
  }

  if (paths.length > 0) {
    await supabase.storage.from('documenten').remove(paths)
  }

  revalidatePath('/')
  redirect('/')
}

// Start een nieuwe generatie: legt een rapportage_generaties-rij aan (stap 0,
// status 'bezig') en stuurt door naar de voortgangspagina. Die pagina roept
// verwerkGeneratieStap hieronder herhaald aan (client-side polling) totdat de
// generatie klaar is — zie genereren/[generatieId]/page.tsx en
// generatie-voortgang.tsx. Elke stap is een losse, korte serverless-aanroep,
// zodat een omvangrijke zaak nooit meer op de functietijdslimiet vastloopt
// (zie genereer.ts voor waarom dit met prompt caching per stap snel blijft).
export async function startRapportGeneratie(
  zaakId: string,
  extraContext: string | null,
  extraBestanden: GeuploadBestand[],
  voorBezoek = false
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  for (const { path, naam } of extraBestanden) {
    const resultaat = await verwerkGeuploadBestand(supabase, zaakId, user!.id, path, naam)
    if (!resultaat.ok) {
      redirect(`/zaken/${zaakId}?error=${encodeURIComponent(`${resultaat.bestandsnaam}: ${resultaat.error}`)}`)
    }
  }

  const { data: generatie, error } = await supabase
    .from('rapportage_generaties')
    .insert({ zaak_id: zaakId, extra_context: extraContext, gestart_door: user!.id, voor_bezoek: voorBezoek })
    .select('id')
    .single()

  if (error || !generatie) {
    redirect(`/zaken/${zaakId}?error=${encodeURIComponent(error?.message ?? 'Starten van generatie mislukt')}`)
  }

  redirect(`/zaken/${zaakId}/genereren/${generatie.id}`)
}

export interface GeneratieVoortgang {
  status: 'bezig' | 'klaar' | 'mislukt'
  stap: number
  totaalStappen: number
  stapNaam: string | null
  rapportageId: string | null
  foutmelding: string | null
}

// Voert precies één stap van de generatie uit en geeft de nieuwe voortgang
// terug (geen redirect — dit wordt aangeroepen vanuit een client component
// die zelf bepaalt wanneer door te navigeren naar de rapportage).
export async function verwerkGeneratieStap(generatieId: string): Promise<GeneratieVoortgang> {
  const supabase = await createClient()

  const { data: generatie } = await supabase.from('rapportage_generaties').select('*').eq('id', generatieId).single()

  if (!generatie) {
    return { status: 'mislukt', stap: 0, totaalStappen: GENERATIE_STAPPEN.length, stapNaam: null, rapportageId: null, foutmelding: 'Generatie niet gevonden' }
  }

  if (generatie.status !== 'bezig') {
    return {
      status: generatie.status,
      stap: generatie.stap,
      totaalStappen: GENERATIE_STAPPEN.length,
      stapNaam: GENERATIE_STAPPEN[generatie.stap]?.naam ?? null,
      rapportageId: generatie.rapportage_id,
      foutmelding: generatie.foutmelding,
    }
  }

  try {
    const input = await laadRapportageInput(supabase, generatie.zaak_id, generatie.extra_context, generatie.voor_bezoek)

    // Brak de vorige aanroep van déze stap af op de tokenlimiet, dan schrijft
    // het model nu verder waar het stopte (zie voerGeneratieStapUit).
    const eerderVerbruik = (generatie.verbruik as StapVerbruik[] | null) ?? []
    const afgebrokenPogingen = eerderVerbruik.filter((v) => v.stap === generatie.stap && v.afgebroken).length
    if (afgebrokenPogingen >= 3) {
      throw new Error(
        'Een onderdeel van het rapport werd drie keer afgebroken op de tokenlimiet en is niet af te maken. Probeer het opnieuw; blijft het gebeuren, meld dit dan.'
      )
    }
    const stapResultaat = await voerGeneratieStapUit(
      input,
      generatie.stap,
      generatie.rapportage_tekst,
      afgebrokenPogingen > 0
    )

    const verbruik: StapVerbruik[] = [
      ...eerderVerbruik,
      { ...stapResultaat.verbruik, ...(stapResultaat.afgebroken ? { afgebroken: true } : {}) },
    ]
    const kostenUsd = Number(verbruik.reduce((som, v) => som + v.kostenUsd, 0).toFixed(4))

    if (!stapResultaat.klaar) {
      // Afgebroken stap: zelfde stap nogmaals (als vervolg), niet doorschuiven.
      const volgendeStap = stapResultaat.afgebroken ? generatie.stap : generatie.stap + 1
      await supabase
        .from('rapportage_generaties')
        .update({
          stap: volgendeStap,
          rapportage_tekst: stapResultaat.rapportage,
          verbruik,
          kosten_usd: kostenUsd,
          updated_at: new Date().toISOString(),
        })
        .eq('id', generatieId)

      return {
        status: 'bezig',
        stap: volgendeStap,
        totaalStappen: GENERATIE_STAPPEN.length,
        stapNaam: GENERATIE_STAPPEN[volgendeStap]?.naam ?? null,
        rapportageId: null,
        foutmelding: null,
      }
    }

    const { data: nieuweRapportage, error: insertError } = await supabase
      .from('rapportages')
      .insert({
        zaak_id: generatie.zaak_id,
        inhoud: stapResultaat.rapportage,
        suggesties: stapResultaat.suggesties,
        extra_context: generatie.extra_context,
        voor_bezoek: generatie.voor_bezoek,
        kosten_usd: kostenUsd,
        gegenereerd_door: generatie.gestart_door,
      })
      .select('id')
      .single()

    if (insertError || !nieuweRapportage) {
      throw new Error(insertError?.message ?? 'Opslaan rapportage mislukt')
    }

    await supabase
      .from('rapportage_generaties')
      .update({
        status: 'klaar',
        rapportage_tekst: stapResultaat.rapportage,
        suggesties: stapResultaat.suggesties,
        verbruik,
        kosten_usd: kostenUsd,
        rapportage_id: nieuweRapportage.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', generatieId)

    revalidatePath(`/zaken/${generatie.zaak_id}`)

    return {
      status: 'klaar',
      stap: generatie.stap,
      totaalStappen: GENERATIE_STAPPEN.length,
      stapNaam: null,
      rapportageId: nieuweRapportage.id,
      foutmelding: null,
    }
  } catch (fout) {
    // De Claude API geeft af en toe een tijdelijke 5xx/overloaded-fout terug
    // (de SDK retryt dat zelf al een paar keer voor het hier uitkomt).
    const ruweMelding = fout instanceof Error ? fout.message : String(fout)
    const melding = /credit balance is too low/i.test(ruweMelding)
      ? 'Het Anthropic-tegoed is op. Vul het saldo aan (console.anthropic.com → Plans & Billing) en kies daarna "Opnieuw proberen": de al afgeronde stappen blijven bewaard.'
      : ruweMelding
    await supabase
      .from('rapportage_generaties')
      .update({ status: 'mislukt', foutmelding: melding, updated_at: new Date().toISOString() })
      .eq('id', generatieId)

    return { status: 'mislukt', stap: generatie.stap, totaalStappen: GENERATIE_STAPPEN.length, stapNaam: null, rapportageId: null, foutmelding: melding }
  }
}

// Zet een mislukte generatie (bv. door een leeg Anthropic-tegoed of een
// tijdelijke API-fout) weer aan het werk vanaf de stap waar het stopte — de
// al opgebouwde tekst staat in rapportage_generaties.rapportage_tekst, dus
// afgeronde (en al betaalde) stappen hoeven niet opnieuw.
export async function hervatGeneratie(generatieId: string): Promise<GeneratieVoortgang> {
  const supabase = await createClient()
  const { data: generatie } = await supabase
    .from('rapportage_generaties')
    .update({ status: 'bezig', foutmelding: null, updated_at: new Date().toISOString() })
    .eq('id', generatieId)
    .eq('status', 'mislukt')
    .select('stap')
    .single()

  const stap = generatie?.stap ?? 0
  return {
    status: 'bezig',
    stap,
    totaalStappen: GENERATIE_STAPPEN.length,
    stapNaam: GENERATIE_STAPPEN[stap]?.naam ?? null,
    rapportageId: null,
    foutmelding: null,
  }
}

export async function wijzigRapportageExtraContext(formData: FormData) {
  const zaakId = String(formData.get('zaak_id') ?? '')
  const rapportageId = String(formData.get('rapportage_id') ?? '')
  const verwijderen = formData.get('verwijderen') === '1'
  const extraContext = verwijderen ? null : String(formData.get('extra_context') ?? '').trim() || null

  const supabase = await createClient()
  const { error } = await supabase
    .from('rapportages')
    .update({ extra_context: extraContext })
    .eq('id', rapportageId)

  if (error) {
    redirect(`/zaken/${zaakId}/rapportages/${rapportageId}?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath(`/zaken/${zaakId}/rapportages/${rapportageId}`)
  redirect(`/zaken/${zaakId}/rapportages/${rapportageId}`)
}

export async function wijzigRapportageStatus(formData: FormData) {
  const zaakId = String(formData.get('zaak_id') ?? '')
  const rapportageId = String(formData.get('rapportage_id') ?? '')
  const status = String(formData.get('status') ?? '')

  if (status !== 'concept' && status !== 'definitief') {
    redirect(`/zaken/${zaakId}/rapportages/${rapportageId}?error=${encodeURIComponent('Ongeldige status')}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.from('rapportages').update({ status }).eq('id', rapportageId)

  if (error) {
    redirect(`/zaken/${zaakId}/rapportages/${rapportageId}?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath(`/zaken/${zaakId}/rapportages`)
  redirect(`/zaken/${zaakId}/rapportages/${rapportageId}`)
}

// ---------------------------------------------------------------------------
// Zaakproces: stap 5 (inventarisatie) en handmatige afvinkmomenten.
// ---------------------------------------------------------------------------

// Laat Claude uit de vragen + het meest recente concept afleiden welke
// gegevens nog opgevraagd moeten worden. Eerdere AI-items worden vervangen;
// handmatig toegevoegde items blijven staan.
export async function genereerInventarisatie(formData: FormData) {
  const zaakId = String(formData.get('zaak_id') ?? '')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: zaak } = await supabase.from('zaken').select('vragen').eq('id', zaakId).single()
  const { data: concept } = await supabase
    .from('rapportages')
    .select('inhoud')
    .eq('zaak_id', zaakId)
    .order('voor_bezoek', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const { data: documentRows } = await supabase
    .from('documenten')
    .select('type, jaar, storage_path')
    .eq('zaak_id', zaakId)
    .eq('status', 'geupload')

  if (!concept) {
    redirect(`/zaken/${zaakId}?error=${encodeURIComponent('Stel eerst een conceptrapportage op (stap 4)')}`)
  }

  let items
  try {
    items = await inventariseerOntbrekendeGegevens({
      vragen: zaak?.vragen ?? null,
      concept: concept.inhoud,
      documentLabels: (documentRows ?? []).map((d) =>
        d.type === 'overig'
          ? (d.storage_path?.split('/').pop() ?? DOCUMENT_LABELS.overig)
          : DOCUMENT_LABELS[d.type as DocumentType] + (d.jaar ? ` ${d.jaar}` : '')
      ),
    })
  } catch (fout) {
    const melding = fout instanceof Error ? fout.message : String(fout)
    redirect(`/zaken/${zaakId}?error=${encodeURIComponent(`Inventariseren mislukt: ${melding}`)}`)
  }

  await supabase.from('zaak_inventarisatie_items').delete().eq('zaak_id', zaakId).eq('bron', 'ai')

  if (items.length > 0) {
    const { error } = await supabase.from('zaak_inventarisatie_items').insert(
      items.map((item, i) => ({
        zaak_id: zaakId,
        tekst: item.gegeven,
        vraag: item.vraag,
        bron: 'ai',
        volgorde: i,
        created_by: user!.id,
      }))
    )
    if (error) redirect(`/zaken/${zaakId}?error=${encodeURIComponent(error.message)}`)
  }

  // Een lege lijst is ook een uitkomst ("niets meer nodig"): stap 5 telt dan
  // als klaar, ook al zijn er geen items om af te vinken.
  await supabase.from('zaken').update({ inventarisatie_klaar_op: new Date().toISOString() }).eq('id', zaakId)

  revalidatePath(`/zaken/${zaakId}`)
  redirect(`/zaken/${zaakId}#stap-5`)
}

export async function voegInventarisatieItemToe(formData: FormData) {
  const zaakId = String(formData.get('zaak_id') ?? '')
  const tekst = String(formData.get('tekst') ?? '').trim()
  if (!tekst) redirect(`/zaken/${zaakId}?error=${encodeURIComponent('Vul eerst een gegeven in')}#stap-5`)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { error } = await supabase.from('zaak_inventarisatie_items').insert({
    zaak_id: zaakId,
    tekst,
    bron: 'handmatig',
    volgorde: 1000,
    created_by: user!.id,
  })
  if (error) redirect(`/zaken/${zaakId}?error=${encodeURIComponent(error.message)}`)

  revalidatePath(`/zaken/${zaakId}`)
  redirect(`/zaken/${zaakId}#stap-5`)
}

export async function wisselInventarisatieItem(formData: FormData) {
  const zaakId = String(formData.get('zaak_id') ?? '')
  const itemId = String(formData.get('item_id') ?? '')
  const afgevinkt = formData.get('afgevinkt') === '1'

  const supabase = await createClient()
  await supabase.from('zaak_inventarisatie_items').update({ afgevinkt }).eq('id', itemId)

  revalidatePath(`/zaken/${zaakId}`)
}

export async function verwijderInventarisatieItem(formData: FormData) {
  const zaakId = String(formData.get('zaak_id') ?? '')
  const itemId = String(formData.get('item_id') ?? '')

  const supabase = await createClient()
  await supabase.from('zaak_inventarisatie_items').delete().eq('id', itemId)

  revalidatePath(`/zaken/${zaakId}`)
}

// Handmatig een stap als klaar markeren (of weer openen). Alleen voor de
// stappen die niet vanzelf uit de gegevens af te leiden zijn.
export async function zetStapMarkering(formData: FormData) {
  const zaakId = String(formData.get('zaak_id') ?? '')
  const kolom = String(formData.get('kolom') ?? '')
  const klaar = formData.get('klaar') === '1'

  if (kolom !== 'inventarisatie_klaar_op' && kolom !== 'bezoek_afgerond_op') {
    redirect(`/zaken/${zaakId}?error=${encodeURIComponent('Ongeldige stap')}`)
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('zaken')
    .update({ [kolom]: klaar ? new Date().toISOString() : null })
    .eq('id', zaakId)
  if (error) redirect(`/zaken/${zaakId}?error=${encodeURIComponent(error.message)}`)

  revalidatePath(`/zaken/${zaakId}`)
}
