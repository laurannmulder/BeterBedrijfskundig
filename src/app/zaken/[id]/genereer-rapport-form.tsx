'use client'

import { useTransition } from 'react'
import { Sparkles } from 'lucide-react'
import { startRapportGeneratie } from './actions'

// Documenten toevoegen gebeurt uitsluitend via het "Documenten uploaden"-
// blok — dat dekte deze knop qua functie al af (alles wat daar geüpload is,
// wordt sowieso meegenomen in de volgende generatie), dus geen dubbel
// upload-veld hier.
//
// voorBezoek = stap 4 van het zaakproces (concept vóór het fysieke bezoek);
// anders stap 7 (rapport na het bezoek).
export function GenereerRapportForm({
  zaakId,
  voorBezoek = false,
  label,
  disabled = false,
  secundair = false,
}: {
  zaakId: string
  voorBezoek?: boolean
  label: string
  disabled?: boolean
  secundair?: boolean
}) {
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await startRapportGeneratie(zaakId, null, [], voorBezoek)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="contents">
      <button
        type="submit"
        disabled={pending || disabled}
        className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors disabled:pointer-events-none disabled:opacity-50 ${
          secundair
            ? 'border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50'
            : 'bg-[#12756A] text-white hover:bg-[#0f5f57]'
        }`}
      >
        <Sparkles className="h-4 w-4" />
        {pending ? 'Bezig met starten…' : label}
      </button>
    </form>
  )
}
