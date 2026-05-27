import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EmployeesClient from './EmployeesClient'

export default async function EmployeesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role, workshop_id').eq('id', user.id).single()
  if (profile?.role !== 'owner') redirect('/os')
  const wsId = profile?.workshop_id
  if (!wsId) redirect('/auth/setup')

  const { data: employees } = await supabase
    .from('profiles')
    .select('*')
    .eq('workshop_id', wsId)
    .eq('role', 'employee')
    .order('name')

  return <EmployeesClient employees={employees || []} workshopId={wsId} />
}
