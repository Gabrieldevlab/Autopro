import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role, workshop_id').eq('id', user.id).single()
  if (profile?.role !== 'owner') redirect('/os')

  const { data: ws } = await supabase.from('workshops').select('*').eq('id', profile.workshop_id).single()

  return <SettingsClient workshop={ws} />
}
