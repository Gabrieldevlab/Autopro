import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function OSPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role, workshop_id').eq('id', user.id).single()
  const wsId = profile?.workshop_id
  if (!wsId) redirect('/auth/setup')

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('workshop_id', wsId)
    .order('created_at', { ascending: false })

  const all = orders || []
  const isOwner = profile?.role === 'owner'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">Ordens de Serviço</h1>
          <p className="text-sm text-[#9090b0] mt-1">{all.length} OS registradas</p>
        </div>
        <Link href="/os/new" className="btn-primary">+ Nova OS</Link>
      </div>

      <div className="flex gap-3 mb-4">
        <span className="badge-orange">Abertas: {all.filter(o=>o.status==='open').length}</span>
        <span className="badge-blue">Em andamento: {all.filter(o=>o.status==='progress').length}</span>
        <span className="badge-green">Concluídas: {all.filter(o=>o.status==='done').length}</span>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th className="table-th">Nº OS</th><th className="table-th">Cliente</th>
              <th className="table-th">Veículo</th><th className="table-th">Placa</th>
              <th className="table-th">Status</th><th className="table-th">Total</th>
              <th className="table-th">Data</th><th className="table-th"></th>
            </tr></thead>
            <tbody>
              {all.map(o => (
                <tr key={o.id} className="hover:bg-[#18181f]">
                  <td className="table-td font-bold text-[#ff6b2b]">{o.number}</td>
                  <td className="table-td">{o.client?.name}</td>
                  <td className="table-td">{o.vehicle?.model}</td>
                  <td className="table-td"><span className="badge-gray">{o.vehicle?.plate}</span></td>
                  <td className="table-td">
                    <span className={o.status==='done'?'badge-green':o.status==='progress'?'badge-blue':'badge-orange'}>
                      {o.status==='done'?'Concluída':o.status==='progress'?'Em andamento':'Aberta'}
                    </span>
                  </td>
                  <td className="table-td text-green-400 font-semibold">R$ {o.total}</td>
                  <td className="table-td text-[#505068] text-xs">{new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="table-td">
                    <Link href={`/os/${o.id}`} className="btn-ghost text-xs px-2 py-1">Ver</Link>
                  </td>
                </tr>
              ))}
              {!all.length && (
                <tr><td colSpan={8} className="text-center py-12 text-[#505068]">Nenhuma OS cadastrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
