'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react'
import { inputClass } from '@/components/ui'
import { wijzigNotitie, verwijderNotitie } from './actions'

interface Notitie {
  id: string
  tekst: string
}

// Boven deze lengte (of bij meerdere regels) tonen we standaard een
// compacte, ingeklapte preview i.p.v. de hele tekst — bv. een geplakte
// opdrachtbrief maakt anders het hele blok onnodig hoog.
const INKLAP_DREMPEL = 140

export function NotitieBlok({ zaakId, notitie }: { zaakId: string; notitie: Notitie }) {
  const [bewerken, setBewerken] = useState(false)
  const isLang = notitie.tekst.length > INKLAP_DREMPEL || notitie.tekst.includes('\n')
  const [uitgeklapt, setUitgeklapt] = useState(!isLang)

  if (bewerken) {
    return (
      <form action={wijzigNotitie} className="flex flex-col gap-2 px-4 py-3">
        <input type="hidden" name="zaak_id" value={zaakId} />
        <input type="hidden" name="notitie_id" value={notitie.id} />
        <textarea name="tekst" defaultValue={notitie.tekst} rows={3} autoFocus className={inputClass} />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Opslaan
          </button>
          <button
            type="button"
            onClick={() => setBewerken(false)}
            className="rounded-lg px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-100"
          >
            Annuleren
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      {isLang ? (
        <button
          type="button"
          onClick={() => setUitgeklapt((v) => !v)}
          className="group flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition-colors group-hover:bg-zinc-200 group-hover:text-zinc-900">
            {uitgeklapt ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
          <span
            className={`text-sm text-zinc-800 ${uitgeklapt ? 'whitespace-pre-wrap' : 'truncate whitespace-nowrap'}`}
          >
            {notitie.tekst}
          </span>
        </button>
      ) : (
        <p className="whitespace-pre-wrap text-sm text-zinc-800">{notitie.tekst}</p>
      )}
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setBewerken(true)}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          <Pencil className="h-3.5 w-3.5" />
          Bewerken
        </button>
        <form action={verwijderNotitie}>
          <input type="hidden" name="zaak_id" value={zaakId} />
          <input type="hidden" name="notitie_id" value={notitie.id} />
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
  )
}
