'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { verwerkGeneratieStap, type GeneratieVoortgang } from '../../actions'

// Drijft de generatie zelf aan: elke afgeronde stap zet nieuwe state, wat
// dit effect opnieuw laat lopen (want de status is dan nog 'bezig') en zo de
// volgende stap aanvraagt — geen setInterval nodig, en bezigRef voorkomt dat
// twee stappen tegelijk lopen (bv. door React's dev-mode dubbele effect-run).
export function GeneratieVoortgangWeergave({
  zaakId,
  generatieId,
  initieel,
}: {
  zaakId: string
  generatieId: string
  initieel: GeneratieVoortgang
}) {
  const [voortgang, setVoortgang] = useState(initieel)
  const bezigRef = useRef(false)
  const router = useRouter()

  useEffect(() => {
    if (voortgang.status !== 'bezig' || bezigRef.current) return
    bezigRef.current = true
    let actief = true

    verwerkGeneratieStap(generatieId).then((nieuw) => {
      bezigRef.current = false
      if (actief) setVoortgang(nieuw)
    })

    return () => {
      actief = false
    }
  }, [voortgang, generatieId])

  useEffect(() => {
    if (voortgang.status === 'klaar' && voortgang.rapportageId) {
      router.replace(`/zaken/${zaakId}/rapportages/${voortgang.rapportageId}`)
    }
  }, [voortgang, zaakId, router])

  if (voortgang.status === 'mislukt') {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm font-medium text-red-700">Genereren mislukt</p>
        {voortgang.foutmelding && <p className="max-w-md text-sm text-zinc-600">{voortgang.foutmelding}</p>}
        <Link
          href={`/zaken/${zaakId}`}
          className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline"
        >
          Terug naar de zaak
        </Link>
      </div>
    )
  }

  const stapNummer = Math.min(voortgang.stap + 1, voortgang.totaalStappen)

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-[#12756A]" />
      <div>
        <p className="text-sm font-medium text-zinc-900">Rapport wordt gegenereerd…</p>
        <p className="mt-1 text-sm text-zinc-500">
          Stap {stapNummer} van {voortgang.totaalStappen}
          {voortgang.stapNaam ? ` — ${voortgang.stapNaam}` : ''}
        </p>
      </div>
      <p className="max-w-sm text-xs text-zinc-400">
        Dit kan bij een omvangrijke zaak enkele minuten duren. Deze pagina hoeft niet ververst te worden — hij
        stuurt je automatisch door zodra het rapport klaar is.
      </p>
    </div>
  )
}
