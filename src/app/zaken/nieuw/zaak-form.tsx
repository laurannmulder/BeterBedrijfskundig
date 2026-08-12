import { createZaak } from './actions'
import { Card, inputClass, labelClass } from '@/components/ui'

export function ZaakForm({ error }: { error?: string }) {
  return (
    <form action={createZaak} className="flex flex-col gap-5">
      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-sm font-semibold text-zinc-900">Zaak</h2>
        <label className={labelClass}>
          Naam betrokkene
          <input name="naam_betrokkene" required className={inputClass} />
        </label>
        <label className={labelClass}>
          Dossiernummer
          <input name="dossiernummer" required className={inputClass} />
        </label>
        <p className="text-xs text-zinc-400">
          Verder niets — ongevalsdatum en ondernemingsgegevens komen vanzelf binnen zodra je op de
          zaakpagina documenten uploadt.
        </p>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        className="self-start rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700"
      >
        Zaak aanmaken
      </button>
    </form>
  )
}
