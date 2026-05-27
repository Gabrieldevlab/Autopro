import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OSDetailClient from './OSDetailClient'

export default async function OSDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role, workshop_id').eq('id', user.id).single()

  const [{ data: order }, { data: ws }] = await Promise.all([
    supabase.from('orders').select('*').eq('id', params.id).single(),
    supabase.from('workshops').select('*').eq('id', profile?.workshop_id).single(),
  ])

  if (!order) redirect('/os')

  return <OSDetailClient order={order} workshop={ws} role={profile?.role} />
}
