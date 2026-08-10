import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
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
      <main className="flex flex-col items-center gap-6 p-8">
        <h1 className="text-xl font-semibold">Nieuwe zaak</h1>
        <ZaakForm error={error} />
      </main>
    </>
  )
}
