import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function NotificationsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role, workshop_id').eq('id', user.id).single()
  const wsId = profile?.workshop_id
  if (!wsId) redirect('/auth/setup')

  // Marcar todas como lidas
  await supabase.from('notifications').update({ read: true }).eq('workshop_id', wsId)

  const { data: notifs } = await supabase
    .from('notifications')
    .select('*')
    .eq('workshop_id', wsId)
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">Notificações</h1>
      <div className="card">
        {(notifs || []).length ? (notifs || []).map((n: any) => (
          <div key={n.id} className="flex gap-3 items-start py-4 border-b border-[#252530] last:border-0">
            <div className="w-9 h-9 rounded-full bg-[#ff6b2b]/20 flex items-center justify-center text-[#ff6b2b] flex-shrink-0 mt-0.5">
              🔔
            </div>
            <div>
              <p className="text-sm leading-relaxed">{n.message}</p>
              <p className="text-xs text-[#505068] mt-1">{new Date(n.created_at).toLocaleString('pt-BR')}</p>
            </div>
          </div>
        )) : (
          <div className="text-center py-16 text-[#505068]">
            <div className="text-4xl mb-3">🔕</div>
            <p>Nenhuma notificação</p>
          </div>
        )}
      </div>
    </div>
  )
}
