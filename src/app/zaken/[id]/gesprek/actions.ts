'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { transcribeerAudio } from '@/lib/gesprekken/transcribeer'

// Transcriptie gebeurt synchroon binnen dezelfde aanroep — Whisper
// transcribeert een gesprek van een uur in enkele tientallen seconden, dus
// dit past ruim binnen de serverless-functietijdslimiet (zie
// src/app/zaken/[id]/page.tsx voor waarom die limiet er is en hoeveel ruimte
// er is). Geen stappenlogica/polling nodig zoals bij rapportgeneratie.
export async function startTranscriptie(zaakId: string, storagePath: string, duurSeconden: number) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: gesprek, error } = await supabase
    .from('zaak_gesprekken')
    .insert({ zaak_id: zaakId, storage_path: storagePath, duur_seconden: duurSeconden, opgenomen_door: user!.id })
    .select('id')
    .single()

  if (error || !gesprek) {
    redirect(`/zaken/${zaakId}?error=${encodeURIComponent(error?.message ?? 'Vastleggen van de opname is mislukt')}`)
  }

  await verwerkTranscriptie(supabase, gesprek.id)

  redirect(`/zaken/${zaakId}`)
}

// Zelfde opruimpatroon als verwijderDocument in ../actions.ts: alleen het
// opslagobject verwijderen als er geen andere rij meer naar verwijst (hier
// altijd het geval, storage_path is 1-op-1 met een gesprek, maar consistent
// gecheckt voor het geval dat ooit verandert).
export async function verwijderGesprek(formData: FormData) {
  const zaakId = String(formData.get('zaak_id') ?? '')
  const gesprekId = String(formData.get('gesprek_id') ?? '')

  const supabase = await createClient()

  const { data: gesprek } = await supabase.from('zaak_gesprekken').select('storage_path').eq('id', gesprekId).single()

  const { error } = await supabase.from('zaak_gesprekken').delete().eq('id', gesprekId)

  if (error) {
    redirect(`/zaken/${zaakId}?error=${encodeURIComponent(error.message)}`)
  }

  if (gesprek?.storage_path) {
    const { count } = await supabase
      .from('zaak_gesprekken')
      .select('id', { count: 'exact', head: true })
      .eq('storage_path', gesprek.storage_path)

    if (!count) {
      await supabase.storage.from('documenten').remove([gesprek.storage_path])
    }
  }

  redirect(`/zaken/${zaakId}`)
}

async function verwerkTranscriptie(supabase: Awaited<ReturnType<typeof createClient>>, gesprekId: string) {
  const { data: gesprek } = await supabase.from('zaak_gesprekken').select('*').eq('id', gesprekId).single()
  if (!gesprek) return

  try {
    const { data: bestand, error: downloadError } = await supabase.storage
      .from('documenten')
      .download(gesprek.storage_path)

    if (downloadError || !bestand) {
      throw new Error(downloadError?.message ?? 'Downloaden van de opname is mislukt')
    }

    const bestandsnaam = gesprek.storage_path.split('/').pop() ?? 'opname.webm'
    const { transcript } = await transcribeerAudio(bestand, bestandsnaam)

    await supabase.from('zaak_gesprekken').update({ status: 'klaar', transcript }).eq('id', gesprekId)
  } catch (fout) {
    const melding = fout instanceof Error ? fout.message : String(fout)
    await supabase.from('zaak_gesprekken').update({ status: 'mislukt', foutmelding: melding }).eq('id', gesprekId)
  }
}
