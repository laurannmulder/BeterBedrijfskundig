import { Header } from '@/components/Header'
import { OpnameScherm } from './opname-scherm'

// Whisper transcribeert een uur audio in enkele tientallen seconden, maar
// download+upload+API-aanroep samen kunnen bij een trage verbinding oplopen —
// zelfde veiligheidsmarge als de rapportgeneratie-pagina's.
export const maxDuration = 280

export default async function GesprekOpnemenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <>
      <Header />
      <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center gap-6 p-8">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-zinc-900">Gesprek opnemen</h1>
          <p className="mt-1 text-sm text-zinc-500">Wordt automatisch getranscribeerd en meegenomen bij het genereren van het rapport.</p>
        </div>
        <OpnameScherm zaakId={id} />
      </main>
    </>
  )
}
