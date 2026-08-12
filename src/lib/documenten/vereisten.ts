export type Rechtsvorm = 'eenmanszaak' | 'vof' | 'bv' | 'overig'

export type DocumentType =
  | 'aangifte_ib'
  | 'jaarcijfers'
  | 'aangifte_ob'
  | 'leasecontract'
  | 'huurcontract'
  | 'bankafschriften'
  | 'arbeidsovereenkomst'
  | 'vof_contract'
  | 'vennootschapscontract'
  | 'overig'

export const RECHTSVORM_LABELS: Record<Rechtsvorm, string> = {
  eenmanszaak: 'Eenmanszaak',
  vof: 'VOF',
  bv: 'BV',
  overig: 'Overig',
}

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  aangifte_ib: 'Aangifte inkomstenbelasting',
  jaarcijfers: 'Jaarcijfers',
  aangifte_ob: 'Aangifte omzetbelasting',
  leasecontract: 'Leasecontract',
  huurcontract: 'Huurcontract',
  bankafschriften: 'Bankafschriften',
  arbeidsovereenkomst: 'Arbeidsovereenkomsten werknemers',
  vof_contract: 'VOF-contract',
  vennootschapscontract: 'Vennootschapscontract',
  overig: 'Overig document',
}

// Volgorde waarin documentcategorieën per onderneming getoond worden.
export const ONDERNEMING_DOCUMENT_VOLGORDE: DocumentType[] = [
  'jaarcijfers',
  'aangifte_ob',
  'leasecontract',
  'huurcontract',
  'bankafschriften',
  'arbeidsovereenkomst',
  'vof_contract',
  'vennootschapscontract',
]

export interface OndernemingInput {
  id: string
  rechtsvorm: Rechtsvorm | null
  oprichtingsdatum: Date | null
}

export interface VereisteDocument {
  onderneming_id: string | null
  type: DocumentType
  jaar: number | null
  verplicht: boolean
}

// 5 jaar vóór het ongevalsjaar t/m nu, of vanaf oprichting als de onderneming
// korter bestaat dan die 5 jaar.
function jarenReeks(oprichtingsdatum: Date, ongevalsdatum: Date): number[] {
  const ongevalsjaar = ongevalsdatum.getFullYear()
  const oprichtingsjaar = oprichtingsdatum.getFullYear()
  const startJaar = Math.max(oprichtingsjaar, ongevalsjaar - 5)
  const eindJaar = new Date().getFullYear()

  const jaren: number[] = []
  for (let jaar = startJaar; jaar <= eindJaar; jaar++) jaren.push(jaar)
  return jaren
}

// Berekent alleen de documenten waarvoor genoeg gegevens bekend zijn. Ontbreekt
// de ongevalsdatum, dan kunnen geen jaargebonden documenten (aangifte IB,
// jaarcijfers, etc.) worden bepaald voor de hele zaak. Ontbreekt bij een
// onderneming de oprichtingsdatum, dan geldt dat alleen voor die onderneming —
// een VOF-/vennootschapscontract kan nog wel bepaald worden zodra de
// rechtsvorm bekend is, want die is niet jaargebonden.
export function bepaalVereisteDocumenten(
  ongevalsdatum: Date | null,
  ondernemingen: OndernemingInput[]
): VereisteDocument[] {
  const documenten: VereisteDocument[] = []

  if (ongevalsdatum) {
    // Aangifte IB hoort bij de betrokkene, niet bij een specifieke onderneming —
    // jaren gebaseerd op de oudste onderneming in de zaak.
    const oudsteOprichting = ondernemingen.reduce<Date | null>((oudste, onderneming) => {
      if (!onderneming.oprichtingsdatum) return oudste
      if (!oudste || onderneming.oprichtingsdatum < oudste) return onderneming.oprichtingsdatum
      return oudste
    }, null)

    if (oudsteOprichting) {
      for (const jaar of jarenReeks(oudsteOprichting, ongevalsdatum)) {
        documenten.push({ onderneming_id: null, type: 'aangifte_ib', jaar, verplicht: true })
      }
    }
  }

  for (const onderneming of ondernemingen) {
    if (ongevalsdatum && onderneming.oprichtingsdatum) {
      const jaren = jarenReeks(onderneming.oprichtingsdatum, ongevalsdatum)

      for (const jaar of jaren) {
        documenten.push({ onderneming_id: onderneming.id, type: 'jaarcijfers', jaar, verplicht: true })
        documenten.push({ onderneming_id: onderneming.id, type: 'aangifte_ob', jaar, verplicht: false })
        documenten.push({ onderneming_id: onderneming.id, type: 'leasecontract', jaar, verplicht: false })
        documenten.push({ onderneming_id: onderneming.id, type: 'huurcontract', jaar, verplicht: false })
        documenten.push({ onderneming_id: onderneming.id, type: 'bankafschriften', jaar, verplicht: false })
        documenten.push({ onderneming_id: onderneming.id, type: 'arbeidsovereenkomst', jaar, verplicht: false })
      }
    }

    if (onderneming.rechtsvorm === 'vof') {
      documenten.push({ onderneming_id: onderneming.id, type: 'vof_contract', jaar: null, verplicht: true })
    }
    if (onderneming.rechtsvorm === 'bv') {
      documenten.push({
        onderneming_id: onderneming.id,
        type: 'vennootschapscontract',
        jaar: null,
        verplicht: true,
      })
    }
  }

  return documenten
}
