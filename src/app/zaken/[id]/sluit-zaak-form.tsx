'use client'

import { useFormStatus } from 'react-dom'
import { Archive } from 'lucide-react'

function SluitKnop() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-50"
    >
      <Archive className="h-3.5 w-3.5" />
      {pending ? 'Bezig…' : 'Zaak afsluiten'}
    </button>
  )
}

export function SluitZaakForm({
  zaakId,
  naamBetrokkene,
  action,
}: {
  zaakId: string
  naamBetrokkene: string
  action: (formData: FormData) => void
}) {
  return (
    <form
      action={action}
      className="contents"
      onSubmit={(e) => {
        const bevestigd = window.confirm(
          `Zaak "${naamBetrokkene}" afsluiten?\n\nDe zaak verhuist naar "Afgesloten zaken" en blijft daar bewaard, met alle documenten en rapportages. Je kunt hem op elk moment heropenen.`
        )
        if (!bevestigd) e.preventDefault()
      }}
    >
      <input type="hidden" name="zaak_id" value={zaakId} />
      <SluitKnop />
    </form>
  )
}
