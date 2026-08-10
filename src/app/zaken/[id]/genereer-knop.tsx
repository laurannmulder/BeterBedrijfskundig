'use client'

import { useFormStatus } from 'react-dom'

export function GenereerKnop() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
    >
      {pending ? 'Bezig met genereren… (kan een minuut duren)' : 'Genereer rapport'}
    </button>
  )
}
