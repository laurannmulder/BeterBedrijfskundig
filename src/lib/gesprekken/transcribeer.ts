// Losse, geïsoleerde module voor spraak-naar-tekst — bewust géén Anthropic
// SDK hier. Claude's Messages API ondersteunt geen audio-invoer (alleen
// tekst/afbeeldingen/PDF), dus dit is de eerste plek in de app die een
// tweede AI-leverancier gebruikt (OpenAI Whisper). Losse module zodat dat
// niet vermengd raakt met de Claude-code in src/lib/rapportage en
// src/lib/documenten.
export interface TranscriptieResultaat {
  transcript: string
}

export async function transcribeerAudio(bestand: Blob, bestandsnaam: string): Promise<TranscriptieResultaat> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY ontbreekt — transcriptie is niet geconfigureerd')
  }

  const formData = new FormData()
  formData.append('file', bestand, bestandsnaam)
  formData.append('model', 'whisper-1')
  formData.append('language', 'nl')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  })

  if (!response.ok) {
    const foutTekst = await response.text().catch(() => response.statusText)
    throw new Error(`Transcriptie mislukt (${response.status}): ${foutTekst}`)
  }

  const data = (await response.json()) as { text: string }
  return { transcript: data.text.trim() }
}
