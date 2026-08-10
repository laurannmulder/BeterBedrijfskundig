'use client'

import { useActionState } from 'react'
import { inviteUser } from './actions'

const initialState: { error?: string; success?: string } = {}

export function InviteForm() {
  const [state, formAction, isPending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => inviteUser(formData),
    initialState
  )

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-3">
      <input
        name="email"
        type="email"
        placeholder="E-mailadres nieuwe bedrijfskundige"
        required
        className="rounded-md border border-zinc-300 px-3 py-2"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-green-700">{state.success}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-black px-4 py-2 text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {isPending ? 'Versturen…' : 'Uitnodiging versturen'}
      </button>
    </form>
  )
}
