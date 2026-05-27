import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CostsClient from './CostsClient'

export default async function CostsPage({ params }: { params: { type: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role, workshop_id').eq('id', user.id).single()
  const wsId = profile?.workshop_id
  if (!wsId) redirect('/auth/setup')

  const type = params.type === 'additive' ? 'additive' : 'fixed'

  const { data: costs } = await supabase
    .from('costs')
    .select('*')
    .eq('workshop_id', wsId)
    .eq('type', type)
    .order('created_at', { ascending: false })

  return <CostsClient costs={costs || []} workshopId={wsId} type={type} isOwner={profile?.role === 'owner'} />
}
