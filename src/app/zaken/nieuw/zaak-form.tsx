'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { createZaak } from './actions'
import { RECHTSVORM_LABELS, type Rechtsvorm } from '@/lib/documenten/vereisten'
import { Card, inputClass, labelClass } from '@/components/ui'

const RECHTSVORMEN = Object.keys(RECHTSVORM_LABELS) as Rechtsvorm[]

export function ZaakForm({ error }: { error?: string }) {
  const [aantalOndernemingen, setAantalOndernemingen] = useState(1)

  return (
    <form action={createZaak} className="flex flex-col gap-5">
      <input type="hidden" name="aantal_ondernemingen" value={aantalOndernemingen} />

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
        <label className={labelClass}>
          Ongevalsdatum <span className="font-normal text-zinc-400">(optioneel)</span>
          <input name="ongevalsdatum" type="date" className={inputClass} />
        </label>
      </Card>

      {aantalOndernemingen > 0 && (
        <p className="-mb-2 text-xs text-zinc-400">
          Onderneming(en) — optioneel, kan ook later uit de aangeleverde documenten blijken.
        </p>
      )}

      {Array.from({ length: aantalOndernemingen }, (_, i) => (
        <Card key={i} className="flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">
              Onderneming {aantalOndernemingen > 1 ? i + 1 : ''}
            </h2>
            <button
              type="button"
              onClick={() => setAantalOndernemingen((n) => n - 1)}
              className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Verwijderen
            </button>
          </div>
          <label className={labelClass}>
            Naam / handelsnaam
            <input name={`onderneming_naam_${i}`} className={inputClass} />
          </label>
          <label className={labelClass}>
            Rechtsvorm
            <select name={`onderneming_rechtsvorm_${i}`} defaultValue="" className={inputClass}>
              <option value="">Nog niet bekend</option>
              {RECHTSVORMEN.map((rv) => (
                <option key={rv} value={rv}>
                  {RECHTSVORM_LABELS[rv]}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Oprichtingsdatum
            <input name={`onderneming_oprichtingsdatum_${i}`} type="date" className={inputClass} />
          </label>
          <label className={labelClass}>
            KvK-nummer
            <input name={`onderneming_kvk_${i}`} className={inputClass} />
          </label>
        </Card>
      ))}

      <button
        type="button"
        onClick={() => setAantalOndernemingen((n) => n + 1)}
        className="self-start text-sm text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline"
      >
        + Onderneming toevoegen (bv. bij meerdere BV&apos;s)
      </button>

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
