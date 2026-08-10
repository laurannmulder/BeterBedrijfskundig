import Link from 'next/link'
import { InviteForm } from './invite-form'

export default function GebruikersPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-xl font-semibold">Gebruikers uitnodigen</h1>
      <InviteForm />
      <Link href="/" className="text-sm underline">
        Terug
      </Link>
    </main>
  )
}
