import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import type { Root, RootContent, PhrasingContent, Table as MdTable, List as MdList } from 'mdast'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  LevelFormat,
  AlignmentType,
  Header,
  ImageRun,
  HorizontalPositionAlign,
  HorizontalPositionRelativeFrom,
  VerticalPositionRelativeFrom,
  TextWrappingType,
  type IBorderOptions,
} from 'docx'
import {
  VOORPAGINA_BRIEFHOOFD_JPEG,
  ACCENT_PATROON_PNG,
  KEURMERK_LETSELSCHADE_JPEG,
} from './briefpapier/assets'

const TABEL_BREEDTE_DXA = 9000

// Paginaopmaak (A4, marges, briefpapier) is 1-op-1 overgenomen uit het
// kantoor-eigen blanco formatdocument ("Format BEDRIJFSKUNDIGE RAPPORTAGE.docx"),
// door de originele .docx uit te pakken en de exacte waarden uit
// word/document.xml + word/header2.xml + word/header3.xml te lezen.
// Let op inconsistente eenheden in de docx-package: `transformation.width/
// height` wil pixels (intern × 9525 = EMU), maar `floating.*Position.offset`
// wil EMU rechtstreeks (geverifieerd door de gegenereerde XML te inspecteren
// — een offset van 47 kwam er als "47" i.p.v. "447675" uit).
const PAGINA_BREEDTE_TWIPS = 11906
const PAGINA_HOOGTE_TWIPS = 16838
const MARGE_TWIPS = 1417
const HEADER_FOOTER_AFSTAND_TWIPS = 709

function voorpaginaHeader(): Header {
  return new Header({
    children: [
      new Paragraph({
        children: [
          new ImageRun({
            type: 'jpg',
            data: VOORPAGINA_BRIEFHOOFD_JPEG,
            transformation: { width: 792, height: 1120 },
            floating: {
              horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, align: HorizontalPositionAlign.RIGHT },
              verticalPosition: { relative: VerticalPositionRelativeFrom.PARAGRAPH, offset: -448310 },
              behindDocument: true,
              wrap: { type: TextWrappingType.NONE },
            },
          }),
        ],
      }),
    ],
  })
}

function standaardHeader(): Header {
  return new Header({
    children: [
      new Paragraph({
        children: [
          new ImageRun({
            type: 'png',
            data: ACCENT_PATROON_PNG,
            transformation: { width: 62, height: 60 },
            floating: {
              horizontalPosition: { relative: HorizontalPositionRelativeFrom.COLUMN, offset: 5937250 },
              verticalPosition: { relative: VerticalPositionRelativeFrom.PARAGRAPH, offset: -307975 },
              behindDocument: true,
              wrap: { type: TextWrappingType.NONE },
            },
          }),
        ],
      }),
    ],
  })
}

// Het Nationaal Keurmerk Letselschade-beeldmerk staat in het origineel op de
// voorpagina, los van de tekststroom (floating, behindDoc). Als losse
// paragraaf vlak na de gegevenstabellen ingevoegd — de exacte verticale
// positie in het origineel viel niet 1-op-1 te herleiden (geen directe
// koppeling met een specifieke alinea), dit is een verantwoorde benadering.
function keurmerkParagraaf(): Paragraph {
  return new Paragraph({
    spacing: { before: 200 },
    children: [
      new ImageRun({
        type: 'jpg',
        data: KEURMERK_LETSELSCHADE_JPEG,
        transformation: { width: 229, height: 69 },
      }),
    ],
  })
}

// Lettertype/kleuren 1-op-1 overgenomen uit het kantoor-eigen blanco
// formatdocument (styles.xml: docDefaults + Kop1/Kop2-stijlen, en de directe
// run-opmaak in document.xml) — niet de Arial-body-styling van de
// in-app-preview, die staat los van de daadwerkelijke huisstijl.
const LETTERTYPE = 'Verdana'
const KOPKLEUR = '702372'

// De vier vaste omslagblok-koppen (zie sjabloon.ts) — geen markdown-tabel
// meer, maar een vetgedrukte kopregel + platte veldregels in een kader met
// gestippelde paarse rand, exact zoals het origineel (word/document.xml:
// <w:tblBorders><w:top w:val="dotted" ... w:color="702372"/>...).
const OMSLAGBLOK_KOPPEN = [
  'Persoonlijke gegevens betrokkene:',
  'Gegevens verzekeraar:',
  'Gegevens belangenbehartiger:',
  'Gegevens bedrijfskundige:',
]

function isOmslagblokKop(node: RootContent): string | null {
  if (node.type !== 'paragraph' || node.children.length !== 1) return null
  const kind = node.children[0]
  if (kind.type !== 'strong') return null
  const tekst = kind.children
    .map((c) => (c.type === 'text' ? c.value : ''))
    .join('')
    .trim()
  return OMSLAGBLOK_KOPPEN.includes(tekst) ? tekst : null
}

function omslagblokTabel(kop: string, veldParagrafen: Paragraph[]): Table {
  const kader: IBorderOptions = { style: BorderStyle.DOTTED, size: 2, color: KOPKLEUR }

  return new Table({
    width: { size: TABEL_BREEDTE_DXA, type: WidthType.DXA },
    columnWidths: [TABEL_BREEDTE_DXA],
    borders: { top: kader, bottom: kader, left: kader, right: kader },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: TABEL_BREEDTE_DXA, type: WidthType.DXA },
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [
              new Paragraph({
                spacing: { after: 0 },
                children: [new TextRun({ text: kop, bold: true, color: KOPKLEUR, font: LETTERTYPE })],
              }),
              ...veldParagrafen,
            ],
          }),
        ],
      }),
    ],
  })
}

function inlineNaarRuns(
  nodes: PhrasingContent[],
  opts: { bold?: boolean; italics?: boolean } = {}
): TextRun[] {
  const runs: TextRun[] = []

  for (const node of nodes) {
    switch (node.type) {
      case 'text':
        runs.push(new TextRun({ text: node.value, bold: opts.bold, italics: opts.italics }))
        break
      case 'strong':
        runs.push(...inlineNaarRuns(node.children, { ...opts, bold: true }))
        break
      case 'emphasis':
        runs.push(...inlineNaarRuns(node.children, { ...opts, italics: true }))
        break
      case 'inlineCode':
        runs.push(
          new TextRun({ text: node.value, bold: opts.bold, italics: opts.italics, font: 'Courier New' })
        )
        break
      case 'break':
        runs.push(new TextRun({ text: '', break: 1 }))
        break
      default:
        if ('children' in node) {
          runs.push(...inlineNaarRuns(node.children as PhrasingContent[], opts))
        }
    }
  }

  return runs
}

function headingNiveau(depth: number) {
  switch (depth) {
    case 1:
      return HeadingLevel.HEADING_1
    case 2:
      return HeadingLevel.HEADING_2
    case 3:
      return HeadingLevel.HEADING_3
    case 4:
      return HeadingLevel.HEADING_4
    default:
      return HeadingLevel.HEADING_5
  }
}

function tabelNaarDocx(node: MdTable): Table {
  const kolommen = node.children[0]?.children.length ?? 1
  const kolomBreedte = Math.floor(TABEL_BREEDTE_DXA / kolommen)

  const rows = node.children.map(
    (rij, rijIndex) =>
      new TableRow({
        children: rij.children.map(
          (cel) =>
            new TableCell({
              width: { size: kolomBreedte, type: WidthType.DXA },
              children: [
                new Paragraph({
                  children: inlineNaarRuns(cel.children, { bold: rijIndex === 0 }),
                }),
              ],
            })
        ),
      })
  )

  return new Table({
    width: { size: TABEL_BREEDTE_DXA, type: WidthType.DXA },
    columnWidths: Array(kolommen).fill(kolomBreedte),
    rows,
  })
}

function lijstNaarDocx(node: MdList): Paragraph[] {
  return node.children.map((item) => {
    const eersteAlinea = item.children.find((c) => c.type === 'paragraph')
    const inline = eersteAlinea && eersteAlinea.type === 'paragraph' ? eersteAlinea.children : []

    return new Paragraph({
      numbering: {
        reference: node.ordered ? 'genummerde-lijst' : 'opsomming',
        level: 0,
      },
      spacing: { after: 60 },
      children: inlineNaarRuns(inline),
    })
  })
}

function blokkenNaarDocx(nodes: RootContent[]): (Paragraph | Table)[] {
  const elementen: (Paragraph | Table)[] = []

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    const omslagblokKop = isOmslagblokKop(node)

    if (omslagblokKop) {
      const veldParagrafen: Paragraph[] = []
      let j = i + 1
      while (j < nodes.length && nodes[j].type === 'paragraph' && !isOmslagblokKop(nodes[j])) {
        const veldNode = nodes[j]
        if (veldNode.type === 'paragraph') {
          veldParagrafen.push(
            new Paragraph({ spacing: { after: 0 }, children: inlineNaarRuns(veldNode.children) })
          )
        }
        j += 1
      }
      elementen.push(omslagblokTabel(omslagblokKop, veldParagrafen))
      i = j - 1
      continue
    }

    switch (node.type) {
      case 'heading':
        elementen.push(
          new Paragraph({
            heading: headingNiveau(node.depth),
            children: inlineNaarRuns(node.children),
          })
        )
        break
      case 'paragraph':
        elementen.push(new Paragraph({ children: inlineNaarRuns(node.children) }))
        break
      case 'list':
        elementen.push(...lijstNaarDocx(node))
        break
      case 'table':
        elementen.push(tabelNaarDocx(node))
        break
      case 'blockquote':
        for (const child of node.children) {
          if (child.type === 'paragraph') {
            elementen.push(
              new Paragraph({
                children: inlineNaarRuns(child.children, { italics: true }),
                indent: { left: 360 },
                border: {
                  left: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC', space: 8 },
                },
              })
            )
          }
        }
        break
      case 'thematicBreak':
        elementen.push(
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } },
            spacing: { before: 120, after: 120 },
          })
        )
        break
      default:
        break
    }
  }

  return elementen
}

export async function genereerDocxBuffer(markdown: string): Promise<Buffer> {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown) as Root

  const doc = new Document({
    styles: {
      default: {
        // Standaard/body-tekst: Verdana 10pt zwart (docDefaults + directe
        // run-opmaak in het origineel — géén thema-Calibri).
        document: {
          run: { font: LETTERTYPE, size: 20, color: '000000' },
          paragraph: { spacing: { after: 200 } },
        },
        // h1 in de markdown = uitsluitend de titelregel "BEDRIJFSKUNDIGE
        // RAPPORTAGE" (zie sjabloon.ts) — Verdana vet paars 20pt, exacte
        // directe opmaak van die ene titel-run in het origineel.
        heading1: {
          run: { font: LETTERTYPE, size: 40, bold: true, color: KOPKLEUR },
          paragraph: { spacing: { before: 240, after: 240 } },
        },
        // h2 = genummerde/hoofdstukkoppen — komt overeen met Word-stijl
        // "Kop1" in het origineel: Verdana vet paars 10pt.
        heading2: {
          run: { font: LETTERTYPE, size: 20, bold: true, color: KOPKLEUR },
          paragraph: { spacing: { before: 240, after: 40 } },
        },
        // h3 = genummerde subparagrafen (1.1/1.2/1.3) — Word-stijl "Kop2":
        // Verdana paars 10pt, NIET vet.
        heading3: {
          run: { font: LETTERTYPE, size: 20, bold: false, color: KOPKLEUR },
          paragraph: { spacing: { before: 40, after: 40 } },
        },
        // h4/h5 horen niet meer voor te komen (sjabloon.ts instrueert
        // vetgedrukte platte tekst i.p.v. een markdown-kop voor alle overige
        // subkopjes) — dit is uitsluitend een vangnet, gestyled als gewone
        // vette body-tekst, niet als "echte" kop.
        heading4: {
          run: { font: LETTERTYPE, size: 20, bold: true, color: '000000' },
          paragraph: { spacing: { before: 120, after: 40 } },
        },
        heading5: {
          run: { font: LETTERTYPE, size: 20, bold: true, color: '000000' },
          paragraph: { spacing: { before: 120, after: 40 } },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: 'opsomming',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
        {
          reference: 'genummerde-lijst',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGINA_BREEDTE_TWIPS, height: PAGINA_HOOGTE_TWIPS },
            margin: {
              top: MARGE_TWIPS,
              right: MARGE_TWIPS,
              bottom: MARGE_TWIPS,
              left: MARGE_TWIPS,
              header: HEADER_FOOTER_AFSTAND_TWIPS,
              footer: HEADER_FOOTER_AFSTAND_TWIPS,
            },
          },
          titlePage: true,
        },
        headers: {
          first: voorpaginaHeader(),
          default: standaardHeader(),
        },
        children: metKeurmerkNaVoorpagina(blokkenNaarDocx(tree.children)),
      },
    ],
  })

  return Packer.toBuffer(doc)
}

// Voegt het Keurmerk-beeldmerk toe direct na de vier gegevenstabellen van het
// omslagblok (zie sjabloon.ts) — vóór de rest van de inhoud begint.
function metKeurmerkNaVoorpagina(elementen: (Paragraph | Table)[]): (Paragraph | Table)[] {
  let aantalTabellenGezien = 0
  const resultaat: (Paragraph | Table)[] = []

  for (const el of elementen) {
    resultaat.push(el)
    if (el instanceof Table) {
      aantalTabellenGezien += 1
      if (aantalTabellenGezien === 4) {
        resultaat.push(keurmerkParagraaf())
      }
    }
  }

  return resultaat
}
