'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const STATUS_LABELS: Record<string, string> = { open: 'Aberta', progress: 'Em andamento', done: 'Concluída' }
const STATUS_CLASS: Record<string, string> = { open: 'badge-orange', progress: 'badge-blue', done: 'badge-green' }

export default function OSDetailClient({ order, workshop, role }: { order: any; workshop: any; role: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [o, setO] = useState(order)
  const [signing, setSigning] = useState<'auth' | 'delivery' | null>(null)
  const [ratings, setRatings] = useState({ parts: 0, cleaning: 0, resolved: 0 })
  const [showDelivery, setShowDelivery] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const isOwner = role === 'owner'

  async function updateStatus(status: string) {
    const { data } = await supabase.from('orders').update({ status }).eq('id', o.id).select().single()
    if (data) setO(data)
  }

  function initCanvas() {
    setTimeout(() => {
      const cv = canvasRef.current; if (!cv) return
      const ctx = cv.getContext('2d')!
      ctx.strokeStyle = '#eeeef8'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      const pos = (e: any) => { const r = cv.getBoundingClientRect(); const s = e.touches ? e.touches[0] : e; return [(s.clientX - r.left) * (cv.width / r.width), (s.clientY - r.top) * (cv.height / r.height)] }
      cv.onmousedown = e => { drawing.current = true; ctx.beginPath(); const [x, y] = pos(e); ctx.moveTo(x, y) }
      cv.onmousemove = e => { if (!drawing.current) return; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke() }
      cv.onmouseup = cv.onmouseleave = () => { drawing.current = false }
      cv.ontouchstart = e => { e.preventDefault(); drawing.current = true; ctx.beginPath(); const [x, y] = pos(e); ctx.moveTo(x, y) }
      cv.ontouchmove = e => { e.preventDefault(); if (!drawing.current) return; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke() }
      cv.ontouchend = () => { drawing.current = false }
    }, 100)
  }

  function clearCanvas() { canvasRef.current?.getContext('2d')?.clearRect(0, 0, 520, 160) }

  async function confirmSig() {
    const sig = canvasRef.current?.toDataURL()
    if (signing === 'auth') {
      const { data } = await supabase.from('orders').update({ signed: true, sig_auth: sig }).eq('id', o.id).select().single()
      if (data) setO(data)
    } else if (signing === 'delivery') {
      const { data } = await supabase.from('orders').update({
        delivered: true, sig_del: sig, status: 'done', rating: ratings,
      }).eq('id', o.id).select().single()
      if (data) setO(data)
    }
    setSigning(null)
  }

  function printOS() {
    const ws = workshop
    const logoTag = ws?.logo_url
      ? `<img src="${ws.logo_url}" style="height:60px;object-fit:contain">`
      : `<div style="width:60px;height:60px;background:#ff6b2b;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;color:#fff">${ws?.name?.[0] || '?'}</div>`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${o.number}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;color:#1a1a2e;padding:36px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #ff6b2b}
    .ws-name{font-size:20px;font-weight:800}.ws-info{font-size:12px;color:#666;margin-top:3px}
    .os-num{font-size:24px;font-weight:800;color:#ff6b2b;text-align:right}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
    .block{background:#f8f8f8;border-radius:8px;padding:12px}
    .block-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#999;margin-bottom:6px}
    .block-val{font-size:14px;font-weight:600}.block-sub{font-size:12px;color:#666;margin-top:2px}
    table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px}
    th{background:#f5f5f5;padding:8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#888;border-bottom:1px solid #eee}
    td{padding:8px;border-bottom:1px solid #f0f0f0}
    .total{background:#f8f8f8;border-radius:8px;padding:14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
    .total-label{font-size:14px;font-weight:600;color:#666}.total-val{font-size:22px;font-weight:800;color:#22c55e}
    .sig-area{border:1px dashed #ccc;border-radius:8px;height:80px;display:flex;align-items:center;justify-content:center;color:#ccc;font-size:13px}
    .footer{margin-top:28px;text-align:center;font-size:11px;color:#bbb;border-top:1px solid #eee;padding-top:14px}
    h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#999;margin:18px 0 8px}
    @media print{body{padding:20px}}</style></head><body>
    <div class="header">
      <div style="display:flex;align-items:center;gap:12px">${logoTag}<div><div class="ws-name">${ws?.name}</div><div class="ws-info">CNPJ: ${ws?.cnpj} | Tel: ${ws?.phone}${ws?.address ? ` | ${ws.address}` : ''}</div></div></div>
      <div><div class="os-num">${o.number}</div><div style="font-size:12px;color:#888;text-align:right;margin-top:4px">${new Date(o.created_at).toLocaleDateString('pt-BR')} | ${STATUS_LABELS[o.status]}</div></div>
    </div>
    <div class="grid">
      <div class="block"><div class="block-label">Cliente</div><div class="block-val">${o.client?.name}</div><div class="block-sub">CPF: ${o.client?.cpf} | Tel: ${o.client?.phone}</div></div>
      <div class="block"><div class="block-label">Veículo</div><div class="block-val">${o.vehicle?.model}</div><div class="block-sub">Placa: ${o.vehicle?.plate}${o.vehicle?.color ? ` | Cor: ${o.vehicle.color}` : ''}${o.vehicle?.km ? ` | Km: ${o.vehicle.km}` : ''}</div></div>
    </div>
    <h2>Problema Relatado</h2>
    <p style="font-size:13px;background:#f8f8f8;border-radius:8px;padding:12px;margin-bottom:16px">${o.vehicle?.problem}</p>
    <h2>Peças e Serviços</h2>
    <table><thead><tr><th>Item</th><th>Qtd</th><th>Valor</th><th>Origem</th></tr></thead><tbody>
    ${(o.items || []).map((it: any) => `<tr><td>${it.name}</td><td>${it.qty}</td><td>R$ ${it.price}</td><td>${it.from_stock ? 'Estoque' : 'Externo'}</td></tr>`).join('')}
    <tr><td><strong>Mão de obra</strong></td><td>—</td><td>R$ ${o.labor}</td><td>—</td></tr>
    </tbody></table>
    <div class="total"><span class="total-label">Valor Total</span><span class="total-val">R$ ${o.total}</span></div>
    ${o.obs ? `<p style="font-size:12px;color:#888;margin-bottom:16px"><strong>Obs:</strong> ${o.obs}</p>` : ''}
    <h2>Assinatura de Autorização</h2>
    <p style="font-size:12px;color:#888;margin-bottom:8px">Autorizo a execução dos serviços pelo valor de <strong>R$ ${o.total}</strong>.</p>
    ${o.sig_auth ? `<img src="${o.sig_auth}" style="height:80px;border:1px dashed #ccc;border-radius:8px;display:block">` : '<div class="sig-area">Aguardando assinatura</div>'}
    ${o.rating ? `<h2 style="margin-top:20px">Avaliação de Entrega</h2><p style="font-size:13px">Peças: ${'★'.repeat(o.rating.parts)} | Limpeza: ${'★'.repeat(o.rating.cleaning)} | Resolvido: ${'★'.repeat(o.rating.resolved)}</p>${o.sig_del ? `<img src="${o.sig_del}" style="height:80px;border:1px dashed #ccc;border-radius:8px;display:block;margin-top:8px">` : ''}` : ''}
    <div class="footer">Documento gerado pelo sistema <strong>OficinaPRO</strong> | ${new Date().toLocaleString('pt-BR')}</div>
    </body></html>`
    const w = window.open('', '_blank')!; w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">{o.number}</h1>
          <span className={STATUS_CLASS[o.status]}>{STATUS_LABELS[o.status]}</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {o.status === 'open' && <button onClick={() => updateStatus('progress')} className="btn-success text-sm">▶ Iniciar</button>}
          {o.status === 'progress' && <button onClick={() => updateStatus('done')} className="btn-success text-sm">✓ Finalizar</button>}
          {isOwner && o.status === 'done' && !o.delivered && (
            <button onClick={() => setShowDelivery(true)} className="btn-primary text-sm">🚗 Registrar Entrega</button>
          )}
          {isOwner && <button onClick={printOS} className="btn-ghost text-sm">🖨️ PDF</button>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="card-sm">
          <p className="text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-2">👤 Cliente</p>
          <p className="font-semibold">{o.client?.name}</p>
          <p className="text-sm text-[#9090b0]">CPF: {o.client?.cpf}</p>
          <p className="text-sm text-[#9090b0]">Tel: {o.client?.phone}</p>
        </div>
        <div className="card-sm">
          <p className="text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-2">🚗 Veículo</p>
          <p className="font-semibold">{o.vehicle?.model}</p>
          <p className="text-sm text-[#9090b0]">Placa: {o.vehicle?.plate}</p>
          {o.vehicle?.km && <p className="text-sm text-[#9090b0]">Km: {o.vehicle.km}</p>}
        </div>
      </div>

      <div className="card-sm mb-4">
        <p className="text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-2">⚠️ Problema</p>
        <p className="text-sm">{o.vehicle?.problem}</p>
        {o.obs && <p className="text-xs text-[#9090b0] mt-1">Obs: {o.obs}</p>}
      </div>

      <div className="card mb-4">
        <p className="text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-3">📦 Peças e Serviços</p>
        <table className="w-full">
          <thead><tr><th className="table-th">Item</th><th className="table-th">Qtd</th><th className="table-th">Valor</th><th className="table-th">Origem</th></tr></thead>
          <tbody>
            {(o.items || []).map((it: any, i: number) => (
              <tr key={i} className="hover:bg-[#18181f]">
                <td className="table-td">{it.name}</td><td className="table-td">{it.qty}</td>
                <td className="table-td">R$ {it.price}</td>
                <td className="table-td"><span className={it.from_stock ? 'badge-green' : 'badge-yellow'}>{it.from_stock ? 'Estoque' : 'Externo'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between text-sm mt-3 pt-3 border-t border-[#252530]">
          <span className="text-[#9090b0]">Mão de obra</span><span>R$ {o.labor}</span>
        </div>
        <div className="flex justify-between font-heading font-bold text-xl mt-2">
          <span>Total</span><span className="text-green-400">R$ {o.total}</span>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap mb-4">
        {o.signed ? <span className="badge-green">✓ Autorizado</span> : <span className="badge-red">Aguarda assinatura</span>}
        {o.delivered && <span className="badge-green">🚗 Entregue</span>}
      </div>

      {o.rating && (
        <div className="card-sm mb-4">
          <p className="text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-2">⭐ Avaliação</p>
          <div className="flex gap-4 text-sm">
            <span>Peças: {'★'.repeat(o.rating.parts)}{'☆'.repeat(5 - o.rating.parts)}</span>
            <span>Limpeza: {'★'.repeat(o.rating.cleaning)}{'☆'.repeat(5 - o.rating.cleaning)}</span>
            <span>Resolvido: {'★'.repeat(o.rating.resolved)}{'☆'.repeat(5 - o.rating.resolved)}</span>
          </div>
        </div>
      )}

      {/* Delivery modal */}
      {showDelivery && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4" onClick={() => setShowDelivery(false)}>
          <div className="bg-[#111118] border border-[#252530] rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="font-heading text-lg font-bold mb-4">Avaliação de Entrega</h2>
            {[
              { label: 'Qualidade das peças', key: 'parts' },
              { label: 'Limpeza do veículo', key: 'cleaning' },
              { label: 'Problema foi resolvido', key: 'resolved' },
            ].map(r => (
              <div key={r.key} className="mb-4">
                <p className="text-sm font-medium mb-2">{r.label}</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setRatings({ ...ratings, [r.key]: n })}
                      className={`text-2xl transition-all ${n <= (ratings as any)[r.key] ? 'text-yellow-400' : 'text-[#505068]'}`}>
                      ★
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setShowDelivery(false)} className="btn-ghost">Cancelar</button>
              <button onClick={() => { setShowDelivery(false); setSigning('delivery'); initCanvas() }} className="btn-primary">
                ✓ Confirmar e Assinar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signature modal */}
      {signing && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-[#111118] border border-[#252530] rounded-2xl w-full max-w-lg p-6">
            <h2 className="font-heading text-lg font-bold mb-2">
              {signing === 'auth' ? 'Assinatura de Autorização' : 'Assinatura de Entrega'}
            </h2>
            <p className="text-sm text-[#9090b0] mb-4">
              {signing === 'auth'
                ? `Autorizo os serviços do ${o.number} pelo valor de R$ ${o.total}.`
                : 'Confirmo que recebi o veículo em perfeito estado.'}
            </p>
            <div className="border border-dashed border-[#353540] rounded-xl overflow-hidden relative bg-[#18181f] mb-4">
              <canvas ref={canvasRef} width={520} height={160} className="w-full cursor-crosshair touch-none" />
              <button onClick={clearCanvas} className="absolute top-2 right-2 btn-ghost text-xs px-2 py-1">Limpar</button>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setSigning(null)} className="btn-ghost">Cancelar</button>
              <button onClick={confirmSig} className="btn-primary">✓ Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
