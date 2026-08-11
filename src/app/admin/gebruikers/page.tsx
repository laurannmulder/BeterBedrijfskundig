import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Card, PageHeader } from '@/components/ui'
import { InviteForm } from './invite-form'

export default async function GebruikersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <>
      <Header userEmail={user?.email} />
      <main className="mx-auto flex w-full max-w-md flex-col gap-6 p-8">
        <PageHeader title="Gebruikers uitnodigen" backHref="/" backLabel="Terug" />
        <Card className="p-6">
          <InviteForm />
        </Card>
      </main>
    </>
  )
}
