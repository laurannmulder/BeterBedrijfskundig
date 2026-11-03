import { Header } from '@/components/Header'
import { StatCard } from '@/components/ui'
import { ZakenLijst } from '@/components/ZakenLijst'
import { laadZakenOverzicht } from '@/lib/zaken-overzicht'

export default async function Home() {
  const { rijen, aantalConcept, aantalZonderDocumenten } = await laadZakenOverzicht(false)

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Lopende zaken</h1>
          <p className="mt-1 text-sm text-zinc-500">Alle zaken waaraan je nu werkt.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Lopende zaken" waarde={rijen.length} />
          <StatCard label="Concept-rapportages" waarde={aantalConcept} hint="wachten op controle" />
          <StatCard label="Zonder documenten" waarde={aantalZonderDocumenten} hint="nog niets aangeleverd" />
        </div>

        <ZakenLijst
          zaken={rijen}
          leegTitel="Nog geen lopende zaken"
          leegTekst="Start een nieuwe zaak met de knop rechtsboven. Afgesloten zaken vind je onder “Afgesloten zaken”."
        />
      </main>
    </>
  )
}
