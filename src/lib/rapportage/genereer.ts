import type Anthropic from '@anthropic-ai/sdk'
import { createClaudeClient } from '@/lib/claude'
import { RAPPORTAGE_SJABLOON } from './sjabloon'

export interface OndernemingFeit {
  naam: string
  rechtsvorm: string
  oprichtingsdatum: string
  kvk_nummer: string | null
}

// PDF's en scans (foto/scan van een document) worden ongewijzigd aan Claude
// meegegeven — Claude leest PDF-tekst en scans/afbeeldingen native, dus er is
// geen aparte OCR-stap nodig. Platte tekst (bv. de fictieve testbestanden)
// gaat gewoon als tekst mee.
interface DocumentBasis {
  label: string
  jaar: number | null
  onderneming: string | null
}

export type DocumentFeit =
  | (DocumentBasis & { kind: 'tekst'; tekst: string })
  | (DocumentBasis & { kind: 'pdf'; base64: string })
  | (DocumentBasis & { kind: 'afbeelding'; base64: string; mediaType: string })
  | (DocumentBasis & { kind: 'onleesbaar' })

export interface RapportageInput {
  naamBetrokkene: string
  dossiernummer: string | null
  ongevalsdatum: string
  ondernemingen: OndernemingFeit[]
  documenten: DocumentFeit[]
  ontbrekendeVerplichteDocumenten: string[]
  extraContext: string | null
}

type ContentBlock = Anthropic.Messages.TextBlockParam | Anthropic.Messages.DocumentBlockParam | Anthropic.Messages.ImageBlockParam

function documentTitel(d: DocumentFeit): string {
  return `${d.label}${d.jaar ? ` ${d.jaar}` : ''}${d.onderneming ? ` — ${d.onderneming}` : ''}`
}

function documentBlokken(documenten: DocumentFeit[]): ContentBlock[] {
  const blokken: ContentBlock[] = []

  for (const d of documenten) {
    blokken.push({ type: 'text', text: `### ${documentTitel(d)}` })

    switch (d.kind) {
      case 'tekst':
        blokken.push({ type: 'text', text: d.tekst })
        break
      case 'pdf':
        blokken.push({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: d.base64 },
        })
        break
      case 'afbeelding':
        blokken.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: d.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: d.base64,
          },
        })
        break
      case 'onleesbaar':
        blokken.push({
          type: 'text',
          text: '[Bestand aangeleverd maar bestandstype wordt niet ondersteund — handmatige beoordeling door de bedrijfskundige nodig.]',
        })
        break
    }
  }

  return blokken
}

export async function genereerRapportageTekst(input: RapportageInput): Promise<string> {
  const client = createClaudeClient()

  const ondernemingenTekst = input.ondernemingen
    .map(
      (o) =>
        `- ${o.naam} (${o.rechtsvorm}, opgericht ${o.oprichtingsdatum}${
          o.kvk_nummer ? `, KvK ${o.kvk_nummer}` : ''
        })`
    )
    .join('\n')

  const ontbrekendTekst =
    input.ontbrekendeVerplichteDocumenten.length > 0
      ? `Let op: de volgende verplichte documenten ontbreken nog en moeten in hoofdstuk 7 (Voortgang) worden genoemd:\n${input.ontbrekendeVerplichteDocumenten.join('\n')}\n\n`
      : ''

  const extraContextTekst = input.extraContext
    ? `Aanvullende informatie/instructies van de bedrijfskundige voor deze versie (weeg dit mee, maar verzin niets extra's daarbuiten):\n${input.extraContext}\n\n`
    : ''

  const opdrachtTekst = `Stel een CONCEPT bedrijfskundige rapportage op voor de volgende zaak.

Betrokkene: ${input.naamBetrokkene}
Dossiernummer: ${input.dossiernummer ?? 'onbekend'}
Ongevalsdatum: ${input.ongevalsdatum}

Onderneming(en):
${ondernemingenTekst}

${ontbrekendTekst}${extraContextTekst}Hieronder volgen de aangeleverde documenten (als tekst, PDF of scan), gevolgd door de opdracht.`

  const afsluitingTekst = `Baseer de analyse uitsluitend op de hierboven aangeleverde documenten. Waar informatie ontbreekt of onduidelijk is (ook als een PDF/scan onleesbaar of onvolledig blijkt), benoem dit expliciet in plaats van te verzinnen. Dit is een CONCEPT — markeer aannames duidelijk zodat de bedrijfskundige ze kan controleren.`

  // max_tokens is a cap on thinking + response text combined (thinking is on
  // by default on claude-opus-5) — kept generous, and streamed since output
  // this large risks an HTTP timeout on a non-streaming call.
  const stream = client.messages.stream({
    model: 'claude-opus-5',
    max_tokens: 32000,
    system: [
      {
        type: 'text',
        text: `Je bent een bedrijfskundige die rapportages opstelt over gemiste inkomsten van ondernemers met letsel, in opdracht van verzekeraars. Schrijf in het Nederlands, zakelijk en feitelijk. Volg exact de onderstaande structuur.\n\n${RAPPORTAGE_SJABLOON}`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: opdrachtTekst },
          ...documentBlokken(input.documenten),
          { type: 'text', text: afsluitingTekst },
        ],
      },
    ],
  })

  const message = await stream.finalMessage()

  return message.content
    .filter((block): block is Extract<typeof block, { type: 'text' }> => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
}
