'use client'

import { useActionState, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { inputClass } from '@/components/ui'
import { bewaarVragen, type VragenStatus } from './actions'

export function VragenForm({ zaakId, beginwaarde }: { zaakId: string; beginwaarde: string }) {
  const [status, formAction, bezig] = useActionState<VragenStatus, FormData>(bewaarVragen, null)
  const [bewaard, setBewaard] = useState(beginwaarde)
  const [tekst, setTekst] = useState(beginwaarde)

  const gewijzigd = tekst.trim() !== bewaard.trim()
  const toonStatus = status && !gewijzigd && !bezig

  return (
    <form
      action={(formData) => {
        setBewaard(tekst)
        formAction(formData)
      }}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="zaak_id" value={zaakId} />
      <textarea
        name="vragen"
        rows={6}
        value={tekst}
        onChange={(e) => setTekst(e.target.value)}
        placeholder="Bijv. de vragen uit de opdrachtmail, één per regel of zoals ze in de e-mail staan."
        className={inputClass}
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={bezig || !gewijzigd}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700 disabled:pointer-events-none disabled:opacity-50"
        >
          {bezig ? 'Opslaan…' : 'Opslaan'}
        </button>
        {bezig && (
          <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Bezig met opslaan…
          </span>
        )}
        {gewijzigd && !bezig && <span className="text-xs text-amber-700">Nog niet opgeslagen</span>}
        {toonStatus && status.ok && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <Check className="h-3.5 w-3.5" />
            Opgeslagen om{' '}
            {new Date(status.tijd).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        {toonStatus && !status.ok && <span className="text-xs text-red-700">{status.melding}</span>}
      </div>
    </form>
  )
}
