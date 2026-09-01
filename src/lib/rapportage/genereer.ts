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

export interface Gesprek {
  datum: string
  transcript: string
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
  // Getranscribeerde opnames van bezoekgesprekken (zaak_gesprekken) — apart
  // van notities gehouden zodat dit als primaire bron voor "het gesprek met
  // betrokkene" behandeld wordt, niet als bijzaak, zie sjabloon.ts.
  gesprekken: Gesprek[]
}

// Scheidingsteken tussen de rapportage zelf en het losse suggesties-blok
// (aanbevolen aanvullende informatie) — dit blok maakt geen deel uit van het
// Word-document en wordt er hier uitgehaald. Komt pas in de laatste stap.
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

// Apart van eerdereRapportagesBlokken/documentBlokken gehouden (i.p.v. in de
// generieke notities) zodat een transcript expliciet als primaire bron voor
// "het gesprek met betrokkene" wordt aangeboden — zie de sjabloon-instructie.
function gesprekBlokken(gesprekken: Gesprek[]): ContentBlock[] {
  if (gesprekken.length === 0) return []

  const blokken: ContentBlock[] = [
    {
      type: 'text',
      text: 'TRANSCRIPT(EN) VAN OPGENOMEN GESPREK(KEN) MET BETROKKENE — gebruik dit als primaire bron voor het gesprek met betrokkene, zie de sjabloon-instructie.',
    },
  ]

  for (const g of gesprekken) {
    blokken.push({ type: 'text', text: `### Transcript gesprek d.d. ${g.datum}` })
    blokken.push({ type: 'text', text: g.transcript })
  }

  return blokken
}

// Zet een cache-breakpoint (1h) op het laatste blok vóór de documenten en
// eerdere rapportages — dat is verreweg het duurste deel van de input (bij
// een omvangrijke zaak al gauw honderden PDF-pagina's). Dit blok is bij
// ELKE stap van de generatie (zie GENERATIE_STAPPEN hieronder) identiek,
// dus vanaf de tweede stap leest Claude dit uit de cache in plaats van de
// documenten opnieuw te verwerken — dat is de kern van waarom stapsgewijs
// genereren per stap ruim binnen de tijdslimiet blijft, ook al worden de
// documenten er formeel "opnieuw" bij elke aanroep meegestuurd.
function cachedeGebruikersinhoud(opdrachtTekst: string, input: RapportageInput): ContentBlock[] {
  const inhoud: ContentBlock[] = [
    { type: 'text', text: opdrachtTekst },
    ...eerdereRapportagesBlokken(input.eerdereRapportages),
    ...gesprekBlokken(input.gesprekken),
    ...documentBlokken(input.documenten),
  ]

  const laatste = inhoud[inhoud.length - 1]
  if (laatste) laatste.cache_control = { type: 'ephemeral', ttl: '1h' }

  return inhoud
}

function opdrachtTekstVoor(input: RapportageInput): string {
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

  return `Stel een CONCEPT bedrijfskundige rapportage op voor de volgende zaak.

Betrokkene: ${input.naamBetrokkene}
Dossiernummer: ${input.dossiernummer ?? 'onbekend'}
Ongevalsdatum: ${input.ongevalsdatum ?? 'onbekend — dient zo mogelijk uit de aangeleverde documenten te worden afgeleid'}

Onderneming(en):
${ondernemingenTekst}

Verzekeraar: ${input.verzekeraar.naam ?? 'onbekend'}${input.verzekeraar.contactpersoon ? `, contactpersoon ${input.verzekeraar.contactpersoon}` : ''}${input.verzekeraar.email ? `, ${input.verzekeraar.email}` : ''}${input.verzekeraar.kenmerk ? `, kenmerk ${input.verzekeraar.kenmerk}` : ''}
Belangenbehartiger: ${input.belangenbehartiger.bureau ?? 'onbekend'}${input.belangenbehartiger.naam ? `, ${input.belangenbehartiger.naam}` : ''}${input.belangenbehartiger.email ? `, ${input.belangenbehartiger.email}` : ''}${input.belangenbehartiger.kenmerk ? `, kenmerk ${input.belangenbehartiger.kenmerk}` : ''}

${notitiesTekst}${extraContextTekst}Hieronder volgen eventuele eerdere rapportages voor dit dossier, eventuele transcripten van opgenomen gesprekken met betrokkene, en de aangeleverde documenten (als tekst, PDF of scan). Daarna volgt, per stap, de instructie voor het deel van de rapportage dat je op dat moment moet schrijven — dit gebeurt in meerdere stappen om binnen de technische tijdslimiet per aanroep te blijven. Schrijf bij elke stap UITSLUITEND het gevraagde deel; wat je in een vorige stap al hebt geschreven staat hieronder als eerdere assistent-turn en hoeft niet herhaald te worden.`
}

interface GeneratieStap {
  naam: string
  instructie: string
  maxTokens: number
}

// De generatie is opgeknipt in stappen die elk ruim binnen een veilige
// aanroeptijd moeten blijven. Stap 0 doet welbewust geen rapportagewerk —
// het enige doel is de (dure, niet-cachebare) documentverwerking een keer
// te laten gebeuren zodat elke volgende stap een snelle cache-read is in
// plaats van de documenten opnieuw te lezen. De overige stappen volgen de
// hoofdstukindeling uit sjabloon.ts.
export const GENERATIE_STAPPEN: GeneratieStap[] = [
  {
    naam: 'documenten lezen',
    instructie:
      'Lees alle hierboven aangeleverde documenten (en eventuele eerdere rapportages) aandachtig door ter voorbereiding op het schrijven van de rapportage. Schrijf ZELF NOG NIETS van de rapportage — geen omslagblok, geen hoofdstukken. Bevestig alleen kort en puntsgewijs welke documenten je hebt gelezen en welke informatie eventueel onduidelijk, tegenstrijdig of onleesbaar was. Dit tekstje wordt niet in de uiteindelijke rapportage gebruikt.',
    maxTokens: 1024,
  },
  {
    naam: 'omslag en algemeen',
    instructie:
      'Schrijf nu uitsluitend het omslag/gegevensblok, hoofdstuk 1 (ALGEMEEN, met 1.1/1.2/1.3) en hoofdstuk 2 (ALGEMENE BEDRIJFSINFORMATIE) van de rapportage, exact volgens de sjabloon-structuur. Schrijf nog GEEN volgende hoofdstukken en herhaal niets uit je vorige antwoord (dat was alleen een leesbevestiging, geen onderdeel van de rapportage).',
    maxTokens: 4000,
  },
  {
    naam: 'financieel vóór ongeval',
    instructie:
      'Schrijf nu uitsluitend hoofdstuk 3 (FINANCIËLE ANALYSE ONDERNEMING VOORAFGAAND AAN HET ONGEVAL) volgens de sjabloon-instructie voor dat hoofdstuk — inclusief de instructie om dit hoofdstuk over te slaan (dan is een lege of zeer korte reactie hier prima) als dit bij een vervolgrapportage al in een eerdere rapportage is behandeld. Schrijf geen andere hoofdstukken en herhaal niets van hoofdstuk 1/2.',
    maxTokens: 8000,
  },
  {
    naam: 'financieel na ongeval',
    instructie:
      'Schrijf nu uitsluitend hoofdstuk 4 (FINANCIËLE ANALYSE ONDERNEMING NA HET ONGEVAL) volgens de sjabloon-instructie. Schrijf geen andere hoofdstukken en herhaal niets van de vorige hoofdstukken.',
    maxTokens: 8000,
  },
  {
    naam: 'afronding',
    instructie: `Schrijf nu de rapportage af: hoofdstuk 5 (BEANTWOORDING VRAGEN, inclusief het verlies-aan-verdienvermogen/would-be-onderdeel en, indien van toepassing, het DGA-dividendtekstblok volgens de sjabloon-instructie), het hoofdstuk VOORTGANG, de ONDERTEKENING en de BIJLAGEN-lijst. Herhaal niets van de vorige hoofdstukken.

Sluit je antwoord af met een aparte sectie, exact ingeleid door een regel met precies "${SUGGESTIES_SCHEIDING}" (deze regel en alles daarna maakt GEEN deel uit van de rapportage zelf — het wordt er automatisch uitgehaald en apart getoond aan de bedrijfskundige, niet in het Word-document). Geef daarin een korte, puntsgewijze lijst (2-6 punten) van concrete aanvullende informatie die de analyse zou verbeteren als die alsnog wordt aangeleverd (bv. een overzicht van de tien grootste klanten, een nog ontbrekende aangifte IB of jaarrekening, een gespecificeerde urenregistratie). Is er niets zinvols te suggereren, schrijf dan alleen "Geen aanvullende suggesties." na de scheidingsregel.`,
    maxTokens: 16000,
  },
]

export interface StapResultaat {
  nieuweTekst: string
  klaar: boolean
  rapportage: string
  suggesties: string | null
}

// Voert precies één stap van GENERATIE_STAPPEN uit en geeft het nieuwe
// tekstfragment terug (plus, bij de laatste stap, de opgesplitste
// rapportage/suggesties). De aanroeper (server action) plakt nieuweTekst
// aan de al opgebouwde tekst en roept deze functie voor de volgende stap
// pas weer aan bij de volgende poll vanuit de browser — zie actions.ts.
export async function voerGeneratieStapUit(
  input: RapportageInput,
  stapIndex: number,
  tekstTotNuToe: string
): Promise<StapResultaat> {
  const stap = GENERATIE_STAPPEN[stapIndex]
  if (!stap) throw new Error(`Onbekende generatiestap: ${stapIndex}`)

  const client = createClaudeClient()

  const gebruikersBlokken = cachedeGebruikersinhoud(opdrachtTekstVoor(input), input)

  const messages: Anthropic.Messages.MessageParam[] = [{ role: 'user', content: gebruikersBlokken }]

  if (tekstTotNuToe.trim()) {
    messages.push({
      role: 'assistant',
      // Cache ook de al opgebouwde tekst (default 5m ttl is ruim genoeg —
      // de stappen volgen elkaar in dezelfde generatiesessie snel op) zodat
      // ook dit deel niet bij elke stap opnieuw verwerkt hoeft te worden.
      content: [{ type: 'text', text: tekstTotNuToe, cache_control: { type: 'ephemeral' } }],
    })
  }

  messages.push({ role: 'user', content: stap.instructie })

  const stream = client.messages.stream({
    model: 'claude-opus-5',
    max_tokens: stap.maxTokens,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4 }],
    system: [
      {
        type: 'text',
        text: `Je bent een bedrijfskundige die rapportages opstelt over gemiste inkomsten van ondernemers met letsel, in opdracht van verzekeraars. Schrijf in het Nederlands, zakelijk en feitelijk. Volg exact de onderstaande structuur.\n\n${RAPPORTAGE_SJABLOON}`,
        cache_control: { type: 'ephemeral', ttl: '1h' },
      },
    ],
    messages,
  })

  const message = await stream.finalMessage()

  const nieuweTekst = message.content
    .filter((block): block is Extract<typeof block, { type: 'text' }> => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim()

  const isLaatsteStap = stapIndex === GENERATIE_STAPPEN.length - 1
  if (!isLaatsteStap) {
    // Stap 0 (documenten lezen) levert geen rapportagetekst op — die
    // leesbevestiging hoort niet in de uiteindelijke rapportage.
    const telTekst = stapIndex === 0 ? '' : nieuweTekst
    return { nieuweTekst: telTekst, klaar: false, rapportage: tekstTotNuToe + telTekst, suggesties: null }
  }

  const scheidingIndex = nieuweTekst.indexOf(SUGGESTIES_SCHEIDING)
  const rapportageDeel = scheidingIndex === -1 ? nieuweTekst : nieuweTekst.slice(0, scheidingIndex).trim()
  const suggesties = scheidingIndex === -1 ? null : nieuweTekst.slice(scheidingIndex + SUGGESTIES_SCHEIDING.length).trim() || null

  return {
    nieuweTekst: rapportageDeel,
    klaar: true,
    rapportage: (tekstTotNuToe + rapportageDeel).trim(),
    suggesties,
  }
}
