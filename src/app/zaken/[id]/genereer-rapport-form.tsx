'use client'

import { useTransition } from 'react'
import { Sparkles } from 'lucide-react'
import { genereerRapportageActie } from './actions'

// Documenten toevoegen gebeurt uitsluitend via het "Documenten uploaden"-
// blok — dat dekte deze knop qua functie al af (alles wat daar geüpload is,
// wordt sowieso meegenomen in de volgende generatie), dus geen dubbel
// upload-veld hier.
export function GenereerRapportForm({ zaakId }: { zaakId: string }) {
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await genereerRapportageActie(zaakId, null, [])
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700 disabled:opacity-50"
      >
        <Sparkles className="h-4 w-4" />
        {pending ? 'Bezig met genereren… (kan een minuut duren)' : 'Genereer rapport'}
      </button>
    </form>
  )
}
