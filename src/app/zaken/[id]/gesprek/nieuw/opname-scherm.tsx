'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Mic, Square } from 'lucide-react'
import { uploadGesprekNaarStorage } from '@/lib/gesprekken/client-upload'
import { startTranscriptie } from '../actions'

type Status = 'toestemming' | 'gereed' | 'opnemen' | 'verwerken' | 'fout'

function formatteerDuur(seconden: number): string {
  const min = Math.floor(seconden / 60)
  const sec = seconden % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export function OpnameScherm({ zaakId }: { zaakId: string }) {
  const [status, setStatus] = useState<Status>('toestemming')
  const [toestemmingGegeven, setToestemmingGegeven] = useState(false)
  const [duur, setDuur] = useState(0)
  const [foutmelding, setFoutmelding] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTijdRef = useRef<number>(0)

  async function startOpname() {
    setFoutmelding(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.start()
      recorderRef.current = recorder

      startTijdRef.current = Date.now()
      setDuur(0)
      timerRef.current = setInterval(() => {
        setDuur(Math.floor((Date.now() - startTijdRef.current) / 1000))
      }, 1000)

      setStatus('opnemen')
    } catch {
      setFoutmelding('Kon niet bij de microfoon — geef toestemming voor microfoontoegang in je browser/telefoon-instellingen.')
    }
  }

  async function stopOpname() {
    const recorder = recorderRef.current
    if (!recorder) return

    if (timerRef.current) clearInterval(timerRef.current)
    setStatus('verwerken')

    const opgenomenDuur = duur

    const opnameKlaar = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(chunksRef.current, { type: 'audio/webm' }))
      }
    })
    recorder.stop()
    streamRef.current?.getTracks().forEach((track) => track.stop())

    try {
      const blob = await opnameKlaar
      const storagePath = await uploadGesprekNaarStorage(zaakId, blob)
      await startTranscriptie(zaakId, storagePath, opgenomenDuur)
      // startTranscriptie redirect zelf bij succes (gooit intern een
      // NEXT_REDIRECT-fout die Next.js afvangt) — komt hier normaliter niet aan.
    } catch (fout) {
      // Een redirect() in een server action gooit een speciale fout met dit
      // digest-voorvoegsel — die moet doorgegooid worden, niet als mislukking
      // behandeld worden, anders vangt deze catch de succesvolle redirect af.
      if (fout && typeof fout === 'object' && 'digest' in fout && String(fout.digest).startsWith('NEXT_REDIRECT')) {
        throw fout
      }
      setStatus('fout')
      setFoutmelding(fout instanceof Error ? fout.message : 'Opslaan/transcriberen van de opname is mislukt.')
    }
  }

  if (status === 'toestemming') {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <p className="text-sm text-zinc-600">
          Neem alleen op met toestemming van betrokkene. Informeer betrokkene vóór het gesprek dat het wordt
          opgenomen ten behoeve van de rapportage.
        </p>
        <label className="flex max-w-sm items-start gap-2.5 text-left text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={toestemmingGegeven}
            onChange={(e) => setToestemmingGegeven(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-zinc-300"
          />
          Ik heb betrokkene geïnformeerd dat dit gesprek wordt opgenomen en heb toestemming.
        </label>
        <button
          type="button"
          disabled={!toestemmingGegeven}
          onClick={() => setStatus('gereed')}
          className="inline-flex items-center gap-2 rounded-lg bg-[#12756A] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#0f5f57] disabled:pointer-events-none disabled:opacity-50"
        >
          Doorgaan
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      {status === 'gereed' && (
        <button
          type="button"
          onClick={startOpname}
          className="flex h-24 w-24 items-center justify-center rounded-full bg-[#12756A] text-white shadow-lg transition-colors hover:bg-[#0f5f57]"
          aria-label="Start opname"
        >
          <Mic className="h-9 w-9" />
        </button>
      )}

      {status === 'opnemen' && (
        <>
          <div className="flex items-center gap-2 text-2xl font-semibold tabular-nums text-zinc-900">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" />
            {formatteerDuur(duur)}
          </div>
          <button
            type="button"
            onClick={stopOpname}
            className="flex h-24 w-24 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-colors hover:bg-red-700"
            aria-label="Stop opname"
          >
            <Square className="h-8 w-8" />
          </button>
          <p className="text-xs text-zinc-400">Tik op stop om de opname te beëindigen en te versturen.</p>
        </>
      )}

      {status === 'verwerken' && (
        <>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-[#12756A]" />
          <p className="text-sm text-zinc-600">Opname wordt geüpload en getranscribeerd…</p>
        </>
      )}

      {status === 'fout' && (
        <>
          <p className="text-sm font-medium text-red-700">Er ging iets mis</p>
          {foutmelding && <p className="max-w-sm text-sm text-zinc-600">{foutmelding}</p>}
          <button
            type="button"
            onClick={() => setStatus('gereed')}
            className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline"
          >
            Opnieuw proberen
          </button>
        </>
      )}

      {foutmelding && status === 'gereed' && <p className="max-w-sm text-sm text-red-600">{foutmelding}</p>}

      <Link href={`/zaken/${zaakId}`} className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline">
        Annuleren
      </Link>
    </div>
  )
}
