import { Header } from '@/components/Header'
import { StatCard } from '@/components/ui'
import { ZakenLijst } from '@/components/ZakenLijst'
import { laadZakenOverzicht } from '@/lib/zaken-overzicht'

export default async function AfgeslotenZakenPage() {
  const { rijen } = await laadZakenOverzicht(true)

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Afgesloten zaken</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Het archief: afgesloten zaken blijven bewaard met alle documenten en rapportages en kunnen worden
            heropend.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="In het archief" waarde={rijen.length} />
        </div>

        <ZakenLijst
          zaken={rijen}
          leegTitel="Nog geen afgesloten zaken"
          leegTekst="Open een zaak en kies “Zaak afsluiten” om hem hier te bewaren."
        />
      </main>
    </>
  )
}
