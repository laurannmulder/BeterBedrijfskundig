'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { bepaalVereisteDocumenten, type Rechtsvorm } from '@/lib/documenten/vereisten'

export async function createZaak(formData: FormData) {
  const dossiernummer = String(formData.get('dossiernummer') ?? '').trim()
  const naam_betrokkene = String(formData.get('naam_betrokkene') ?? '').trim()
  const ongevalsdatumStr = String(formData.get('ongevalsdatum') ?? '').trim() || null
  const aantalOndernemingen = Number(formData.get('aantal_ondernemingen') ?? '0')

  if (!naam_betrokkene || !dossiernummer) {
    redirect(`/zaken/nieuw?error=${encodeURIComponent('Vul naam betrokkene en dossiernummer in')}`)
  }

  const ongevalsdatum = ongevalsdatumStr ? new Date(ongevalsdatumStr) : null

  // Andere velden (ongevalsdatum, ondernemingsgegevens) zijn optioneel — die
  // informatie kan ook uit de aangeleverde documenten blijken. Een onderneming
  // zonder naam wordt niet aangemaakt.
  const ondernemingenInput = Array.from({ length: aantalOndernemingen }, (_, i) => ({
    naam: String(formData.get(`onderneming_naam_${i}`) ?? '').trim(),
    rechtsvorm: (String(formData.get(`onderneming_rechtsvorm_${i}`) ?? '').trim() || null) as Rechtsvorm | null,
    oprichtingsdatum: String(formData.get(`onderneming_oprichtingsdatum_${i}`) ?? '').trim() || null,
    kvk_nummer: String(formData.get(`onderneming_kvk_${i}`) ?? '').trim() || null,
  })).filter((o) => o.naam)

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

  let ondernemingen: { id: string; rechtsvorm: Rechtsvorm | null; oprichtingsdatum: string | null }[] = []

  if (ondernemingenInput.length > 0) {
    const { data: ingevoegdeOndernemingen, error: ondernemingenError } = await supabase
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

    if (ondernemingenError || !ingevoegdeOndernemingen) {
      redirect(
        `/zaken/nieuw?error=${encodeURIComponent(ondernemingenError?.message ?? 'Aanmaken ondernemingen mislukt')}`
      )
    }

    ondernemingen = ingevoegdeOndernemingen
  }

  const vereisteDocumenten = bepaalVereisteDocumenten(
    ongevalsdatum,
    ondernemingen.map((o) => ({
      id: o.id,
      rechtsvorm: o.rechtsvorm,
      oprichtingsdatum: o.oprichtingsdatum ? new Date(o.oprichtingsdatum) : null,
    }))
  )

  if (vereisteDocumenten.length > 0) {
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
  }

  redirect(`/zaken/${zaak.id}`)
}
