import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [{ data: workshops }, { data: users }, { data: orders }] = await Promise.all([
    supabase.from('workshops').select('*').order('created_at'),
    supabase.from('profiles').select('*'),
    supabase.from('orders').select('id, workshop_id'),
  ])

  const wsList = workshops || []
  const usersList = users || []
  const ordersList = orders || []

  return (
    <div className="min-h-screen bg-[#08080f] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-[#ff6b2b] rounded-xl flex items-center justify-center text-lg">🔧</div>
          <span className="font-heading text-xl font-bold">Oficina<span className="text-[#ff6b2b]">PRO</span> — Admin</span>
        </div>
        <p className="text-sm text-[#9090b0] mb-8">Painel de controle do sistema</p>

        {/* Métricas */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Oficinas Ativas', value: wsList.filter(w => w.status === 'active').length, color: 'text-green-400' },
            { label: 'Total Oficinas', value: wsList.length, color: 'text-white' },
            { label: 'Usuários', value: usersList.length, color: 'text-blue-400' },
            { label: 'OS no Sistema', value: ordersList.length, color: 'text-[#ff6b2b]' },
          ].map(m => (
            <div key={m.label} className="bg-[#111118] border border-[#252530] rounded-xl p-4">
              <p className="text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-2">{m.label}</p>
              <p className={`font-heading text-3xl font-bold ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Lista oficinas */}
        <div className="bg-[#111118] border border-[#252530] rounded-2xl p-5">
          <h2 className="font-heading text-base font-bold mb-4">🏪 Oficinas Cadastradas</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Logo</th>
                  <th className="table-th">Nome</th>
                  <th className="table-th">CNPJ</th>
                  <th className="table-th">Telefone</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">OS</th>
                  <th className="table-th">Ações</th>
                </tr>
              </thead>
              <tbody>
                {wsList.map(w => (
                  <tr key={w.id} className="hover:bg-[#18181f]">
                    <td className="table-td">
                      {w.logo_url
                        ? <img src={w.logo_url} alt="logo" className="w-9 h-9 rounded-lg object-cover bg-[#18181f]" />
                        : <div className="w-9 h-9 bg-[#ff6b2b]/20 rounded-lg flex items-center justify-center text-[#ff6b2b] font-bold">{w.name?.[0]}</div>
                      }
                    </td>
                    <td className="table-td font-semibold">{w.name}</td>
                    <td className="table-td text-[#9090b0]">{w.cnpj}</td>
                    <td className="table-td">{w.phone}</td>
                    <td className="table-td">
                      {w.status === 'active'
                        ? <span className="badge-green">Ativa</span>
                        : <span className="badge-red">Bloqueada</span>
                      }
                    </td>
                    <td className="table-td">{ordersList.filter(o => o.workshop_id === w.id).length}</td>
                    <td className="table-td">
                      <form action={`/api/admin/workshop-status`} method="POST">
                        <input type="hidden" name="id" value={w.id} />
                        <input type="hidden" name="status" value={w.status === 'active' ? 'blocked' : 'active'} />
                        <button
                          type="submit"
                          className={w.status === 'active' ? 'btn-danger text-xs px-3 py-1' : 'btn-success text-xs px-3 py-1'}
                        >
                          {w.status === 'active' ? 'Bloquear' : 'Liberar'}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 text-right">
          <form action="/api/auth/signout" method="POST">
            <button className="btn-ghost text-sm">Sair da conta</button>
          </form>
        </div>
      </div>
    </div>
  )
}
