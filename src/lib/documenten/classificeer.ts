import type Anthropic from '@anthropic-ai/sdk'
import { createClaudeClient } from '@/lib/claude'
import type { DocumentType, Rechtsvorm } from './vereisten'
import type { BestandInhoud } from './lees-bestand'

// Categorieën die de classificatie kan herkennen. "overig" hoort hier bewust
// niet bij — dat is de lokale fallback (in de aanroeper) voor wanneer er
// niets van onderstaande lijst herkend wordt, geen keuze die Claude zelf maakt.
const CLASSIFICEERBARE_TYPES: Exclude<DocumentType, 'overig'>[] = [
  'aangifte_ib',
  'jaarcijfers',
  'aangifte_ob',
  'leasecontract',
  'huurcontract',
  'bankafschriften',
  'arbeidsovereenkomst',
  'vof_contract',
  'vennootschapscontract',
  'kvk_uittreksel',
  'opdrachtbrief',
]

const RECHTSVORMEN: Rechtsvorm[] = ['eenmanszaak', 'vof', 'bv', 'overig']

export interface GeclassificeerdeCategorie {
  type: Exclude<DocumentType, 'overig'>
  jaar: number | null
}

export interface GeextraheerdeMetadata {
  ondernemingNaam: string | null
  rechtsvorm: Rechtsvorm | null
  oprichtingsdatum: string | null
  kvkNummer: string | null
  ongevalsdatum: string | null
}

export interface ClassificatieResultaat {
  categorieen: GeclassificeerdeCategorie[]
  metadata: GeextraheerdeMetadata
}

const LEEG_RESULTAAT: ClassificatieResultaat = {
  categorieen: [],
  metadata: {
    ondernemingNaam: null,
    rechtsvorm: null,
    oprichtingsdatum: null,
    kvkNummer: null,
    ongevalsdatum: null,
  },
}

const TOOL: Anthropic.Messages.Tool = {
  name: 'classificeer_document',
  description:
    'Registreer welke documentcategorieën in het aangeleverde bestand voorkomen (een bestand kan er meerdere bevatten, ook meerdere jaren tegelijk), plus eventuele metadata die het bestand zelf vermeldt.',
  input_schema: {
    type: 'object',
    properties: {
      categorieen: {
        type: 'array',
        description: 'Eén item per herkende categorie+jaar-combinatie. Leeg als niets herkend wordt.',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: CLASSIFICEERBARE_TYPES },
            jaar: {
              type: ['integer', 'null'],
              description:
                'Het jaar waarop het document betrekking heeft (bv. boekjaar van de jaarcijfers, jaar van de aangifte). Null voor niet-jaargebonden types (vof_contract, vennootschapscontract, kvk_uittreksel, opdrachtbrief).',
            },
          },
          required: ['type', 'jaar'],
        },
      },
      metadata: {
        type: 'object',
        description:
          'Alleen invullen wat het document zelf expliciet vermeldt — nooit raden of aanvullen met kennis van buiten het document. Onbekend/niet vermeld = null.',
        properties: {
          ondernemingNaam: { type: ['string', 'null'], description: 'Handelsnaam/statutaire naam van de onderneming.' },
          rechtsvorm: { type: ['string', 'null'], enum: [...RECHTSVORMEN, null] },
          oprichtingsdatum: { type: ['string', 'null'], description: 'Datum van oprichting/inschrijving, formaat YYYY-MM-DD.' },
          kvkNummer: { type: ['string', 'null'] },
          ongevalsdatum: { type: ['string', 'null'], description: 'Datum van het ongeval zoals vermeld in bv. een opdrachtbrief, formaat YYYY-MM-DD.' },
        },
        required: ['ondernemingNaam', 'rechtsvorm', 'oprichtingsdatum', 'kvkNummer', 'ongevalsdatum'],
      },
    },
    required: ['categorieen', 'metadata'],
  },
}

const SYSTEM_PROMPT = `Je classificeert een aangeleverd document voor een bedrijfskundige die letselschaderapportages opstelt. Roep altijd de tool classificeer_document aan met je bevindingen — antwoord nooit met platte tekst.

Categorieën en hun betekenis:
- aangifte_ib: aangifte inkomstenbelasting van de betrokkene (particulier, niet van een onderneming).
- jaarcijfers: jaarrekening/jaarcijfers van een onderneming (balans, winst-en-verliesrekening).
- aangifte_ob: aangifte omzetbelasting (btw-aangifte) van een onderneming.
- leasecontract, huurcontract: contracten van een onderneming.
- bankafschriften: bankafschriften van een onderneming.
- arbeidsovereenkomst: arbeidsovereenkomst(en) met werknemers van een onderneming.
- vof_contract: vennootschapscontract van een VOF.
- vennootschapscontract: oprichtingsakte/statuten van een BV.
- kvk_uittreksel: uittreksel Kamer van Koophandel.
- opdrachtbrief: de opdrachtbrief/-bevestiging voor deze letselschadezaak (vermeldt vaak de ongevalsdatum).

Een bestand kan meerdere categorieën bevatten (bv. jaarcijfers van meerdere jaren, of jaarcijfers én een aangifte IB in hetzelfde bestand) — geef dan meerdere items terug in "categorieen". Geef een lege lijst terug als niets uit de lijst herkenbaar in het document voorkomt.`

function contentBlok(inhoud: BestandInhoud): Anthropic.Messages.ContentBlockParam | null {
  switch (inhoud.kind) {
    case 'tekst':
      return { type: 'text', text: inhoud.tekst }
    case 'pdf':
      return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: inhoud.base64 } }
    case 'afbeelding':
      return {
        type: 'image',
        source: {
          type: 'base64',
          media_type: inhoud.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: inhoud.base64,
        },
      }
    case 'onleesbaar':
      return null
  }
}

export async function classificeerDocument(inhoud: BestandInhoud): Promise<ClassificatieResultaat> {
  const blok = contentBlok(inhoud)
  if (!blok) return LEEG_RESULTAAT

  const client = createClaudeClient()

  const message = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 4000,
    tools: [TOOL],
    tool_choice: { type: 'auto' },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: [blok, { type: 'text', text: 'Classificeer dit document.' }] }],
  })

  const toolUse = message.content.find(
    (block): block is Extract<typeof block, { type: 'tool_use' }> => block.type === 'tool_use'
  )

  if (!toolUse) return LEEG_RESULTAAT

  const input = toolUse.input as {
    categorieen?: { type: string; jaar: number | null }[]
    metadata?: Partial<GeextraheerdeMetadata>
  }

  const categorieen: GeclassificeerdeCategorie[] = (input.categorieen ?? [])
    .filter((c): c is { type: Exclude<DocumentType, 'overig'>; jaar: number | null } =>
      (CLASSIFICEERBARE_TYPES as string[]).includes(c.type)
    )
    .map((c) => ({ type: c.type, jaar: c.jaar ?? null }))

  return {
    categorieen,
    metadata: {
      ondernemingNaam: input.metadata?.ondernemingNaam ?? null,
      rechtsvorm: input.metadata?.rechtsvorm ?? null,
      oprichtingsdatum: input.metadata?.oprichtingsdatum ?? null,
      kvkNummer: input.metadata?.kvkNummer ?? null,
      ongevalsdatum: input.metadata?.ongevalsdatum ?? null,
    },
  }
}
