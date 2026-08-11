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
} from 'docx'

const TABEL_BREEDTE_DXA = 9000

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
        elementen.push(
          new Paragraph({ children: inlineNaarRuns(node.children), spacing: { after: 160 } })
        )
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
        children: blokkenNaarDocx(tree.children),
      },
    ],
  })

  return Packer.toBuffer(doc)
}
