'use client'

import { useFormStatus } from 'react-dom'
import { Loader2, Sparkles } from 'lucide-react'

function Knop({ label }: { label: string }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#12756A] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#0f5f57] disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {pending ? 'Bezig met inventariseren…' : label}
    </button>
  )
}

export function InventariseerKnop({
  zaakId,
  action,
  label,
  bevestig,
}: {
  zaakId: string
  action: (formData: FormData) => void
  label: string
  bevestig?: string
}) {
  return (
    <form
      action={action}
      className="contents"
      onSubmit={(e) => {
        if (bevestig && !window.confirm(bevestig)) e.preventDefault()
      }}
    >
      <input type="hidden" name="zaak_id" value={zaakId} />
      <Knop label={label} />
    </form>
  )
}
