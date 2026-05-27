import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, role, job_title, workshop_id, workshops(id, name, cnpj, phone, address, logo_url, status)')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  if (profile.role === 'owner' && !profile.workshop_id) {
    redirect('/auth/setup')
  }

  return (
    <div className="flex min-h-screen bg-[#08080f]">
      <Sidebar profile={profile as any} />
      <div className="flex-1 ml-[230px] flex flex-col min-h-screen">
        <Topbar profile={profile as any} />
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
