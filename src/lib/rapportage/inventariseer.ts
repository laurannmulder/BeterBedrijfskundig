import type Anthropic from '@anthropic-ai/sdk'
import { createClaudeClient } from '@/lib/claude'

export interface InventarisatieItem {
  vraag: string | null
  gegeven: string
}

const TOOL: Anthropic.Messages.Tool = {
  name: 'lever_inventarisatie',
  description:
    'Lever de lijst met gegevens die nog bij betrokkene opgevraagd moeten worden om de nog niet (volledig) beantwoorde vragen te kunnen beantwoorden.',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description: 'Eén item per op te vragen gegeven, concreet en afvinkbaar. Leeg als alles beantwoord kan worden.',
        items: {
          type: 'object',
          properties: {
            vraag: {
              type: ['string', 'null'],
              description: 'Korte aanduiding van de gestelde vraag waar dit gegeven voor nodig is (bv. "Vraag 3: omzetontwikkeling na ongeval"); null als het geen specifieke vraag betreft.',
            },
            gegeven: {
              type: 'string',
              description: 'Het concrete gegeven of document dat nodig is (bv. "Debiteurenoverzicht per 31-12-2025", "Uitleg over waarom de omzet in 2024 daalde").',
            },
          },
          required: ['vraag', 'gegeven'],
        },
      },
    },
    required: ['items'],
  },
}

const SYSTEM_PROMPT = `Je bent een bedrijfskundige die een rapportage over gemiste inkomsten van een ondernemer met letsel voorbereidt. Je krijgt de vragen van de verzekeraar en de belangenbehartiger, de huidige conceptrapportage (opgesteld vóór het fysieke gesprek met betrokkene) en een lijst van de aangeleverde documenten.

Bepaal welke vragen met de nu aanwezige gegevens nog niet of niet volledig beantwoord kunnen worden en welke concrete gegevens, documenten of toelichtingen daarvoor nog nodig zijn. De bedrijfskundige neemt deze lijst mee naar de fysieke afspraak.

Regels:
- Wees concreet en afvinkbaar: geen algemeenheden als "meer informatie", maar bv. "Aangifte IB 2022", "Urenregistratie 2024", "Uitleg over de piek in personeelskosten in 2023".
- Neem alleen gegevens op die echt nodig zijn voor een gestelde vraag of voor een in het concept gemarkeerde aanname/leemte. Vraag niets wat al in de aangeleverde documenten staat.
- Let op verwijzingen als [AANNAME: …] in het concept: die wijzen op ontbrekende informatie.
- Schrijf in het Nederlands, kort en zakelijk.
- Zijn alle vragen volledig te beantwoorden, lever dan een lege lijst.`

export async function inventariseerOntbrekendeGegevens(args: {
  vragen: string | null
  concept: string
  documentLabels: string[]
}): Promise<InventarisatieItem[]> {
  const client = createClaudeClient()

  const message = await client.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 4000,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: TOOL.name },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `VRAGEN VAN VERZEKERAAR / BELANGENBEHARTIGER:\n${args.vragen?.trim() || '(geen vragen ingevuld)'}\n\nAANGELEVERDE DOCUMENTEN:\n${
          args.documentLabels.length > 0 ? args.documentLabels.map((l) => `- ${l}`).join('\n') : '(geen)'
        }\n\nCONCEPTRAPPORTAGE:\n${args.concept}`,
      },
    ],
  })

  const toolUse = message.content.find(
    (block): block is Extract<typeof block, { type: 'tool_use' }> => block.type === 'tool_use'
  )
  if (!toolUse) throw new Error('Geen inventarisatie ontvangen van Claude')

  const items = (toolUse.input as { items?: { vraag?: string | null; gegeven?: string }[] }).items ?? []
  return items
    .filter((i): i is { vraag?: string | null; gegeven: string } => typeof i.gegeven === 'string' && i.gegeven.trim() !== '')
    .map((i) => ({ vraag: i.vraag?.trim() || null, gegeven: i.gegeven.trim() }))
}
