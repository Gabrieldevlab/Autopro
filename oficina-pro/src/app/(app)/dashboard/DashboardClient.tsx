'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'

const PAY_LABELS: Record<string, string> = {
  pix:    'PIX',
  credit: 'Cartao de Credito',
  debit:  'Cartao de Debito',
  cash:   'Dinheiro',
}
const PAY_ICONS:  Record<string, string> = { pix: '⚡', credit: '💳', debit: '🏧', cash: '💵' }
const PAY_COLORS: Record<string, string> = {
  pix:    '#5b9cf6',
  credit: '#a78bfa',
  debit:  '#34d399',
  cash:   '#f6c90e',
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getWeekRange(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const mon = new Date(d.setDate(diff))
  mon.setHours(0,0,0,0)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  sun.setHours(23,59,59,999)
  return { start: mon, end: sun }
}

interface Props {
  orders: any[]
  costs: any[]
  stock: any[]
  workshop: any
}

export default function DashboardClient({ orders, costs, stock, workshop }: Props) {
  const [period, setPeriod] = useState<'week' | 'month' | 'custom'>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')

  const now = new Date()
  const monthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`

  // ── filtro de período ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return orders.filter(o => {
      const d = new Date(o.created_at)
      if (period === 'month') {
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      }
      if (period === 'week') {
        const { start, end } = getWeekRange(now)
        return d >= start && d <= end
      }
      if (period === 'custom' && customFrom && customTo) {
        const from = new Date(customFrom + 'T00:00:00')
        const to   = new Date(customTo   + 'T23:59:59')
        return d >= from && d <= to
      }
      return true
    })
  }, [orders, period, customFrom, customTo])

  // ── métricas ──────────────────────────────────────────────────────────────
  const done    = filtered.filter(o => o.status === 'done')
  const revenue = done.reduce((s: number, o: any) => s + (o.total || 0), 0)
  const fixed   = (costs || []).filter((c: any) => c.type === 'fixed').reduce((s: number, c: any) => s + c.value, 0)
  const additive= (costs || []).filter((c: any) => c.type === 'additive').reduce((s: number, c: any) => s + c.value, 0)

  const stockMap = Object.fromEntries((stock || []).map((s: any) => [s.id, s]))
  let repoCost = 0
  filtered.forEach((o: any) => {
    ;(o.items || []).forEach((it: any) => {
      if (it.from_stock && stockMap[it.from_stock]) {
        repoCost += (stockMap[it.from_stock].cost_price || 0) * it.qty
      }
    })
  })

  const totalCosts = fixed + additive + repoCost
  const profit     = revenue - totalCosts
  const open       = filtered.filter(o => o.status !== 'done').length

  // ── fluxo por forma de pagamento ──────────────────────────────────────────
  const payFlow = ['pix','credit','debit','cash'].map(key => {
    const list  = done.filter(o => o.payment_method === key)
    const total = list.reduce((s: number, o: any) => s + (o.total || 0), 0)
    return { key, label: PAY_LABELS[key], icon: PAY_ICONS[key], color: PAY_COLORS[key], count: list.length, total }
  })
  const unknownPay = done.filter(o => !o.payment_method)
  if (unknownPay.length) {
    payFlow.push({
      key: 'unknown', label: 'Nao informado', icon: '❓', color: '#6b7280',
      count: unknownPay.length,
      total: unknownPay.reduce((s: number, o: any) => s + (o.total || 0), 0),
    })
  }

  // ── rótulo do período selecionado ─────────────────────────────────────────
  function periodLabel() {
    if (period === 'month') {
      return now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    }
    if (period === 'week') {
      const { start, end } = getWeekRange(now)
      return `${start.toLocaleDateString('pt-BR')} a ${end.toLocaleDateString('pt-BR')}`
    }
    if (customFrom && customTo) {
      return `${new Date(customFrom+'T12:00:00').toLocaleDateString('pt-BR')} a ${new Date(customTo+'T12:00:00').toLocaleDateString('pt-BR')}`
    }
    return 'Periodo personalizado'
  }

  // ── impressão do relatório ────────────────────────────────────────────────
  function printReport() {
    const ws = workshop
    const logoTag = ws?.logo_url
      ? `<img src="${ws.logo_url}" style="height:56px;object-fit:contain">`
      : `<div style="width:56px;height:56px;background:#ff6b2b;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#fff">${ws?.name?.[0] || '?'}</div>`

    const rows = filtered.map((o: any) => {
      const payL = o.payment_method ? PAY_LABELS[o.payment_method] || o.payment_method : '-'
      const st   = o.status === 'done' ? 'Concluida' : o.status === 'progress' ? 'Em andamento' : 'Aberta'
      return `<tr>
        <td>${o.number}</td>
        <td>${o.client?.name || '-'}</td>
        <td>${o.vehicle?.model || '-'} / ${o.vehicle?.plate || '-'}</td>
        <td>${st}</td>
        <td>${payL}</td>
        <td>R$ ${fmt(o.total || 0)}</td>
        <td>${new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
      </tr>`
    }).join('')

    const payRows = payFlow.filter(p => p.count > 0).map(p =>
      `<tr><td>${p.icon} ${p.label}</td><td>${p.count}</td><td>R$ ${fmt(p.total)}</td></tr>`
    ).join('')

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Relatorio - ${periodLabel()}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;color:#1a1a2e;padding:36px;font-size:13px}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #ff6b2b}
.ws-name{font-size:20px;font-weight:800}
.ws-info{font-size:12px;color:#666;margin-top:3px}
.report-title{font-size:18px;font-weight:800;color:#ff6b2b;text-align:right}
.report-period{font-size:12px;color:#888;text-align:right;margin-top:4px}
.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
.metric{background:#f8f8f8;border-radius:8px;padding:12px}
.metric-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#999;margin-bottom:4px}
.metric-val{font-size:20px;font-weight:800}
h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#999;margin:20px 0 8px}
table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px}
th{background:#f5f5f5;padding:7px 8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#888;border-bottom:1px solid #eee}
td{padding:7px 8px;border-bottom:1px solid #f0f0f0}
.pay-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:20px}
.pay-card{background:#f8f8f8;border-radius:8px;padding:12px;display:flex;align-items:center;gap:10px}
.pay-info .label{font-size:10px;font-weight:700;text-transform:uppercase;color:#999}
.pay-info .val{font-size:16px;font-weight:800;color:#1a1a2e}
.pay-info .count{font-size:11px;color:#666}
.footer{margin-top:28px;text-align:center;font-size:11px;color:#bbb;border-top:1px solid #eee;padding-top:14px}
@media print{body{padding:20px}}
</style></head><body>
<div class="header">
  <div style="display:flex;align-items:center;gap:12px">
    ${logoTag}
    <div>
      <div class="ws-name">${ws?.name || 'Oficina'}</div>
      <div class="ws-info">CNPJ: ${ws?.cnpj || '-'} | Tel: ${ws?.phone || '-'}${ws?.address ? ` | ${ws.address}` : ''}</div>
    </div>
  </div>
  <div>
    <div class="report-title">Relatorio Financeiro</div>
    <div class="report-period">${periodLabel()}</div>
  </div>
</div>

<div class="metrics">
  <div class="metric"><div class="metric-label">Faturamento</div><div class="metric-val" style="color:#22c55e">R$ ${fmt(revenue)}</div></div>
  <div class="metric"><div class="metric-label">Lucro Liquido</div><div class="metric-val" style="color:${profit>=0?'#22c55e':'#ef4444'}">R$ ${fmt(profit)}</div></div>
  <div class="metric"><div class="metric-label">Custos Totais</div><div class="metric-val" style="color:#ef4444">R$ ${fmt(totalCosts)}</div></div>
  <div class="metric"><div class="metric-label">OS no Periodo</div><div class="metric-val" style="color:#ff6b2b">${filtered.length}</div></div>
</div>

<h2>Fluxo de Pagamentos</h2>
<div class="pay-grid">
  ${payFlow.filter(p=>p.count>0).map(p=>`
  <div class="pay-card">
    <span style="font-size:28px">${p.icon}</span>
    <div class="pay-info">
      <div class="label">${p.label}</div>
      <div class="val">R$ ${fmt(p.total)}</div>
      <div class="count">${p.count} OS</div>
    </div>
  </div>`).join('')}
</div>

<table>
  <thead><tr><th>Metodo</th><th>Qt. OS</th><th>Total</th></tr></thead>
  <tbody>${payRows}</tbody>
</table>

<h2>Distribuicao de Custos</h2>
<table>
  <thead><tr><th>Categoria</th><th>Valor</th></tr></thead>
  <tbody>
    <tr><td>Custos Fixos</td><td>R$ ${fmt(fixed)}</td></tr>
    <tr><td>Custos Aditivos</td><td>R$ ${fmt(additive)}</td></tr>
    <tr><td>Reposicao de Pecas</td><td>R$ ${fmt(repoCost)}</td></tr>
    <tr style="font-weight:700"><td>Total de Custos</td><td>R$ ${fmt(totalCosts)}</td></tr>
    <tr style="font-weight:700;color:#22c55e"><td>Lucro Liquido</td><td>R$ ${fmt(profit)}</td></tr>
  </tbody>
</table>

<h2>Ordens de Servico do Periodo (${filtered.length})</h2>
<table>
  <thead><tr><th>N. OS</th><th>Cliente</th><th>Veiculo / Placa</th><th>Status</th><th>Pagamento</th><th>Valor</th><th>Data</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="7" style="text-align:center;color:#999">Nenhuma OS no periodo</td></tr>'}</tbody>
</table>

<div class="footer">
  Relatorio gerado pelo sistema <strong>OficinaPRO</strong> | ${new Date().toLocaleString('pt-BR')}
</div>
</body></html>`

    const w = window.open('', '_blank')!
    w.document.write(html)
    w.document.close()
    setTimeout(() => w.print(), 600)
  }

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold">Dashboard Financeiro</h1>
          <p className="text-sm text-[#9090b0] mt-1">{workshop?.name}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/os/new" className="btn-primary">+ Nova OS</Link>
          <button onClick={printReport} className="btn-ghost text-sm">
            🖨️ Imprimir Relatorio
          </button>
        </div>
      </div>

      {/* Seletor de período */}
      <div className="card mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-[#9090b0] uppercase tracking-wider">Periodo:</span>
          {[
            { v: 'week',   l: 'Esta semana'  },
            { v: 'month',  l: 'Este mes'     },
            { v: 'custom', l: 'Personalizado'},
          ].map(opt => (
            <button key={opt.v} onClick={() => setPeriod(opt.v as any)}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-all ${
                period === opt.v
                  ? 'border-[#ff6b2b] bg-[#ff6b2b]/10 text-[#ff6b2b]'
                  : 'border-[#252530] text-[#9090b0] hover:border-[#353540]'
              }`}>
              {opt.l}
            </button>
          ))}
          {period === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input type="date" className="input-base text-sm py-1.5 px-2 w-36"
                value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
              <span className="text-[#505068] text-sm">ate</span>
              <input type="date" className="input-base text-sm py-1.5 px-2 w-36"
                value={customTo} onChange={e => setCustomTo(e.target.value)} />
            </div>
          )}
          <span className="text-xs text-[#505068] ml-auto">{periodLabel()}</span>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Faturamento',  value: `R$ ${fmt(revenue)}`, color: 'text-green-400', sub: `${done.length} OS finalizadas`  },
          { label: 'Lucro Liquido',value: `R$ ${fmt(profit)}`,  color: profit>=0?'text-green-400':'text-red-400', sub: profit>=0?'Saudavel':'Atencao' },
          { label: 'Custos Totais',value: `R$ ${fmt(totalCosts)}`,color:'text-red-400', sub: 'Fixo + Adic. + Pecas' },
          { label: 'OS em Aberto', value: String(open),          color: 'text-[#ff6b2b]', sub: `${filtered.filter(o=>o.status==='progress').length} em andamento` },
        ].map(m => (
          <div key={m.label} className="card">
            <p className="text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-1.5">{m.label}</p>
            <p className={`font-heading text-2xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-[#505068] mt-1">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Fluxo de pagamentos */}
      <div className="card mb-6">
        <h3 className="font-heading text-sm font-bold mb-4">💳 Fluxo de Pagamentos</h3>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {payFlow.map(p => (
            <div key={p.key} className="bg-[#18181f] rounded-xl p-4 border border-[#252530]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{p.icon}</span>
                <span className="text-xs font-semibold text-[#9090b0] uppercase tracking-wider leading-tight">{p.label}</span>
              </div>
              <p className="font-heading text-xl font-bold" style={{ color: p.color }}>
                R$ {fmt(p.total)}
              </p>
              <p className="text-xs text-[#505068] mt-1">{p.count} OS</p>
              <div className="bg-[#252530] rounded-full h-1 mt-2 overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${revenue > 0 ? Math.min(100, p.total/revenue*100) : 0}%`, background: p.color }} />
              </div>
            </div>
          ))}
        </div>
        {/* Tabela resumo pagamentos */}
        <table className="w-full">
          <thead><tr>
            <th className="table-th">Metodo</th>
            <th className="table-th">Qt. OS</th>
            <th className="table-th">Total Recebido</th>
            <th className="table-th">% do Faturamento</th>
          </tr></thead>
          <tbody>
            {payFlow.filter(p => p.count > 0).map(p => (
              <tr key={p.key} className="hover:bg-[#18181f]">
                <td className="table-td">
                  <span className="flex items-center gap-2">
                    <span>{p.icon}</span>
                    <span className="font-medium">{p.label}</span>
                  </span>
                </td>
                <td className="table-td">{p.count}</td>
                <td className="table-td font-semibold" style={{ color: p.color }}>R$ {fmt(p.total)}</td>
                <td className="table-td text-[#9090b0]">
                  {revenue > 0 ? (p.total/revenue*100).toFixed(1) : 0}%
                </td>
              </tr>
            ))}
            {payFlow.every(p => p.count === 0) && (
              <tr><td colSpan={4} className="table-td text-center text-[#505068]">Nenhum pagamento no periodo</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Grade inferior: OS + Distribuição financeira */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h3 className="font-heading text-sm font-bold mb-3">📋 Ultimas OS do Periodo</h3>
          <table className="w-full">
            <thead><tr>
              <th className="table-th">N.</th>
              <th className="table-th">Cliente</th>
              <th className="table-th">Pagamento</th>
              <th className="table-th">Valor</th>
            </tr></thead>
            <tbody>
              {filtered.slice(-6).reverse().map((o: any) => (
                <tr key={o.id} className="hover:bg-[#18181f] cursor-pointer">
                  <td className="table-td font-bold text-[#ff6b2b]">{o.number}</td>
                  <td className="table-td">{o.client?.name}</td>
                  <td className="table-td">
                    {o.payment_method
                      ? <span className="flex items-center gap-1 text-xs">
                          <span>{PAY_ICONS[o.payment_method]}</span>
                          <span>{PAY_LABELS[o.payment_method]}</span>
                        </span>
                      : <span className="text-[#505068] text-xs">-</span>
                    }
                  </td>
                  <td className="table-td text-green-400 font-semibold">R$ {fmt(o.total||0)}</td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={4} className="table-td text-center text-[#505068]">Nenhuma OS no periodo</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3 className="font-heading text-sm font-bold mb-3">📊 Distribuicao Financeira</h3>
          {[
            { l: 'Custos Fixos',       v: fixed,     c: '#5b9cf6' },
            { l: 'Custos Aditivos',    v: additive,  c: '#f6c90e' },
            { l: 'Reposicao de Pecas', v: repoCost,  c: '#ff6b2b' },
            { l: 'Lucro Liquido',      v: Math.max(0,profit), c: '#4ecb71' },
          ].map(x => (
            <div key={x.l} className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#9090b0]">{x.l}</span>
                <span style={{ color: x.c }} className="font-semibold">R$ {fmt(x.v)}</span>
              </div>
              <div className="bg-[#18181f] rounded-full h-1.5 overflow-hidden">
                <div className="h-full rounded-full"
                  style={{ width: `${revenue>0?Math.min(100,(x.v/revenue*100)):0}%`, background: x.c }} />
              </div>
            </div>
          ))}

          {/* Baixo estoque */}
          {(stock||[]).filter((s:any)=>s.qty<=3).length > 0 && (
            <>
              <h3 className="font-heading text-sm font-bold mt-4 mb-2">⚠️ Estoque Baixo</h3>
              {(stock||[]).filter((s:any)=>s.qty<=3).map((s:any) => (
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
      <div className="card">
        <h3 className="font-heading text-sm font-bold mb-3">🧾 Custo de Reposicao por OS</h3>
        <table className="w-full">
          <thead><tr>
            <th className="table-th">N. OS</th>
            <th className="table-th">Cliente</th>
            <th className="table-th">Pagamento</th>
            <th className="table-th">Custo Repos.</th>
            <th className="table-th">Receita</th>
            <th className="table-th">Margem</th>
          </tr></thead>
          <tbody>
            {filtered.filter((o:any) => (o.items||[]).some((i:any) => i.from_stock)).map((o:any) => {
              let repo = 0
              ;(o.items||[]).forEach((it:any) => {
                if (it.from_stock && stockMap[it.from_stock]) repo += (stockMap[it.from_stock].cost_price||0)*it.qty
              })
              const margem = (o.total||0) - repo
              return (
                <tr key={o.id} className="hover:bg-[#18181f]">
                  <td className="table-td font-bold text-[#ff6b2b]">{o.number}</td>
                  <td className="table-td">{o.client?.name}</td>
                  <td className="table-td text-xs">
                    {o.payment_method ? `${PAY_ICONS[o.payment_method]} ${PAY_LABELS[o.payment_method]}` : '-'}
                  </td>
                  <td className="table-td text-red-400 font-semibold">R$ {fmt(repo)}</td>
                  <td className="table-td text-green-400">R$ {fmt(o.total||0)}</td>
                  <td className={`table-td font-semibold ${margem>=0?'text-green-400':'text-red-400'}`}>R$ {fmt(margem)}</td>
                </tr>
              )
            })}
            {!filtered.some((o:any)=>(o.items||[]).some((i:any)=>i.from_stock)) && (
              <tr><td colSpan={6} className="table-td text-center text-[#505068]">Nenhuma OS com pecas do estoque</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
