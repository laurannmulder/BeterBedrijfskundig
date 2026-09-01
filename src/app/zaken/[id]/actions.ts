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
  extraContext: string | null
): Promise<RapportageInput> {
  const { data: zaak } = await supabase.from('zaken').select('*').eq('id', zaakId).single()
  const { data: ondernemingenRows } = await supabase.from('ondernemingen').select('*').eq('zaak_id', zaakId)
  const { data: documentenRows } = await supabase.from('documenten').select('*').eq('zaak_id', zaakId)
  const { data: notitieRows } = await supabase
    .from('zaak_notities')
    .select('tekst')
    .eq('zaak_id', zaakId)
    .order('created_at')
  const { data: eerdereRapportageRows } = await supabase
    .from('rapportages')
    .select('inhoud, created_at')
    .eq('zaak_id', zaakId)
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
    notities: (notitieRows ?? []).map((n) => n.tekst),
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

  if (!tekst) {
    redirect(`/zaken/${zaakId}?error=${encodeURIComponent('Vul eerst tekst in')}`)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from('zaak_notities').insert({ zaak_id: zaakId, tekst, created_by: user!.id })

  if (error) {
    redirect(`/zaken/${zaakId}?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath(`/zaken/${zaakId}`)
  redirect(`/zaken/${zaakId}`)
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
  extraBestanden: GeuploadBestand[]
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
    .insert({ zaak_id: zaakId, extra_context: extraContext, gestart_door: user!.id })
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
    const input = await laadRapportageInput(supabase, generatie.zaak_id, generatie.extra_context)
    const stapResultaat = await voerGeneratieStapUit(input, generatie.stap, generatie.rapportage_tekst)

    if (!stapResultaat.klaar) {
      const volgendeStap = generatie.stap + 1
      await supabase
        .from('rapportage_generaties')
        .update({ stap: volgendeStap, rapportage_tekst: stapResultaat.rapportage, updated_at: new Date().toISOString() })
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
    const melding = fout instanceof Error ? fout.message : String(fout)
    await supabase
      .from('rapportage_generaties')
      .update({ status: 'mislukt', foutmelding: melding, updated_at: new Date().toISOString() })
      .eq('id', generatieId)

    return { status: 'mislukt', stap: generatie.stap, totaalStappen: GENERATIE_STAPPEN.length, stapNaam: null, rapportageId: null, foutmelding: melding }
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
