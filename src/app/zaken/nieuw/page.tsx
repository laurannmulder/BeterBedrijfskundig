import { ZaakForm } from './zaak-form'

export default async function NieuweZaakPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <h1 className="text-xl font-semibold">Nieuwe zaak</h1>
      <ZaakForm error={error} />
    </main>
  )
}
