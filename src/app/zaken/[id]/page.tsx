import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DOCUMENT_LABELS, RECHTSVORM_LABELS, type DocumentType, type Rechtsvorm } from '@/lib/documenten/vereisten'
import { Header } from '@/components/Header'
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

async function DocumentRij({ zaakId, doc }: { zaakId: string; doc: DocumentRow }) {
  const label = DOCUMENT_LABELS[doc.type] + (doc.jaar ? ` ${doc.jaar}` : '')
  const isGeupload = doc.status !== 'ontbreekt'
  const bestandsnaam = doc.storage_path?.split('/').pop() ?? null

  let bekijkUrl: string | null = null
  if (isGeupload && doc.storage_path) {
    const supabase = await createClient()
    const { data } = await supabase.storage.from('documenten').createSignedUrl(doc.storage_path, 600)
    bekijkUrl = data?.signedUrl ?? null
  }

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

      <div className="flex items-center gap-3">
        {isGeupload &&
          bestandsnaam &&
          (bekijkUrl ? (
            <a
              href={bekijkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="max-w-[180px] truncate text-xs text-green-700 underline"
              title={bestandsnaam}
            >
              {bestandsnaam}
            </a>
          ) : (
            <span className="max-w-[180px] truncate text-xs text-green-700" title={bestandsnaam}>
              {bestandsnaam}
            </span>
          ))}
        <form action={uploadDocument} className="flex items-center gap-2">
          <input type="hidden" name="document_id" value={doc.id} />
          <input type="hidden" name="zaak_id" value={zaakId} />
          <input
            type="file"
            name="file"
            accept=".pdf,.jpg,.jpeg,.png,.txt"
            required
            className="text-xs"
          />
          <button type="submit" className="rounded-md bg-black px-3 py-1 text-xs text-white hover:bg-neutral-800">
            {isGeupload ? 'Vervangen' : 'Uploaden'}
          </button>
        </form>
      </div>
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

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
  const { count: aantalRapportages } = await supabase
    .from('rapportages')
    .select('id', { count: 'exact', head: true })
    .eq('zaak_id', id)

  if (!zaak) {
    return (
      <>
        <Header userEmail={user?.email} />
        <main className="flex flex-col items-center justify-center gap-4 p-8">
          <p>Zaak niet gevonden.</p>
          <Link href="/" className="text-sm underline">
            Terug naar zaken
          </Link>
        </main>
      </>
    )
  }

  const zaakDocumenten = (documenten ?? []).filter((d) => d.onderneming_id === null)

  return (
    <>
      <Header userEmail={user?.email} />
      <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 p-8">
        <div className="w-full max-w-2xl">
          <Link href="/" className="text-sm underline">
            ← Alle zaken
          </Link>
          <h1 className="mt-2 text-xl font-semibold">{zaak.naam_betrokkene}</h1>
          <p className="text-sm text-zinc-500">
            {zaak.dossiernummer ? `Dossier ${zaak.dossiernummer} · ` : ''}
            Ongevalsdatum {zaak.ongevalsdatum}
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex w-full max-w-2xl flex-col gap-3">
          <form action={genereerRapportage} className="flex flex-col gap-2">
            <input type="hidden" name="zaak_id" value={id} />
            <label className="text-sm text-zinc-700">
              Extra informatie voor deze rapportage (optioneel)
              <textarea
                name="extra_context"
                rows={3}
                placeholder="Bijv. aandachtspunten, context uit een gesprek, of specifieke instructies voor deze versie."
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <div className="flex items-center gap-4">
              <GenereerKnop />
              {!!aantalRapportages && (
                <Link href={`/zaken/${id}/rapportages`} className="text-sm underline">
                  Bekijk rapportages ({aantalRapportages})
                </Link>
              )}
            </div>
          </form>
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
    </>
  )
}
