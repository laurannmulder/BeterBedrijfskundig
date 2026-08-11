'use client'

import { useFormStatus } from 'react-dom'
import { Sparkles } from 'lucide-react'

export function GenereerKnop() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700 disabled:opacity-50"
    >
      <Sparkles className="h-4 w-4" />
      {pending ? 'Bezig met genereren… (kan een minuut duren)' : 'Genereer rapport'}
    </button>
  )
}
