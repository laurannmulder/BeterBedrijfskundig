import type Anthropic from '@anthropic-ai/sdk'
import { createClaudeClient } from '@/lib/claude'
import { RAPPORTAGE_SJABLOON } from './sjabloon'

export interface OndernemingFeit {
  naam: string
  rechtsvorm: string | null
  oprichtingsdatum: string | null
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

export interface VerzekeraarFeit {
  naam: string | null
  contactpersoon: string | null
  email: string | null
  kenmerk: string | null
}

export interface BelangenbehartigerFeit {
  bureau: string | null
  naam: string | null
  email: string | null
  kenmerk: string | null
}

export interface EerdereRapportage {
  datum: string
  inhoud: string
}

export interface RapportageInput {
  naamBetrokkene: string
  dossiernummer: string | null
  ongevalsdatum: string | null
  ondernemingen: OndernemingFeit[]
  verzekeraar: VerzekeraarFeit
  belangenbehartiger: BelangenbehartigerFeit
  documenten: DocumentFeit[]
  // Persistente notities op zaakniveau (zaak_notities) — gelden voor élke
  // generatie van deze zaak, in tegenstelling tot extraContext hieronder.
  notities: string[]
  extraContext: string | null
  // Eerder gegenereerde rapportages voor dezelfde zaak (oudste eerst) — maakt
  // dit een vervolgrapportage: al behandelde hoofdstukken/vragen/jaren worden
  // niet herhaald, zie sjabloon.ts.
  eerdereRapportages: EerdereRapportage[]
}

export interface RapportageResultaat {
  rapportage: string
  suggesties: string | null
}

// Scheidingsteken tussen de rapportage zelf en het losse suggesties-blok
// (aanbevolen aanvullende informatie) — dit blok maakt geen deel uit van het
// Word-document en wordt er hier uitgehaald.
const SUGGESTIES_SCHEIDING = '===SUGGESTIES==='

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

function eerdereRapportagesBlokken(eerdereRapportages: EerdereRapportage[]): ContentBlock[] {
  if (eerdereRapportages.length === 0) return []

  const blokken: ContentBlock[] = [
    {
      type: 'text',
      text: 'EERDERE RAPPORTAGE(S) VOOR DIT DOSSIER — dit maakt de op te stellen rapportage een VERVOLGRAPPORTAGE. Volg de vervolgrapportage-instructie in de sjabloon: herhaal geen al behandelde hoofdstukken/jaren/vragen.',
    },
  ]

  for (const r of eerdereRapportages) {
    blokken.push({ type: 'text', text: `### Eerdere rapportage d.d. ${r.datum}` })
    blokken.push({ type: 'text', text: r.inhoud })
  }

  return blokken
}

export async function genereerRapportageTekst(input: RapportageInput): Promise<RapportageResultaat> {
  const client = createClaudeClient()

  const ondernemingenTekst =
    input.ondernemingen.length > 0
      ? input.ondernemingen
          .map(
            (o) =>
              `- ${o.naam} (${o.rechtsvorm ?? 'rechtsvorm onbekend'}, opgericht ${o.oprichtingsdatum ?? 'datum onbekend'}${
                o.kvk_nummer ? `, KvK ${o.kvk_nummer}` : ''
              })`
          )
          .join('\n')
      : '(nog niet bekend — dient zo mogelijk uit de aangeleverde documenten te worden afgeleid)'

  const notitiesTekst =
    input.notities.length > 0
      ? `Blijvende aanvullende informatie bij deze zaak (geldt voor de hele zaak, niet alleen deze versie — weeg dit mee, maar verzin niets extra's daarbuiten):\n${input.notities.map((n) => `- ${n}`).join('\n')}\n\n`
      : ''

  const extraContextTekst = input.extraContext
    ? `Aanvullende informatie/instructies van de bedrijfskundige voor deze specifieke versie (weeg dit mee, maar verzin niets extra's daarbuiten):\n${input.extraContext}\n\n`
    : ''

  const opdrachtTekst = `Stel een CONCEPT bedrijfskundige rapportage op voor de volgende zaak.

Betrokkene: ${input.naamBetrokkene}
Dossiernummer: ${input.dossiernummer ?? 'onbekend'}
Ongevalsdatum: ${input.ongevalsdatum ?? 'onbekend — dient zo mogelijk uit de aangeleverde documenten te worden afgeleid'}

Onderneming(en):
${ondernemingenTekst}

Verzekeraar: ${input.verzekeraar.naam ?? 'onbekend'}${input.verzekeraar.contactpersoon ? `, contactpersoon ${input.verzekeraar.contactpersoon}` : ''}${input.verzekeraar.email ? `, ${input.verzekeraar.email}` : ''}${input.verzekeraar.kenmerk ? `, kenmerk ${input.verzekeraar.kenmerk}` : ''}
Belangenbehartiger: ${input.belangenbehartiger.bureau ?? 'onbekend'}${input.belangenbehartiger.naam ? `, ${input.belangenbehartiger.naam}` : ''}${input.belangenbehartiger.email ? `, ${input.belangenbehartiger.email}` : ''}${input.belangenbehartiger.kenmerk ? `, kenmerk ${input.belangenbehartiger.kenmerk}` : ''}

${notitiesTekst}${extraContextTekst}Hieronder volgen eventuele eerdere rapportages voor dit dossier, de aangeleverde documenten (als tekst, PDF of scan), gevolgd door de opdracht.`

  const afsluitingTekst = `Baseer de analyse uitsluitend op de hierboven aangeleverde documenten (en, waar expliciet toegestaan in de sjabloon, actuele branche-/marktinformatie die je zelf opzoekt). Waar informatie ontbreekt of onduidelijk is (ook als een PDF/scan onleesbaar of onvolledig blijkt), benoem dit expliciet in plaats van te verzinnen. Dit is een CONCEPT — markeer aannames duidelijk zodat de bedrijfskundige ze kan controleren.

Sluit je antwoord af met een aparte sectie, exact ingeleid door een regel met precies "${SUGGESTIES_SCHEIDING}" (deze regel en alles daarna maakt GEEN deel uit van de rapportage zelf — het wordt er automatisch uitgehaald en apart getoond aan de bedrijfskundige, niet in het Word-document). Geef daarin een korte, puntsgewijze lijst (2-6 punten) van concrete aanvullende informatie die de analyse zou verbeteren als die alsnog wordt aangeleverd (bv. een overzicht van de tien grootste klanten, een nog ontbrekende aangifte IB of jaarrekening, een gespecificeerde urenregistratie). Is er niets zinvols te suggereren, schrijf dan alleen "Geen aanvullende suggesties." na de scheidingsregel.`

  // max_tokens is a cap on thinking + response text combined (thinking is on
  // by default on claude-opus-5) — kept generous, and streamed since output
  // this large risks an HTTP timeout on a non-streaming call.
  const stream = client.messages.stream({
    model: 'claude-opus-5',
    max_tokens: 32000,
    // max_uses laag gehouden — elke zoekopdracht kost een volledige
    // round-trip binnen dezelfde (tijdgelimiteerde) generatie; bij een
    // omvangrijke zaak (veel documenten, evt. eerdere rapportages) telt dat
    // merkbaar mee in de totale doorlooptijd.
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4 }],
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
          ...eerdereRapportagesBlokken(input.eerdereRapportages),
          ...documentBlokken(input.documenten),
          { type: 'text', text: afsluitingTekst },
        ],
      },
    ],
  })

  const message = await stream.finalMessage()

  const volledigeTekst = message.content
    .filter((block): block is Extract<typeof block, { type: 'text' }> => block.type === 'text')
    .map((block) => block.text)
    .join('\n')

  const scheidingIndex = volledigeTekst.indexOf(SUGGESTIES_SCHEIDING)
  if (scheidingIndex === -1) {
    return { rapportage: volledigeTekst.trim(), suggesties: null }
  }

  return {
    rapportage: volledigeTekst.slice(0, scheidingIndex).trim(),
    suggesties: volledigeTekst.slice(scheidingIndex + SUGGESTIES_SCHEIDING.length).trim() || null,
  }
}
