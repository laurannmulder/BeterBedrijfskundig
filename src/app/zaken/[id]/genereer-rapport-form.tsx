'use client'

import { useTransition } from 'react'
import { Sparkles } from 'lucide-react'
import { startRapportGeneratie } from './actions'

// Documenten toevoegen gebeurt uitsluitend via het "Documenten uploaden"-
// blok — dat dekte deze knop qua functie al af (alles wat daar geüpload is,
// wordt sowieso meegenomen in de volgende generatie), dus geen dubbel
// upload-veld hier.
export function GenereerRapportForm({ zaakId }: { zaakId: string }) {
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await startRapportGeneratie(zaakId, null, [])
    })
  }

  return (
    <form onSubmit={handleSubmit} className="contents">
      <button
        type="submit"
        disabled={pending}
        // Zelfde formaat als de "Rapportages"-knop ernaast (LinkButton
        // variant="secondary" size="sm"), maar in het groen van het logo.
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#12756A] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#0f5f57] disabled:pointer-events-none disabled:opacity-50"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {pending ? 'Bezig met genereren…' : 'Genereer rapport'}
      </button>
    </form>
  )
}
