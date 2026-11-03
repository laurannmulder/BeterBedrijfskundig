import { createClient } from '@/lib/supabase/server'
import type { ZaakRij } from '@/components/ZakenLijst'

function relatieveTijd(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minuten = Math.round(diffMs / 60000)
  if (minuten < 1) return 'zojuist'
  if (minuten < 60) return `${minuten} min geleden`
  const uren = Math.round(minuten / 60)
  if (uren < 24) return `${uren} uur geleden`
  const dagen = Math.round(uren / 24)
  if (dagen < 30) return `${dagen} dag${dagen === 1 ? '' : 'en'} geleden`
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export interface ZakenOverzicht {
  rijen: ZaakRij[]
  aantalConcept: number
  aantalZonderDocumenten: number
}

// Lopende of afgesloten zaken met de gegevens voor het overzicht — gedeeld
// door "/" (lopend) en "/afgesloten" (archief).
export async function laadZakenOverzicht(afgesloten: boolean): Promise<ZakenOverzicht> {
  const supabase = await createClient()

  const basis = supabase
    .from('zaken')
    .select('id, naam_betrokkene, dossiernummer, ongevalsdatum, laatst_bewerkt, afgesloten_op')

  const { data: zaken } = await (afgesloten
    ? basis.not('afgesloten_op', 'is', null).order('afgesloten_op', { ascending: false })
    : basis.is('afgesloten_op', null).order('laatst_bewerkt', { ascending: false }))

  const { data: documenten } = await supabase.from('documenten').select('zaak_id, status')
  const { data: rapportages } = await supabase
    .from('rapportages')
    .select('zaak_id, status, created_at')
    .order('created_at', { ascending: false })

  const aantalDocumentenPerZaak = new Map<string, number>()
  for (const d of documenten ?? []) {
    if (d.status !== 'geupload') continue
    aantalDocumentenPerZaak.set(d.zaak_id, (aantalDocumentenPerZaak.get(d.zaak_id) ?? 0) + 1)
  }

  const laatsteRapportageStatus = new Map<string, string>()
  for (const r of rapportages ?? []) {
    if (!laatsteRapportageStatus.has(r.zaak_id)) laatsteRapportageStatus.set(r.zaak_id, r.status)
  }

  const rijen: ZaakRij[] = (zaken ?? []).map((z) => ({
    id: z.id,
    naam: z.naam_betrokkene,
    dossiernummer: z.dossiernummer,
    ongevalsdatum: z.ongevalsdatum,
    aantalDocumenten: aantalDocumentenPerZaak.get(z.id) ?? 0,
    rapportageStatus: laatsteRapportageStatus.get(z.id) ?? null,
    bijgewerkt:
      afgesloten && z.afgesloten_op
        ? `afgesloten ${new Date(z.afgesloten_op).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}`
        : relatieveTijd(z.laatst_bewerkt),
  }))

  return {
    rijen,
    aantalConcept: rijen.filter((r) => r.rapportageStatus === 'concept').length,
    aantalZonderDocumenten: rijen.filter((r) => r.aantalDocumenten === 0).length,
  }
}
