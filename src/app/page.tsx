import Link from 'next/link'
import { FileText, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Badge, Card, LinkButton } from '@/components/ui'

function relatieveTijd(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minuten = Math.round(diffMs / 60000)
  if (minuten < 1) return 'zojuist'
  if (minuten < 60) return `${minuten} min geleden`
  const uren = Math.round(minuten / 60)
  if (uren < 24) return `${uren} uur geleden`
  const dagen = Math.round(uren / 24)
  if (dagen < 30) return `${dagen} dag${dagen === 1 ? '' : 'en'} geleden`
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function Home() {
  const supabase = await createClient()
  const { data: zaken } = await supabase
    .from('zaken')
    .select('id, naam_betrokkene, dossiernummer, ongevalsdatum, laatst_bewerkt')
    .order('laatst_bewerkt', { ascending: false })

  const { data: documenten } = await supabase.from('documenten').select('zaak_id, status')

  const { data: rapportages } = await supabase
    .from('rapportages')
    .select('zaak_id, status, created_at')
    .order('created_at', { ascending: false })

  const aantalDocumentenPerZaak = new Map<string, number>()
  for (const d of documenten ?? []) {
    if (d.status !== 'geupload') continue
    aantalDocumentenPerZaak.set(d.zaak_id, (aantalDocumentenPerZaak.get(d.zaak_id) ?? 0) + 1)
  }

  const laatsteRapportagePerZaak = new Map<string, { status: string }>()
  for (const r of rapportages ?? []) {
    if (!laatsteRapportagePerZaak.has(r.zaak_id)) {
      laatsteRapportagePerZaak.set(r.zaak_id, { status: r.status })
    }
  }

  const aantalZonderDocumenten = (zaken ?? []).filter((z) => !aantalDocumentenPerZaak.get(z.id)).length

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Zaken</h1>
            <p className="mt-1 text-sm text-zinc-500">
              <strong className="font-semibold text-zinc-900">{zaken?.length ?? 0}</strong> zaken ·{' '}
              <strong className="font-semibold text-zinc-900">{aantalZonderDocumenten}</strong> zonder documenten
            </p>
          </div>
          <LinkButton href="/zaken/nieuw">
            <Plus className="h-4 w-4" />
            Nieuwe zaak
          </LinkButton>
        </div>

        <div className="flex flex-col gap-3">
          {zaken?.map((zaak) => {
            const aantalDocumenten = aantalDocumentenPerZaak.get(zaak.id) ?? 0
            const rapportage = laatsteRapportagePerZaak.get(zaak.id)

            return (
              <Link key={zaak.id} href={`/zaken/${zaak.id}`}>
                <Card className="flex flex-col gap-4 px-5 py-4 transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="font-medium text-zinc-900">{zaak.naam_betrokkene}</span>
                    <span className="text-xs text-zinc-500">
                      {zaak.dossiernummer ? `Dossier ${zaak.dossiernummer} · ` : ''}
                      {zaak.ongevalsdatum ? `Ongeval ${zaak.ongevalsdatum}` : 'Ongevalsdatum onbekend'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 sm:shrink-0 sm:gap-6">
                    <span className={`text-xs ${aantalDocumenten > 0 ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      {aantalDocumenten} document{aantalDocumenten === 1 ? '' : 'en'}
                    </span>
                    {rapportage ? (
                      <Badge tone={rapportage.status === 'definitief' ? 'success' : 'neutral'}>
                        {rapportage.status}
                      </Badge>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-zinc-400">
                        <FileText className="h-3.5 w-3.5" />
                        geen rapportage
                      </span>
                    )}
                    <span className="w-20 text-right text-xs text-zinc-400">
                      {relatieveTijd(zaak.laatst_bewerkt)}
                    </span>
                  </div>
                </Card>
              </Link>
            )
          })}
          {zaken?.length === 0 && (
            <Card className="p-8 text-center text-sm text-zinc-500">Nog geen zaken.</Card>
          )}
        </div>
      </main>
    </>
  )
}
