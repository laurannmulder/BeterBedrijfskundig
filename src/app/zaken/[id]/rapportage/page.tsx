import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { createClient } from '@/lib/supabase/server'

export default async function RapportagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: zaak } = await supabase.from('zaken').select('naam_betrokkene').eq('id', id).single()
  const { data: rapportage } = await supabase
    .from('rapportages')
    .select('*')
    .eq('zaak_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <div className="w-full max-w-3xl">
        <Link href={`/zaken/${id}`} className="text-sm underline">
          ← Terug naar zaak
        </Link>
        <h1 className="mt-2 text-xl font-semibold">
          Rapportage — {zaak?.naam_betrokkene} <span className="text-sm font-normal text-zinc-500">(concept)</span>
        </h1>
      </div>

      {!rapportage ? (
        <p className="text-sm text-zinc-500">Nog geen rapportage gegenereerd.</p>
      ) : (
        <article className="prose prose-sm w-full max-w-3xl rounded-md border border-zinc-200 p-6">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{rapportage.inhoud}</ReactMarkdown>
        </article>
      )}
    </main>
  )
}
