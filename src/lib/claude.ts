import Anthropic from '@anthropic-ai/sdk'

export function createClaudeClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    // SDK-default is 2 — bij een batch-upload van meerdere bestanden na
    // elkaar is een klein beetje extra veerkracht tegen tijdelijke 5xx/
    // overloaded-fouten van de API goedkoper dan de gebruiker een mislukt
    // bestand te laten navertellen. De SDK retryt zelf al met backoff.
    maxRetries: 5,
  })
}
