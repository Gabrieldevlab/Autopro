import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role, workshop_id').eq('id', user.id).single()
  if (!profile?.workshop_id) redirect('/auth/setup')

  const wsId = profile.workshop_id

  const [{ data: orders }, { data: costs }, { data: stock }, { data: ws }] = await Promise.all([
    supabase.from('orders').select('*').eq('workshop_id', wsId),
    supabase.from('costs').select('*').eq('workshop_id', wsId),
    supabase.from('stock').select('*').eq('workshop_id', wsId),
    supabase.from('workshops').select('*').eq('id', wsId).single(),
  ])

  const done = (orders || []).filter(o => o.status === 'done')
  const revenue = done.reduce((s: number, o: any) => s + o.total, 0)
  const fixed = (costs || []).filter((c: any) => c.type === 'fixed').reduce((s: number, c: any) => s + c.value, 0)
  const additive = (costs || []).filter((c: any) => c.type === 'additive').reduce((s: number, c: any) => s + c.value, 0)

  // Custo de reposição de peças
  let stockRepoCost = 0
  const stockMap = Object.fromEntries((stock || []).map((s: any) => [s.id, s]))
  ;(orders || []).forEach((o: any) => {
    ;(o.items || []).forEach((it: any) => {
      if (it.from_stock && stockMap[it.from_stock]) {
        stockRepoCost += (stockMap[it.from_stock].cost_price || 0) * it.qty
      }
    })
  })

  const totalCosts = fixed + additive + stockRepoCost
  const profit = revenue - totalCosts
  const open = (orders || []).filter((o: any) => o.status !== 'done').length
  const lowStock = (stock || []).filter((s: any) => s.qty <= 3)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">Dashboard Financeiro</h1>
          <p className="text-sm text-[#9090b0] mt-1">{ws?.data?.name || ws?.name}</p>
        </div>
        <Link href="/os/new" className="btn-primary">+ Nova OS</Link>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Faturamento', value: `R$ ${fmt(revenue)}`, color: 'text-green-400', sub: 'OS finalizadas' },
          { label: 'Lucro Líquido', value: `R$ ${fmt(profit)}`, color: profit >= 0 ? 'text-green-400' : 'text-red-400', sub: profit >= 0 ? 'Saudável' : 'Atenção' },
          { label: 'Custos Totais', value: `R$ ${fmt(totalCosts)}`, color: 'text-red-400', sub: `Fixo + Adic. + Peças` },
          { label: 'OS em Aberto', value: String(open), color: 'text-[#ff6b2b]', sub: `${(orders||[]).filter((o:any)=>o.status==='progress').length} em andamento` },
        ].map(m => (
          <div key={m.label} className="card">
            <p className="text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-1.5">{m.label}</p>
            <p className={`font-heading text-2xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-[#505068] mt-1">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Últimas OS */}
        <div className="card">
          <h3 className="font-heading text-sm font-bold mb-3">📋 Últimas Ordens de Serviço</h3>
          <table className="w-full">
            <thead><tr>
              <th className="table-th">Nº</th><th className="table-th">Cliente</th>
              <th className="table-th">Status</th><th className="table-th">Valor</th>
            </tr></thead>
            <tbody>
              {(orders || []).slice(-5).reverse().map((o: any) => (
                <tr key={o.id} className="hover:bg-[#18181f] cursor-pointer">
                  <td className="table-td font-bold text-[#ff6b2b]">{o.number}</td>
                  <td className="table-td">{o.client?.name}</td>
                  <td className="table-td">
                    <span className={o.status==='done'?'badge-green':o.status==='progress'?'badge-blue':'badge-orange'}>
                      {o.status==='done'?'Concluída':o.status==='progress'?'Em andamento':'Aberta'}
                    </span>
                  </td>
                  <td className="table-td text-green-400 font-semibold">R$ {o.total}</td>
                </tr>
              ))}
              {!(orders?.length) && <tr><td colSpan={4} className="table-td text-center text-[#505068]">Nenhuma OS</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Distribuição + Baixo estoque */}
        <div className="card">
          <h3 className="font-heading text-sm font-bold mb-3">📊 Distribuição Financeira</h3>
          {[
            { l: 'Custos Fixos', v: fixed, c: '#5b9cf6' },
            { l: 'Custos Aditivos', v: additive, c: '#f6c90e' },
            { l: 'Reposição de Peças', v: stockRepoCost, c: '#ff6b2b' },
            { l: 'Lucro Líquido', v: Math.max(0, profit), c: '#4ecb71' },
          ].map(x => (
            <div key={x.l} className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#9090b0]">{x.l}</span>
                <span style={{ color: x.c }} className="font-semibold">R$ {fmt(x.v)}</span>
              </div>
              <div className="bg-[#18181f] rounded-full h-1.5 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${revenue > 0 ? Math.min(100, (x.v / revenue * 100)) : 0}%`, background: x.c }} />
              </div>
            </div>
          ))}

          {lowStock.length > 0 && (
            <>
              <h3 className="font-heading text-sm font-bold mt-4 mb-2">⚠️ Estoque Baixo</h3>
              {lowStock.map((s: any) => (
                <div key={s.id} className="flex justify-between text-xs py-1.5 border-b border-[#252530]">
                  <span>{s.name}</span>
                  <span className="badge-red">{s.qty} {s.unit}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Custo de reposição por OS */}
      <div className="card mt-4">
        <h3 className="font-heading text-sm font-bold mb-3">🧾 Custo de Reposição por OS</h3>
        <table className="w-full">
          <thead><tr>
            <th className="table-th">Nº OS</th><th className="table-th">Cliente</th>
            <th className="table-th">Peças usadas</th><th className="table-th">Custo Reposição</th>
            <th className="table-th">Receita</th><th className="table-th">Margem</th>
          </tr></thead>
          <tbody>
            {(orders || []).filter((o: any) => (o.items||[]).some((i: any) => i.from_stock)).map((o: any) => {
              let repo = 0
              ;(o.items || []).forEach((it: any) => {
                if (it.from_stock && stockMap[it.from_stock]) repo += (stockMap[it.from_stock].cost_price || 0) * it.qty
              })
              const margem = o.total - repo
              return (
                <tr key={o.id} className="hover:bg-[#18181f]">
                  <td className="table-td font-bold text-[#ff6b2b]">{o.number}</td>
                  <td className="table-td">{o.client?.name}</td>
                  <td className="table-td text-xs text-[#9090b0]">{(o.items||[]).filter((i:any)=>i.from_stock).map((i:any)=>i.name).join(', ')}</td>
                  <td className="table-td text-red-400 font-semibold">R$ {fmt(repo)}</td>
                  <td className="table-td text-green-400">R$ {fmt(o.total)}</td>
                  <td className={`table-td font-semibold ${margem>=0?'text-green-400':'text-red-400'}`}>R$ {fmt(margem)}</td>
                </tr>
              )
            })}
            {!(orders||[]).some((o:any)=>(o.items||[]).some((i:any)=>i.from_stock)) && (
              <tr><td colSpan={6} className="table-td text-center text-[#505068]">Nenhuma OS com peças do estoque</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
