'use client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

interface Profile {
  role: string
  workshop_id?: string
  workshops?: { phone?: string; name?: string } | null
}

export default function Topbar({ profile }: { profile: Profile }) {
  const router = useRouter()
  const [notifCount, setNotifCount] = useState(0)
  const ws = profile.workshops as any

  useEffect(() => {
    if (!profile.workshop_id) return
    async function loadNotifs() {
      const supabase = createClient()
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('workshop_id', profile.workshop_id!)
        .eq('read', false)
      setNotifCount(count || 0)
    }
    loadNotifs()
  }, [profile.workshop_id])

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 bg-[#08080f]/95 backdrop-blur border-b border-[#252530] px-6 py-2.5 flex items-center justify-between gap-4">
      <div className="text-xs text-[#505068]">
        {ws?.phone ? `📞 Atendimento: ${ws.phone}` : ''}
      </div>
      <div className="flex items-center gap-3">
        {profile.workshop_id && (
          <Link
            href="/notifications"
            className="relative w-8 h-8 border border-[#252530] rounded-lg flex items-center justify-center text-[#9090b0] hover:text-white hover:border-[#353540] transition-all"
            title="Notificações"
          >
            🔔
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </Link>
        )}
        <button
          onClick={logout}
          className="btn-ghost text-xs px-3 py-1.5"
        >
          Sair
        </button>
      </div>
    </header>
  )
}
