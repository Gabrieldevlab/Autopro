import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewOSClient from './NewOSClient'

export default async function NewOSPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role, workshop_id').eq('id', user.id).single()
  const wsId = profile?.workshop_id
  if (!wsId) redirect('/auth/setup')

  const { data: stock } = await supabase.from('stock').select('*').eq('workshop_id', wsId).order('name')

  return <NewOSClient workshopId={wsId} stock={stock || []} />
}
