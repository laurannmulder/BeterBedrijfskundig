'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function uploadDocument(formData: FormData) {
  const documentId = String(formData.get('document_id') ?? '')
  const zaakId = String(formData.get('zaak_id') ?? '')
  const file = formData.get('file') as File | null

  if (!file || file.size === 0) {
    redirect(`/zaken/${zaakId}?error=${encodeURIComponent('Kies eerst een bestand')}`)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = `${zaakId}/${documentId}/${file.name}`

  const { error: uploadError } = await supabase.storage
    .from('documenten')
    .upload(path, file, { upsert: true })

  if (uploadError) {
    redirect(`/zaken/${zaakId}?error=${encodeURIComponent(uploadError.message)}`)
  }

  const { error: updateError } = await supabase
    .from('documenten')
    .update({
      storage_path: path,
      status: 'geupload',
      uploaded_at: new Date().toISOString(),
      uploaded_by: user!.id,
    })
    .eq('id', documentId)

  if (updateError) {
    redirect(`/zaken/${zaakId}?error=${encodeURIComponent(updateError.message)}`)
  }

  revalidatePath(`/zaken/${zaakId}`)
}
