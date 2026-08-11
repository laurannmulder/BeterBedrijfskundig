import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { genereerDocxBuffer } from '@/lib/rapportage/naar-docx'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; rapportageId: string }> }
) {
  const { id, rapportageId } = await params
  const supabase = await createClient()

  const { data: zaak } = await supabase.from('zaken').select('naam_betrokkene').eq('id', id).single()
  const { data: rapportage } = await supabase
    .from('rapportages')
    .select('inhoud, created_at')
    .eq('id', rapportageId)
    .single()

  if (!rapportage) {
    return new NextResponse('Rapportage niet gevonden', { status: 404 })
  }

  const buffer = await genereerDocxBuffer(rapportage.inhoud)
  const datum = new Date(rapportage.created_at).toISOString().slice(0, 10)
  const bestandsnaam = `Rapportage ${zaak?.naam_betrokkene ?? ''} ${datum}.docx`.trim().replace(/"/g, '')

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${bestandsnaam}"`,
    },
  })
}
