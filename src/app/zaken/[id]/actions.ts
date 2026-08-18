'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { DOCUMENT_LABELS, type DocumentType } from '@/lib/documenten/vereisten'
import { leesBestandInhoud } from '@/lib/documenten/lees-bestand'
import { verwerkGeuploadBestand } from '@/lib/documenten/verwerk-upload'
import { genereerRapportageTekst, type DocumentFeit, type OndernemingFeit } from '@/lib/rapportage/genereer'

export interface GeuploadBestand {
  path: string
  naam: string
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

export async function genereerRapportageActie(
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

  const { data: zaak } = await supabase.from('zaken').select('*').eq('id', zaakId).single()
  const { data: ondernemingenRows } = await supabase
    .from('ondernemingen')
    .select('*')
    .eq('zaak_id', zaakId)
  const { data: documentenRows } = await supabase.from('documenten').select('*').eq('zaak_id', zaakId)

  if (!zaak || !ondernemingenRows || !documentenRows) {
    redirect(`/zaken/${zaakId}?error=${encodeURIComponent('Zaakgegevens konden niet worden geladen')}`)
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

  const inhoud = await genereerRapportageTekst({
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
    extraContext,
  })

  const { data: nieuweRapportage, error: insertError } = await supabase
    .from('rapportages')
    .insert({
      zaak_id: zaakId,
      inhoud,
      extra_context: extraContext,
      gegenereerd_door: user!.id,
    })
    .select('id')
    .single()

  if (insertError || !nieuweRapportage) {
    redirect(`/zaken/${zaakId}?error=${encodeURIComponent(insertError?.message ?? 'Opslaan rapportage mislukt')}`)
  }

  redirect(`/zaken/${zaakId}/rapportages/${nieuweRapportage.id}`)
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
