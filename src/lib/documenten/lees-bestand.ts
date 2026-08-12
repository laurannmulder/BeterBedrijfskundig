import { leesDocxTekst, leesXlsxTekst } from './lees-inhoud'

const DOCX_MEDIA_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const XLSX_MEDIA_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export type BestandInhoud =
  | { kind: 'tekst'; tekst: string }
  | { kind: 'pdf'; base64: string }
  | { kind: 'afbeelding'; base64: string; mediaType: string }
  | { kind: 'onleesbaar' }

// Bepaalt op basis van het media-type hoe een geüpload bestand aan Claude
// meegegeven moet worden: PDF's en afbeeldingen native als document-/
// image-content (Claude leest die zelf, geen OCR nodig), Word/Excel worden
// eerst naar platte tekst omgezet, en overige types vallen terug op
// "onleesbaar" — de aanroeper beslist dan zelf wat daarmee te doen.
export async function leesBestandInhoud(bestand: Blob): Promise<BestandInhoud> {
  const mediaType = bestand.type

  if (mediaType === 'application/pdf') {
    const buffer = Buffer.from(await bestand.arrayBuffer())
    return { kind: 'pdf', base64: buffer.toString('base64') }
  }

  if (mediaType.startsWith('image/')) {
    const buffer = Buffer.from(await bestand.arrayBuffer())
    return { kind: 'afbeelding', base64: buffer.toString('base64'), mediaType }
  }

  if (mediaType === 'text/plain' || mediaType === '') {
    return { kind: 'tekst', tekst: await bestand.text() }
  }

  if (mediaType === DOCX_MEDIA_TYPE) {
    try {
      const buffer = Buffer.from(await bestand.arrayBuffer())
      return { kind: 'tekst', tekst: await leesDocxTekst(buffer) }
    } catch {
      return { kind: 'onleesbaar' }
    }
  }

  if (mediaType === XLSX_MEDIA_TYPE) {
    try {
      const buffer = Buffer.from(await bestand.arrayBuffer())
      return { kind: 'tekst', tekst: await leesXlsxTekst(buffer) }
    } catch {
      return { kind: 'onleesbaar' }
    }
  }

  return { kind: 'onleesbaar' }
}
