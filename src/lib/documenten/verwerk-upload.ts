import type { createClient } from '@/lib/supabase/server'
import { leesBestandInhoud } from './lees-bestand'
import { classificeerDocument, type GeextraheerdeMetadata } from './classificeer'
import type { DocumentType } from './vereisten'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

// Categorieën die bij een specifieke onderneming horen — voor deze types
// wordt de rij alleen aangemaakt als er een onderneming aan gekoppeld kan
// worden (bestaand of net aangemaakt uit de geëxtraheerde metadata).
// aangifte_ib en opdrachtbrief horen bij de zaak/betrokkene, niet bij één
// onderneming.
const ONDERNEMING_GESCOPEERDE_TYPES = new Set<DocumentType>([
  'jaarcijfers',
  'aangifte_ob',
  'leasecontract',
  'huurcontract',
  'bankafschriften',
  'arbeidsovereenkomst',
  'vof_contract',
  'vennootschapscontract',
  'kvk_uittreksel',
])

// Vult zaken.ongevalsdatum alleen aan als die nog niet bekend is — overschrijft
// nooit een al ingevulde waarde.
async function vulOngevalsdatumAan(supabase: SupabaseClient, zaakId: string, ongevalsdatum: string | null) {
  if (!ongevalsdatum) return

  const { data: zaak } = await supabase.from('zaken').select('ongevalsdatum').eq('id', zaakId).single()
  if (zaak && !zaak.ongevalsdatum) {
    await supabase.from('zaken').update({ ongevalsdatum }).eq('id', zaakId)
  }
}

// Matcht op naam (case-insensitive, getrimd) tegen bestaande ondernemingen van
// de zaak. Bij een match wordt alleen aangevuld wat nog leeg is; zonder match
// wordt een nieuwe onderneming aangemaakt. Geeft null terug als er geen naam
// geëxtraheerd is (dan is er niets om op te matchen of aan te maken).
async function matchOfMaakOnderneming(
  supabase: SupabaseClient,
  zaakId: string,
  metadata: GeextraheerdeMetadata
): Promise<string | null> {
  const naam = metadata.ondernemingNaam?.trim()
  if (!naam) return null

  const { data: bestaande } = await supabase.from('ondernemingen').select('*').eq('zaak_id', zaakId)
  const match = bestaande?.find((o) => o.naam.trim().toLowerCase() === naam.toLowerCase())

  if (match) {
    const updates: Record<string, string> = {}
    if (!match.rechtsvorm && metadata.rechtsvorm) updates.rechtsvorm = metadata.rechtsvorm
    if (!match.oprichtingsdatum && metadata.oprichtingsdatum) updates.oprichtingsdatum = metadata.oprichtingsdatum
    if (!match.kvk_nummer && metadata.kvkNummer) updates.kvk_nummer = metadata.kvkNummer

    if (Object.keys(updates).length > 0) {
      await supabase.from('ondernemingen').update(updates).eq('id', match.id)
    }

    return match.id
  }

  const { data: nieuw } = await supabase
    .from('ondernemingen')
    .insert({
      zaak_id: zaakId,
      naam,
      rechtsvorm: metadata.rechtsvorm,
      oprichtingsdatum: metadata.oprichtingsdatum,
      kvk_nummer: metadata.kvkNummer,
    })
    .select()
    .single()

  return nieuw?.id ?? null
}

export interface VerwerkUploadResultaat {
  bestandsnaam: string
  ok: boolean
  error?: string
}

// Upload één bestand naar Storage, laat het classificeren, vult zaak-/
// ondernemingsmetadata aan waar die nog ontbreekt, en maakt voor elke
// herkende categorie+jaar-combinatie een documenten-rij aan (allemaal
// wijzend naar hetzelfde geüploade bestand — één bestand kan aan meerdere
// categorieën voldoen). Niets herkend of onleesbaar → één rij als "overig",
// zodat het bestand nooit stilzwijgend verdwijnt.
export async function verwerkUpload(
  supabase: SupabaseClient,
  zaakId: string,
  userId: string,
  bestand: File
): Promise<VerwerkUploadResultaat> {
  const path = `${zaakId}/${crypto.randomUUID()}/${bestand.name}`

  const { error: uploadError } = await supabase.storage.from('documenten').upload(path, bestand)
  if (uploadError) {
    return { bestandsnaam: bestand.name, ok: false, error: uploadError.message }
  }

  const inhoud = await leesBestandInhoud(bestand)
  const resultaat = await classificeerDocument(inhoud)

  await vulOngevalsdatumAan(supabase, zaakId, resultaat.metadata.ongevalsdatum)
  const ondernemingId = await matchOfMaakOnderneming(supabase, zaakId, resultaat.metadata)

  const herkendeRijen = resultaat.categorieen
    .filter((c) => !ONDERNEMING_GESCOPEERDE_TYPES.has(c.type) || ondernemingId !== null)
    .map((c) => ({
      type: c.type as DocumentType,
      jaar: c.jaar,
      onderneming_id: ONDERNEMING_GESCOPEERDE_TYPES.has(c.type) ? ondernemingId : null,
    }))

  const teInsert =
    herkendeRijen.length > 0 ? herkendeRijen : [{ type: 'overig' as DocumentType, jaar: null, onderneming_id: null }]

  const { error: insertError } = await supabase.from('documenten').insert(
    teInsert.map((rij) => ({
      zaak_id: zaakId,
      onderneming_id: rij.onderneming_id,
      type: rij.type,
      jaar: rij.jaar,
      verplicht: false,
      status: 'geupload',
      storage_path: path,
      uploaded_at: new Date().toISOString(),
      uploaded_by: userId,
    }))
  )

  if (insertError) {
    return { bestandsnaam: bestand.name, ok: false, error: insertError.message }
  }

  return { bestandsnaam: bestand.name, ok: true }
}
