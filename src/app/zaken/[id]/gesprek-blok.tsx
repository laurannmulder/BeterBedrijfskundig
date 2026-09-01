'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui'
import { verwijderGesprek } from './gesprek/actions'

interface Gesprek {
  id: string
  status: 'transcriberen' | 'klaar' | 'mislukt'
  transcript: string | null
  foutmelding: string | null
  opgenomen_op: string
}

const STATUS_BADGE = {
  transcriberen: { tone: 'warning' as const, label: 'Transcriberen…' },
  klaar: { tone: 'success' as const, label: 'Klaar' },
  mislukt: { tone: 'danger' as const, label: 'Mislukt' },
}

export function GesprekBlok({ zaakId, gesprek }: { zaakId: string; gesprek: Gesprek }) {
  const [uitgeklapt, setUitgeklapt] = useState(false)
  const badge = STATUS_BADGE[gesprek.status]
  const datum = new Date(gesprek.opgenomen_op).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {gesprek.status === 'klaar' && gesprek.transcript ? (
            <button
              type="button"
              onClick={() => setUitgeklapt((v) => !v)}
              className="flex items-center gap-1.5 text-left text-sm text-zinc-800 hover:text-zinc-900"
            >
              {uitgeklapt ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
              Gesprek {datum}
            </button>
          ) : (
            <span className="text-sm text-zinc-800">Gesprek {datum}</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge tone={badge.tone}>{badge.label}</Badge>
          <form action={verwijderGesprek}>
            <input type="hidden" name="zaak_id" value={zaakId} />
            <input type="hidden" name="gesprek_id" value={gesprek.id} />
            <button
              type="submit"
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Verwijderen
            </button>
          </form>
        </div>
      </div>
      {gesprek.status === 'mislukt' && gesprek.foutmelding && (
        <p className="text-xs text-red-600">{gesprek.foutmelding}</p>
      )}
      {uitgeklapt && gesprek.transcript && (
        <p className="whitespace-pre-wrap text-sm text-zinc-600">{gesprek.transcript}</p>
      )}
    </div>
  )
}
