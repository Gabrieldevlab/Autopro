'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface Workshop {
  id: string; name: string; cnpj?: string; logo_url?: string
}
interface Profile {
  id: string; name: string; role: string; job_title?: string
  workshop_id?: string; workshops?: Workshop | null
}

const OWNER_NAV = [
  { icon: '📊', label: 'Dashboard',        href: '/dashboard' },
  { icon: '📋', label: 'Ordens de Serviço', href: '/os' },
  { icon: '📦', label: 'Estoque',           href: '/stock' },
  { icon: '💰', label: 'Custos Fixos',      href: '/costs/fixed' },
  { icon: '➕', label: 'Custos Aditivos',   href: '/costs/additive' },
  { icon: '👷', label: 'Funcionários',      href: '/employees' },
  { icon: '⚙️', label: 'Minha Empresa',    href: '/settings' },
  { icon: '🔔', label: 'Notificações',      href: '/notifications' },
]

const EMPLOYEE_NAV = [
  { icon: '📋', label: 'Ordens de Serviço', href: '/os' },
]

const ADMIN_NAV = [
  { icon: '📊', label: 'Dashboard',  href: '/admin' },
  { icon: '🏪', label: 'Oficinas',   href: '/admin/workshops' },
  { icon: '👥', label: 'Usuários',   href: '/admin/users' },
]

const JOB_LABELS: Record<string, string> = {
  mechanic:     'Mecânico',
  painter:      'Funileiro / Pintor',
  receptionist: 'Recepcionista',
}

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const ws = profile.workshops as Workshop | null
  const role = profile.role

  const navItems =
    role === 'admin'    ? ADMIN_NAV :
    role === 'employee' ? EMPLOYEE_NAV :
    OWNER_NAV

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  function isActive(href: string) {
    if (href === '/dashboard' || href === '/admin') return pathname === href
    return pathname.startsWith(href)
  }

  const roleLabel =
    role === 'admin'    ? 'Administrador' :
    role === 'owner'    ? 'Dono da Oficina' :
    JOB_LABELS[profile.job_title || ''] || 'Funcionário'

  return (
    <aside className="w-[230px] bg-[#111118] border-r border-[#252530] fixed left-0 top-0 h-screen flex flex-col z-50">

      {/* Cabeçalho com logo da oficina */}
      <div className="p-4 border-b border-[#252530] flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-[#ff6b2b]/20 border border-[#ff6b2b]/30 flex items-center justify-center">
          {ws?.logo_url ? (
            <Image
              src={ws.logo_url}
              alt="logo"
              width={36}
              height={36}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <span className="text-[#ff6b2b] font-bold text-sm">
              {ws?.name?.[0]?.toUpperCase() || '🔧'}
            </span>
          )}
        </div>
        <div className="overflow-hidden min-w-0">
          <div className="font-heading text-sm font-bold truncate">
            {ws?.name || 'OficinaPRO'}
          </div>
          <div className="text-[10px] text-[#505068] truncate">
            {ws?.cnpj || 'Sistema'}
          </div>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
          >
            <span className="text-base leading-none">{item.icon}</span>
            <span className="text-sm">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Rodapé com usuário + logout */}
      <div className="p-4 border-t border-[#252530]">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#ff6b2b]/20 border border-[#ff6b2b]/30 flex items-center justify-center text-[#ff6b2b] font-bold text-sm flex-shrink-0">
            {profile.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="overflow-hidden min-w-0">
            <div className="text-sm font-medium truncate">{profile.name}</div>
            <div className="text-[11px] text-[#505068] truncate">{roleLabel}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full text-xs text-[#505068] hover:text-red-400 transition-colors text-left px-1 py-1"
        >
          Sair da conta →
        </button>
      </div>
    </aside>
  )
}
