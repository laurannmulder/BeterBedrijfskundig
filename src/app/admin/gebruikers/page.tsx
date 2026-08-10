import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { InviteForm } from './invite-form'

export default async function GebruikersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <>
      <Header userEmail={user?.email} />
      <main className="flex flex-col items-center justify-center gap-6 p-8">
        <h1 className="text-xl font-semibold">Gebruikers uitnodigen</h1>
        <InviteForm />
        <Link href="/" className="text-sm underline">
          Terug
        </Link>
      </main>
    </>
  )
}
