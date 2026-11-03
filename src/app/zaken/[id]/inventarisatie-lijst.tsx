import { CheckSquare, Square, Trash2 } from 'lucide-react'
import { Badge, Card } from '@/components/ui'
import { verwijderInventarisatieItem, wisselInventarisatieItem } from './actions'

export interface InventarisatieRij {
  id: string
  tekst: string
  vraag: string | null
  bron: string
  afgevinkt: boolean
}

// Lijst met nog op te vragen gegevens (stap 5). Afvinken en verwijderen zijn
// gewone formulieracties: de pagina wordt na elke wijziging opnieuw getoond.
export function InventarisatieLijst({ zaakId, items }: { zaakId: string; items: InventarisatieRij[] }) {
  return (
    <Card className="divide-y divide-zinc-100">
      {items.map((item) => (
        <div key={item.id} className="flex items-start gap-3 px-4 py-3">
          <form action={wisselInventarisatieItem} className="contents">
            <input type="hidden" name="zaak_id" value={zaakId} />
            <input type="hidden" name="item_id" value={item.id} />
            <input type="hidden" name="afgevinkt" value={item.afgevinkt ? '0' : '1'} />
            <button
              type="submit"
              className="mt-0.5 shrink-0 text-zinc-400 transition-colors hover:text-[#12756A]"
              aria-label={item.afgevinkt ? 'Markeer als nog open' : 'Markeer als ontvangen of besproken'}
            >
              {item.afgevinkt ? (
                <CheckSquare className="h-5 w-5 text-[#12756A]" />
              ) : (
                <Square className="h-5 w-5" />
              )}
            </button>
          </form>
          <div className="min-w-0 flex-1">
            <p className={`text-sm ${item.afgevinkt ? 'text-zinc-400 line-through' : 'text-zinc-900'}`}>{item.tekst}</p>
            {item.vraag && <p className="mt-0.5 text-xs text-zinc-500">{item.vraag}</p>}
          </div>
          {item.bron === 'handmatig' && <Badge>Eigen</Badge>}
          <form action={verwijderInventarisatieItem} className="contents">
            <input type="hidden" name="zaak_id" value={zaakId} />
            <input type="hidden" name="item_id" value={item.id} />
            <button
              type="submit"
              className="shrink-0 rounded-lg p-1 text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-600"
              aria-label="Verwijderen"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      ))}
    </Card>
  )
}
