import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, workshop_id')
    .eq('id', user.id)
    .single()

  if (!profile?.workshop_id) redirect('/auth/setup')

  const wsId = profile.workshop_id

  const [{ data: orders }, { data: costs }, { data: stock }, { data: ws }] = await Promise.all([
    supabase.from('orders').select('*').eq('workshop_id', wsId).order('created_at'),
    supabase.from('costs').select('*').eq('workshop_id', wsId),
    supabase.from('stock').select('*').eq('workshop_id', wsId),
    supabase.from('workshops').select('*').eq('id', wsId).single(),
  ])

  return (
    <DashboardClient
      orders={orders || []}
      costs={costs || []}
      stock={stock || []}
      workshop={ws}
    />
  )
}
