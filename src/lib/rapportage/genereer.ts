import { createClaudeClient } from '@/lib/claude'
import { RAPPORTAGE_SJABLOON } from './sjabloon'

export interface OndernemingFeit {
  naam: string
  rechtsvorm: string
  oprichtingsdatum: string
  kvk_nummer: string | null
}

export interface DocumentFeit {
  label: string
  jaar: number | null
  onderneming: string | null
  inhoud: string | null
}

export interface RapportageInput {
  naamBetrokkene: string
  dossiernummer: string | null
  ongevalsdatum: string
  ondernemingen: OndernemingFeit[]
  documenten: DocumentFeit[]
  ontbrekendeVerplichteDocumenten: string[]
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

  const documentenTekst = input.documenten
    .map((d) => {
      const titel = `${d.label}${d.jaar ? ` ${d.jaar}` : ''}${d.onderneming ? ` — ${d.onderneming}` : ''}`
      const inhoud =
        d.inhoud ??
        '[Bestand aangeleverd maar inhoud kon niet automatisch worden gelezen — handmatige beoordeling door de bedrijfskundige nodig.]'
      return `### ${titel}\n${inhoud}`
    })
    .join('\n\n')

  const ontbrekendTekst =
    input.ontbrekendeVerplichteDocumenten.length > 0
      ? `Let op: de volgende verplichte documenten ontbreken nog en moeten in hoofdstuk 7 (Voortgang) worden genoemd:\n${input.ontbrekendeVerplichteDocumenten.join('\n')}\n\n`
      : ''

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
        content: `Stel een CONCEPT bedrijfskundige rapportage op voor de volgende zaak.

Betrokkene: ${input.naamBetrokkene}
Dossiernummer: ${input.dossiernummer ?? 'onbekend'}
Ongevalsdatum: ${input.ongevalsdatum}

Onderneming(en):
${ondernemingenTekst}

${ontbrekendTekst}Aangeleverde documenten:
${documentenTekst}

Baseer de analyse uitsluitend op de aangeleverde documenten hierboven. Waar informatie ontbreekt of onduidelijk is, benoem dit expliciet in plaats van te verzinnen. Dit is een CONCEPT — markeer aannames duidelijk zodat de bedrijfskundige ze kan controleren.`,
      },
    ],
  })

  const message = await stream.finalMessage()

  return message.content
    .filter((block): block is Extract<typeof block, { type: 'text' }> => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
}
