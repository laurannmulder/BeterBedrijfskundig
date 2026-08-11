import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { PageHeader } from '@/components/ui'
import { ZaakForm } from './zaak-form'

export default async function NieuweZaakPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <>
      <Header userEmail={user?.email} />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 p-8">
        <PageHeader title="Nieuwe zaak" backHref="/" backLabel="Alle zaken" />
        <ZaakForm error={error} />
      </main>
    </>
  )
}
