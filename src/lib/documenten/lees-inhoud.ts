import * as mammoth from 'mammoth'
import ExcelJS from 'exceljs'

// Zet een Word-document (.docx) om naar platte tekst zodat de inhoud als
// tekstblok meegestuurd kan worden aan Claude. Oude .doc-bestanden (binair
// formaat) worden niet ondersteund door mammoth en vallen terug op
// "onleesbaar" bij de aanroeper.
export async function leesDocxTekst(buffer: Buffer): Promise<string> {
  const resultaat = await mammoth.extractRawText({ buffer })
  return resultaat.value.trim()
}

// Zet een Excel-werkmap (.xlsx) om naar platte tekst: per werkblad de naam
// gevolgd door de celwaarden, rij voor rij, tab-gescheiden. Oude .xls-bestanden
// (binair formaat) worden niet ondersteund en vallen terug op "onleesbaar".
export async function leesXlsxTekst(buffer: Buffer): Promise<string> {
  const workbook = new ExcelJS.Workbook()
  // exceljs' meegeleverde types declareren een eigen, verouderde `Buffer`-vorm
  // die botst met de nieuwere ArrayBuffer-typing uit lib.es2024 — een bekende
  // beperking in hun .d.ts, geen echt runtime-probleem (Node Buffer is altijd
  // geldige input voor exceljs).
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0])

  const werkbladen: string[] = []
  workbook.eachSheet((sheet) => {
    const rijen: string[] = []
    sheet.eachRow((row) => {
      const cellen = (row.values as ExcelJS.CellValue[]).slice(1).map((waarde) => {
        if (waarde === null || waarde === undefined) return ''
        if (typeof waarde === 'object' && 'text' in waarde) return String(waarde.text)
        if (typeof waarde === 'object' && 'result' in waarde) return String(waarde.result)
        return String(waarde)
      })
      rijen.push(cellen.join('\t'))
    })
    werkbladen.push(`## Werkblad: ${sheet.name}\n${rijen.join('\n')}`)
  })

  return werkbladen.join('\n\n').trim()
}
