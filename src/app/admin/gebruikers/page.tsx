import { redirect } from 'next/navigation'
import { huidigeGebruiker } from '@/lib/gebruiker'
import { Header } from '@/components/Header'
import { Card, PageHeader } from '@/components/ui'
import { InviteForm } from './invite-form'

export default async function GebruikersPage() {
  const gebruiker = await huidigeGebruiker()

  if (!gebruiker) redirect('/login')
  if (!gebruiker.isBeheerder) redirect('/')

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-md flex-col gap-6 p-8">
        <PageHeader title="Gebruikers uitnodigen" backHref="/" backLabel="Terug" />
        <Card className="p-6">
          <InviteForm />
        </Card>
      </main>
    </>
  )
}
