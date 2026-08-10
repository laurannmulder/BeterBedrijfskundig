'use client'

import { useState } from 'react'
import { createZaak } from './actions'
import { RECHTSVORM_LABELS, type Rechtsvorm } from '@/lib/documenten/vereisten'

const RECHTSVORMEN = Object.keys(RECHTSVORM_LABELS) as Rechtsvorm[]

const inputClass = 'rounded-md border border-zinc-300 px-3 py-2'
const labelClass = 'flex flex-col gap-1 text-sm text-zinc-700'

export function ZaakForm({ error }: { error?: string }) {
  const [aantalOndernemingen, setAantalOndernemingen] = useState(1)

  return (
    <form action={createZaak} className="flex w-full max-w-xl flex-col gap-6">
      <input type="hidden" name="aantal_ondernemingen" value={aantalOndernemingen} />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 font-medium">Zaak</legend>
        <label className={labelClass}>
          Naam betrokkene
          <input name="naam_betrokkene" required className={inputClass} />
        </label>
        <label className={labelClass}>
          Dossiernummer
          <input name="dossiernummer" className={inputClass} />
        </label>
        <label className={labelClass}>
          Ongevalsdatum
          <input name="ongevalsdatum" type="date" required className={inputClass} />
        </label>
      </fieldset>

      {Array.from({ length: aantalOndernemingen }, (_, i) => (
        <fieldset key={i} className="flex flex-col gap-3 border-t border-zinc-200 pt-4">
          <legend className="mb-1 font-medium">
            Onderneming {aantalOndernemingen > 1 ? i + 1 : ''}
          </legend>
          <label className={labelClass}>
            Naam / handelsnaam
            <input name={`onderneming_naam_${i}`} required className={inputClass} />
          </label>
          <label className={labelClass}>
            Rechtsvorm
            <select name={`onderneming_rechtsvorm_${i}`} required defaultValue="" className={inputClass}>
              <option value="" disabled>
                Kies een rechtsvorm
              </option>
              {RECHTSVORMEN.map((rv) => (
                <option key={rv} value={rv}>
                  {RECHTSVORM_LABELS[rv]}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Oprichtingsdatum
            <input name={`onderneming_oprichtingsdatum_${i}`} type="date" required className={inputClass} />
          </label>
          <label className={labelClass}>
            KvK-nummer
            <input name={`onderneming_kvk_${i}`} className={inputClass} />
          </label>
          {aantalOndernemingen > 1 && (
            <button
              type="button"
              onClick={() => setAantalOndernemingen((n) => n - 1)}
              className="self-start text-sm text-red-600 underline"
            >
              Onderneming verwijderen
            </button>
          )}
        </fieldset>
      ))}

      <button
        type="button"
        onClick={() => setAantalOndernemingen((n) => n + 1)}
        className="self-start text-sm underline"
      >
        + Nog een onderneming toevoegen (bv. bij meerdere BV's)
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        className="self-start rounded-md bg-black px-4 py-2 text-white hover:bg-neutral-800"
      >
        Zaak aanmaken
      </button>
    </form>
  )
}
