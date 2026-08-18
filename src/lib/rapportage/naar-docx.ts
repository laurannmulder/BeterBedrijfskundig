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

// Matcht het lettertype van de rapportageweergave in de app (body font-family: Arial, Helvetica, sans-serif).
const LETTERTYPE = 'Arial'
const TEKSTKLEUR = '171717'

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

  for (const node of nodes) {
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
        document: {
          run: { font: LETTERTYPE, size: 22, color: TEKSTKLEUR },
          paragraph: { spacing: { after: 200 } },
        },
        heading1: {
          run: { font: LETTERTYPE, size: 38, bold: true, color: TEKSTKLEUR },
          paragraph: { spacing: { before: 480, after: 240 } },
        },
        heading2: {
          run: { font: LETTERTYPE, size: 30, bold: true, color: TEKSTKLEUR },
          paragraph: { spacing: { before: 400, after: 200 } },
        },
        heading3: {
          run: { font: LETTERTYPE, size: 26, bold: true, color: TEKSTKLEUR },
          paragraph: { spacing: { before: 320, after: 160 } },
        },
        heading4: {
          run: { font: LETTERTYPE, size: 24, bold: true, color: TEKSTKLEUR },
          paragraph: { spacing: { before: 280, after: 120 } },
        },
        heading5: {
          run: { font: LETTERTYPE, size: 22, bold: true, color: TEKSTKLEUR },
          paragraph: { spacing: { before: 240, after: 120 } },
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
