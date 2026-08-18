'use client'

import { useState, useTransition } from 'react'
import { Paperclip, Sparkles } from 'lucide-react'
import { fileInputClass, inputClass, labelClass } from '@/components/ui'
import { uploadBestandenNaarStorage } from '@/lib/documenten/client-upload'
import { genereerRapportageActie } from './actions'

export function GenereerRapportForm({ zaakId }: { zaakId: string }) {
  const [extraContext, setExtraContext] = useState('')
  const [bestanden, setBestanden] = useState<File[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [fout, setFout] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const bezig = pending || status !== null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFout(null)

    let geupload: { path: string; naam: string }[] = []
    if (bestanden.length > 0) {
      setStatus('Extra documenten uploaden…')
      const resultaat = await uploadBestandenNaarStorage(zaakId, bestanden)
      if (resultaat.mislukt.length > 0) {
        setFout(`Niet gelukt: ${resultaat.mislukt.join(', ')}`)
        setStatus(null)
        return
      }
      geupload = resultaat.geupload
    }

    setStatus('Bezig met genereren… (kan een minuut duren)')
    startTransition(async () => {
      await genereerRapportageActie(zaakId, extraContext.trim() || null, geupload)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className={labelClass}>
        Extra informatie voor deze rapportage (optioneel)
        <textarea
          name="extra_context"
          value={extraContext}
          onChange={(e) => setExtraContext(e.target.value)}
          rows={3}
          disabled={bezig}
          placeholder="Bijv. aandachtspunten, context uit een gesprek, of specifieke instructies voor deze versie."
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Extra documenten bij deze informatie (optioneel)
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.txt,.docx,.xlsx,.doc,.xls"
          multiple
          disabled={bezig}
          onChange={(e) => setBestanden(Array.from(e.target.files ?? []))}
          className={fileInputClass}
        />
        <span className="flex items-start gap-1.5 text-xs font-normal text-zinc-400">
          <Paperclip className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Worden net als bij &quot;Documenten uploaden&quot; automatisch herkend en toegevoegd aan de documentenlijst.
        </span>
      </label>
      {fout && <p className="text-sm text-red-600">{fout}</p>}
      <div>
        <button
          type="submit"
          disabled={bezig}
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          {bezig ? (status ?? 'Bezig…') : 'Genereer rapport'}
        </button>
      </div>
    </form>
  )
}
