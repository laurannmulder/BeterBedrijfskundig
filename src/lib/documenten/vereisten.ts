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
  | 'kvk_uittreksel'
  | 'opdrachtbrief'
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
  kvk_uittreksel: 'KvK-uittreksel',
  opdrachtbrief: 'Opdrachtbrief',
  overig: 'Overig document',
}

// Volgorde waarin documentcategorieën per onderneming getoond worden (alleen
// categorieën waarvoor daadwerkelijk een document is herkend worden getoond —
// zie src/lib/documenten/classificeer.ts).
export const ONDERNEMING_DOCUMENT_VOLGORDE: DocumentType[] = [
  'kvk_uittreksel',
  'jaarcijfers',
  'aangifte_ob',
  'leasecontract',
  'huurcontract',
  'bankafschriften',
  'arbeidsovereenkomst',
  'vof_contract',
  'vennootschapscontract',
]
