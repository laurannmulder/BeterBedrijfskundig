'use client'

import { useFormStatus } from 'react-dom'
import { Trash2 } from 'lucide-react'

function VerwijderKnop() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-1.5 text-xs font-medium text-red-600 transition-colors hover:text-red-700 disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {pending ? 'Bezig met verwijderen…' : 'Zaak verwijderen'}
    </button>
  )
}

export function VerwijderZaakForm({
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
      onSubmit={(e) => {
        const bevestigd = window.confirm(
          `Weet je zeker dat je de zaak "${naamBetrokkene}" wilt verwijderen?\n\nHiermee worden ook alle ondernemingen, documenten en rapportages van deze zaak definitief verwijderd. Dit kan niet ongedaan worden gemaakt.`
        )
        if (!bevestigd) e.preventDefault()
      }}
    >
      <input type="hidden" name="zaak_id" value={zaakId} />
      <VerwijderKnop />
    </form>
  )
}
