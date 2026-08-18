'use client'

import { useState, useTransition } from 'react'
import { fileInputClass } from '@/components/ui'
import { uploadBestandenNaarStorage } from '@/lib/documenten/client-upload'
import { verwerkGeuploadeDocumenten } from './actions'

export function UploadDocumentenForm({ zaakId }: { zaakId: string }) {
  const [bestanden, setBestanden] = useState<File[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [fout, setFout] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const bezig = pending || status !== null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (bestanden.length === 0) return
    setFout(null)
    setStatus('Uploaden…')

    const { geupload, mislukt } = await uploadBestandenNaarStorage(zaakId, bestanden)

    if (mislukt.length > 0) {
      setFout(`Niet gelukt: ${mislukt.join(', ')}`)
    }

    if (geupload.length > 0) {
      setStatus('Documenten worden herkend… (kan bij grote bestanden even duren)')
      startTransition(async () => {
        await verwerkGeuploadeDocumenten(zaakId, geupload)
      })
    } else {
      setStatus(null)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.txt,.docx,.xlsx,.doc,.xls"
        multiple
        disabled={bezig}
        onChange={(e) => setBestanden(Array.from(e.target.files ?? []))}
        className={fileInputClass}
      />
      <p className="text-xs text-zinc-400">
        PDF, Word, Excel, foto&apos;s/scans — meerdere tegelijk mogelijk. Elk bestand wordt automatisch
        herkend (bijv. jaarcijfers, aangifte IB, KvK-uittreksel) — één bestand kan aan meerdere categorieën
        voldoen. Ontbrekende zaak-/ondernemingsgegevens (KvK-nummer, oprichtingsdatum, ongevalsdatum) worden
        zo mogelijk automatisch aangevuld. Dit kan bij grote bestanden een tijdje duren.
      </p>
      {fout && <p className="text-sm text-red-600">{fout}</p>}
      <button
        type="submit"
        disabled={bezig || bestanden.length === 0}
        className="self-start rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700 disabled:opacity-50"
      >
        {bezig ? (status ?? 'Bezig…') : 'Uploaden'}
      </button>
    </form>
  )
}
