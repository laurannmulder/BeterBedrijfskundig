'use client'

import { useActionState } from 'react'
import { inviteUser } from './actions'
import { inputClass } from '@/components/ui'

const initialState: { error?: string; success?: string } = {}

export function InviteForm() {
  const [state, formAction, isPending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => inviteUser(formData),
    initialState
  )

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input
        name="email"
        type="email"
        placeholder="E-mailadres nieuwe bedrijfskundige"
        required
        className={inputClass}
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-700">{state.success}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700 disabled:opacity-50"
      >
        {isPending ? 'Versturen…' : 'Uitnodiging versturen'}
      </button>
    </form>
  )
}
