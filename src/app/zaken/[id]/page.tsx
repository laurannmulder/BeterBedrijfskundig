import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DOCUMENT_LABELS, RECHTSVORM_LABELS, type DocumentType, type Rechtsvorm } from '@/lib/documenten/vereisten'
import { uploadDocument, genereerRapportage } from './actions'
import { GenereerKnop } from './genereer-knop'

interface DocumentRow {
  id: string
  onderneming_id: string | null
  type: DocumentType
  jaar: number | null
  verplicht: boolean
  status: 'ontbreekt' | 'geupload' | 'gecontroleerd'
  storage_path: string | null
}

function DocumentRij({ zaakId, doc }: { zaakId: string; doc: DocumentRow }) {
  const label = DOCUMENT_LABELS[doc.type] + (doc.jaar ? ` ${doc.jaar}` : '')

  return (
    <li className="flex items-center justify-between gap-4 border-b border-zinc-100 py-2 text-sm">
      <span className="flex items-center gap-2">
        {label}
        <span
          className={`rounded px-1.5 py-0.5 text-xs ${
            doc.verplicht ? 'bg-red-50 text-red-700' : 'bg-zinc-100 text-zinc-500'
          }`}
        >
          {doc.verplicht ? 'verplicht' : 'optioneel'}
        </span>
      </span>

      {doc.status === 'ontbreekt' ? (
        <form action={uploadDocument} className="flex items-center gap-2">
          <input type="hidden" name="document_id" value={doc.id} />
          <input type="hidden" name="zaak_id" value={zaakId} />
          <input type="file" name="file" required className="text-xs" />
          <button type="submit" className="rounded-md bg-black px-3 py-1 text-xs text-white hover:bg-neutral-800">
            Uploaden
          </button>
        </form>
      ) : (
        <span className="text-green-700">geüpload</span>
      )}
    </li>
  )
}

export default async function ZaakDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const { error } = await searchParams

  const supabase = await createClient()

  const { data: zaak } = await supabase.from('zaken').select('*').eq('id', id).single()
  const { data: ondernemingen } = await supabase
    .from('ondernemingen')
    .select('*')
    .eq('zaak_id', id)
    .order('created_at')
  const { data: documenten } = await supabase
    .from('documenten')
    .select('*')
    .eq('zaak_id', id)
    .order('jaar')
  const { data: laatsteRapportage } = await supabase
    .from('rapportages')
    .select('id')
    .eq('zaak_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!zaak) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <p>Zaak niet gevonden.</p>
        <Link href="/zaken" className="text-sm underline">
          Terug naar zaken
        </Link>
      </main>
    )
  }

  const zaakDocumenten = (documenten ?? []).filter((d) => d.onderneming_id === null)

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 p-8">
      <div className="w-full max-w-2xl">
        <Link href="/zaken" className="text-sm underline">
          ← Alle zaken
        </Link>
        <h1 className="mt-2 text-xl font-semibold">{zaak.naam_betrokkene}</h1>
        <p className="text-sm text-zinc-500">
          {zaak.dossiernummer ? `Dossier ${zaak.dossiernummer} · ` : ''}
          Ongevalsdatum {zaak.ongevalsdatum}
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex w-full max-w-2xl items-center gap-4">
        <form action={genereerRapportage}>
          <input type="hidden" name="zaak_id" value={id} />
          <GenereerKnop />
        </form>
        {laatsteRapportage && (
          <Link href={`/zaken/${id}/rapportage`} className="text-sm underline">
            Bekijk laatste rapportage
          </Link>
        )}
      </div>

      <section className="w-full max-w-2xl">
        <h2 className="mb-2 font-medium">Aangifte inkomstenbelasting (betrokkene)</h2>
        <ul>
          {zaakDocumenten.map((doc) => (
            <DocumentRij key={doc.id} zaakId={id} doc={doc} />
          ))}
        </ul>
      </section>

      {ondernemingen?.map((onderneming) => (
        <section key={onderneming.id} className="w-full max-w-2xl">
          <h2 className="mb-1 font-medium">
            {onderneming.naam}{' '}
            <span className="text-sm font-normal text-zinc-500">
              ({RECHTSVORM_LABELS[onderneming.rechtsvorm as Rechtsvorm]})
            </span>
          </h2>
          <ul>
            {(documenten ?? [])
              .filter((d) => d.onderneming_id === onderneming.id)
              .map((doc) => (
                <DocumentRij key={doc.id} zaakId={id} doc={doc} />
              ))}
          </ul>
        </section>
      ))}
    </main>
  )
}
