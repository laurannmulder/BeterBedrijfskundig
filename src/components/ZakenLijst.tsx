'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, FileText, Search } from 'lucide-react'
import { Badge, Card } from '@/components/ui'

export interface ZaakRij {
  id: string
  naam: string
  dossiernummer: string | null
  ongevalsdatum: string | null
  aantalDocumenten: number
  rapportageStatus: string | null
  // Al op de server omgezet naar tekst ("3 uur geleden" / "afgesloten op …")
  // — een tijdsafhankelijke tekst in een client component geeft anders een
  // hydration-verschil tussen server en browser.
  bijgewerkt: string
}

// Doorzoekbare lijst, gedeeld door "Lopende zaken" en "Afgesloten zaken".
export function ZakenLijst({
  zaken,
  leegTitel,
  leegTekst,
}: {
  zaken: ZaakRij[]
  leegTitel: string
  leegTekst: string
}) {
  const [zoek, setZoek] = useState('')

  const zichtbaar = useMemo(() => {
    const q = zoek.trim().toLowerCase()
    if (!q) return zaken
    return zaken.filter(
      (z) => z.naam.toLowerCase().includes(q) || (z.dossiernummer ?? '').toLowerCase().includes(q)
    )
  }, [zoek, zaken])

  if (zaken.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-1 px-6 py-14 text-center">
        <p className="text-sm font-medium text-zinc-900">{leegTitel}</p>
        <p className="max-w-sm text-sm text-zinc-500">{leegTekst}</p>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="search"
          value={zoek}
          onChange={(e) => setZoek(e.target.value)}
          placeholder="Zoek op naam of dossiernummer…"
          aria-label="Zoek in zaken"
          className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-3 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 transition focus:border-[#12756A] focus:outline-none focus:ring-2 focus:ring-[#12756A]/15"
        />
      </div>

      {zichtbaar.length === 0 ? (
        <Card className="px-6 py-10 text-center text-sm text-zinc-500">Geen zaken gevonden voor “{zoek}”.</Card>
      ) : (
        <div className="flex flex-col gap-3">
          {zichtbaar.map((zaak) => (
            <Link key={zaak.id} href={`/zaken/${zaak.id}`} className="group">
              <Card className="flex items-center gap-4 px-4 py-3.5 transition-all group-hover:border-zinc-300 group-hover:shadow-md sm:px-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#12756A]/10 text-sm font-semibold text-[#0f5f57]">
                  {zaak.naam[0]?.toUpperCase()}
                </span>

                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-medium text-zinc-900">{zaak.naam}</span>
                  <span className="truncate text-xs text-zinc-500">
                    {zaak.dossiernummer ? `Dossier ${zaak.dossiernummer} · ` : ''}
                    {zaak.ongevalsdatum ? `Ongeval ${zaak.ongevalsdatum}` : 'Ongevalsdatum onbekend'}
                  </span>
                </div>

                <div className="hidden items-center gap-5 sm:flex">
                  <span className={`text-xs ${zaak.aantalDocumenten > 0 ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {zaak.aantalDocumenten} document{zaak.aantalDocumenten === 1 ? '' : 'en'}
                  </span>
                  {zaak.rapportageStatus ? (
                    <Badge tone={zaak.rapportageStatus === 'definitief' ? 'success' : 'neutral'}>
                      {zaak.rapportageStatus}
                    </Badge>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-zinc-400">
                      <FileText className="h-3.5 w-3.5" />
                      geen rapportage
                    </span>
                  )}
                  <span className="w-28 text-right text-xs text-zinc-400">{zaak.bijgewerkt}</span>
                </div>

                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 transition-colors group-hover:text-zinc-500" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
