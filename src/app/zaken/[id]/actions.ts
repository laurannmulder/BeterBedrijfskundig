'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { DOCUMENT_LABELS, type DocumentType } from '@/lib/documenten/vereisten'
import { genereerRapportageTekst, type DocumentFeit, type OndernemingFeit } from '@/lib/rapportage/genereer'

export async function uploadDocument(formData: FormData) {
  const documentId = String(formData.get('document_id') ?? '')
  const zaakId = String(formData.get('zaak_id') ?? '')
  const file = formData.get('file') as File | null

  if (!file || file.size === 0) {
    redirect(`/zaken/${zaakId}?error=${encodeURIComponent('Kies eerst een bestand')}`)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: bestaandDocument } = await supabase
    .from('documenten')
    .select('storage_path')
    .eq('id', documentId)
    .single()

  const path = `${zaakId}/${documentId}/${file.name}`

  // Bij vervangen met een andere bestandsnaam blijft anders het oude bestand als wees achter.
  if (bestaandDocument?.storage_path && bestaandDocument.storage_path !== path) {
    await supabase.storage.from('documenten').remove([bestaandDocument.storage_path])
  }

  const { error: uploadError } = await supabase.storage
    .from('documenten')
    .upload(path, file, { upsert: true })

  if (uploadError) {
    redirect(`/zaken/${zaakId}?error=${encodeURIComponent(uploadError.message)}`)
  }

  const { error: updateError } = await supabase
    .from('documenten')
    .update({
      storage_path: path,
      status: 'geupload',
      uploaded_at: new Date().toISOString(),
      uploaded_by: user!.id,
    })
    .eq('id', documentId)

  if (updateError) {
    redirect(`/zaken/${zaakId}?error=${encodeURIComponent(updateError.message)}`)
  }

  revalidatePath(`/zaken/${zaakId}`)
}

export async function genereerRapportage(formData: FormData) {
  const zaakId = String(formData.get('zaak_id') ?? '')
  const extraContext = String(formData.get('extra_context') ?? '').trim() || null
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

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
      label: DOCUMENT_LABELS[doc.type as DocumentType],
      jaar: doc.jaar,
      onderneming: doc.onderneming_id ? (ondernemingNaamPerId.get(doc.onderneming_id) ?? null) : null,
    }

    const { data: bestand } = await supabase.storage.from('documenten').download(doc.storage_path!)
    if (!bestand) {
      documenten.push({ ...basis, kind: 'onleesbaar' })
      continue
    }

    const mediaType = bestand.type
    if (mediaType === 'application/pdf') {
      const buffer = Buffer.from(await bestand.arrayBuffer())
      documenten.push({ ...basis, kind: 'pdf', base64: buffer.toString('base64') })
    } else if (mediaType.startsWith('image/')) {
      const buffer = Buffer.from(await bestand.arrayBuffer())
      documenten.push({ ...basis, kind: 'afbeelding', base64: buffer.toString('base64'), mediaType })
    } else if (mediaType === 'text/plain' || mediaType === '') {
      documenten.push({ ...basis, kind: 'tekst', tekst: await bestand.text() })
    } else {
      documenten.push({ ...basis, kind: 'onleesbaar' })
    }
  }

  const ontbrekendeVerplichteDocumenten = documentenRows
    .filter((d) => d.verplicht && d.status === 'ontbreekt')
    .map((d) => {
      const label = DOCUMENT_LABELS[d.type as DocumentType]
      const onderneming = d.onderneming_id ? ondernemingNaamPerId.get(d.onderneming_id) : null
      return `${label}${d.jaar ? ` ${d.jaar}` : ''}${onderneming ? ` — ${onderneming}` : ''}`
    })

  const inhoud = await genereerRapportageTekst({
    naamBetrokkene: zaak.naam_betrokkene,
    dossiernummer: zaak.dossiernummer,
    ongevalsdatum: zaak.ongevalsdatum,
    ondernemingen,
    documenten,
    ontbrekendeVerplichteDocumenten,
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
