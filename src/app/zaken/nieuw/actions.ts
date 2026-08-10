'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { bepaalVereisteDocumenten, type Rechtsvorm } from '@/lib/documenten/vereisten'

export async function createZaak(formData: FormData) {
  const dossiernummer = String(formData.get('dossiernummer') ?? '').trim() || null
  const naam_betrokkene = String(formData.get('naam_betrokkene') ?? '').trim()
  const ongevalsdatumStr = String(formData.get('ongevalsdatum') ?? '')
  const aantalOndernemingen = Number(formData.get('aantal_ondernemingen') ?? '0')

  if (!naam_betrokkene || !ongevalsdatumStr || aantalOndernemingen < 1) {
    redirect(`/zaken/nieuw?error=${encodeURIComponent('Vul alle verplichte velden in')}`)
  }

  const ongevalsdatum = new Date(ongevalsdatumStr)

  const ondernemingenInput = Array.from({ length: aantalOndernemingen }, (_, i) => ({
    naam: String(formData.get(`onderneming_naam_${i}`) ?? '').trim(),
    rechtsvorm: String(formData.get(`onderneming_rechtsvorm_${i}`) ?? '') as Rechtsvorm,
    oprichtingsdatum: String(formData.get(`onderneming_oprichtingsdatum_${i}`) ?? ''),
    kvk_nummer: String(formData.get(`onderneming_kvk_${i}`) ?? '').trim() || null,
  }))

  if (ondernemingenInput.some((o) => !o.naam || !o.rechtsvorm || !o.oprichtingsdatum)) {
    redirect(`/zaken/nieuw?error=${encodeURIComponent('Vul alle ondernemingsgegevens in')}`)
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: zaak, error: zaakError } = await supabase
    .from('zaken')
    .insert({
      dossiernummer,
      naam_betrokkene,
      ongevalsdatum: ongevalsdatumStr,
      created_by: user!.id,
    })
    .select()
    .single()

  if (zaakError || !zaak) {
    redirect(`/zaken/nieuw?error=${encodeURIComponent(zaakError?.message ?? 'Aanmaken zaak mislukt')}`)
  }

  const { data: ondernemingen, error: ondernemingenError } = await supabase
    .from('ondernemingen')
    .insert(
      ondernemingenInput.map((o) => ({
        zaak_id: zaak.id,
        naam: o.naam,
        rechtsvorm: o.rechtsvorm,
        oprichtingsdatum: o.oprichtingsdatum,
        kvk_nummer: o.kvk_nummer,
      }))
    )
    .select()

  if (ondernemingenError || !ondernemingen) {
    redirect(
      `/zaken/nieuw?error=${encodeURIComponent(ondernemingenError?.message ?? 'Aanmaken ondernemingen mislukt')}`
    )
  }

  const vereisteDocumenten = bepaalVereisteDocumenten(
    ongevalsdatum,
    ondernemingen.map((o) => ({
      id: o.id,
      rechtsvorm: o.rechtsvorm,
      oprichtingsdatum: new Date(o.oprichtingsdatum),
    }))
  )

  const { error: documentenError } = await supabase.from('documenten').insert(
    vereisteDocumenten.map((d) => ({
      zaak_id: zaak.id,
      onderneming_id: d.onderneming_id,
      type: d.type,
      jaar: d.jaar,
      verplicht: d.verplicht,
    }))
  )

  if (documentenError) {
    redirect(`/zaken/nieuw?error=${encodeURIComponent(documentenError.message)}`)
  }

  redirect(`/zaken/${zaak.id}`)
}
