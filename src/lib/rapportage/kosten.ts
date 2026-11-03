import type Anthropic from '@anthropic-ai/sdk'

export type ModelSleutel = 'opus' | 'sonnet'

export const MODELLEN: Record<ModelSleutel, string> = {
  opus: 'claude-opus-5-5',
  sonnet: 'claude-sonnet-5-5',
}

// Lijstprijzen in USD per miljoen tokens (platform.claude.com → Pricing,
// gecontroleerd nov 2026). Alleen voor de kostenindicatie in de app: wijzigen
// de tarieven, pas ze hier aan. Het echte verbruik staat in de Anthropic
// Console onder Usage.
const PRIJZEN: Record<ModelSleutel, { invoer: number; uitvoer: number; schrijf5m: number; schrijf1u: number; lees: number }> = {
  opus: { invoer: 4, uitvoer: 20, schrijf5m: 5, schrijf1u: 8, lees: 0.2 },
  sonnet: { invoer: 2, uitvoer: 10, schrijf5m: 2.5, schrijf1u: 4, lees: 0.1 },
}

// Webzoekopdrachten van de web_search-tool: $10 per 1000.
const PRIJS_PER_ZOEKOPDRACHT = 0.01

export interface StapVerbruik {
  stap: number
  naam: string
  model: ModelSleutel
  invoer: number
  cacheSchrijf: number
  cacheLees: number
  uitvoer: number
  zoekopdrachten: number
  kostenUsd: number
}

export function berekenStapVerbruik(
  stap: number,
  naam: string,
  model: ModelSleutel,
  usage: Anthropic.Messages.Usage
): StapVerbruik {
  const p = PRIJZEN[model]
  const invoer = usage.input_tokens ?? 0
  const uitvoer = usage.output_tokens ?? 0
  const cacheLees = usage.cache_read_input_tokens ?? 0
  const schrijf1u = usage.cache_creation?.ephemeral_1h_input_tokens ?? 0
  // Zonder uitsplitsing rekenen we alles als 5-minuten-schrijfactie.
  const schrijf5m = usage.cache_creation?.ephemeral_5m_input_tokens ?? (usage.cache_creation_input_tokens ?? 0) - schrijf1u
  const zoekopdrachten = usage.server_tool_use?.web_search_requests ?? 0

  const kostenUsd =
    (invoer * p.invoer + uitvoer * p.uitvoer + cacheLees * p.lees + schrijf5m * p.schrijf5m + schrijf1u * p.schrijf1u) /
      1_000_000 +
    zoekopdrachten * PRIJS_PER_ZOEKOPDRACHT

  return {
    stap,
    naam,
    model,
    invoer,
    cacheSchrijf: schrijf5m + schrijf1u,
    cacheLees,
    uitvoer,
    zoekopdrachten,
    kostenUsd,
  }
}

export function formatKosten(usd: number | null | undefined): string | null {
  if (usd == null) return null
  return `≈ $${Number(usd).toFixed(2).replace('.', ',')}`
}
