import Link from 'next/link'
import { FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Badge, Card, PageHeader } from '@/components/ui'

export default async function RapportagesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: zaak } = await supabase.from('zaken').select('naam_betrokkene').eq('id', id).single()
  const { data: rapportages } = await supabase
    .from('rapportages')
    .select('id, status, extra_context, created_at')
    .eq('zaak_id', id)
    .order('created_at', { ascending: false })

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
        <PageHeader
          title={`Rapportages — ${zaak?.naam_betrokkene}`}
          backHref={`/zaken/${id}`}
          backLabel="Terug naar zaak"
        />

        <div className="flex flex-col gap-3">
          {rapportages?.map((r) => (
            <Link key={r.id} href={`/zaken/${id}/rapportages/${r.id}`}>
              <Card className="flex items-center justify-between gap-4 px-5 py-4 transition-shadow hover:shadow-md">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                    <FileText className="h-4 w-4 text-zinc-500" />
                  </div>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium text-zinc-900">
                      {new Date(r.created_at).toLocaleString('nl-NL', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                    {r.extra_context && (
                      <span className="mt-0.5 max-w-md truncate text-xs text-zinc-500" title={r.extra_context}>
                        {r.extra_context}
                      </span>
                    )}
                  </span>
                </div>
                <Badge tone={r.status === 'definitief' ? 'success' : 'neutral'}>{r.status}</Badge>
              </Card>
            </Link>
          ))}
          {rapportages?.length === 0 && (
            <Card className="p-8 text-center text-sm text-zinc-500">Nog geen rapportages gegenereerd.</Card>
          )}
        </div>
      </main>
    </>
  )
}
