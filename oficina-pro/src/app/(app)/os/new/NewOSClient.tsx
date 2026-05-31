'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props { workshopId: string; stock: any[] }

const PAYMENT_OPTIONS = [
  { value: 'pix',    label: 'PIX',               icon: '⚡' },
  { value: 'credit', label: 'Cartão de Crédito',  icon: '💳' },
  { value: 'debit',  label: 'Cartão de Débito',   icon: '🏧' },
  { value: 'cash',   label: 'Dinheiro',            icon: '💵' },
]

export default function NewOSClient({ workshopId, stock }: Props) {
  const supabase = createClient()
  const router   = useRouter()
  const [step,    setStep]    = useState(0)
  const [client,  setClient]  = useState({ name: '', cpf: '', phone: '', email: '' })
  const [vehicle, setVehicle] = useState({ model: '', plate: '', color: '', km: '', problem: '' })
  const [items,   setItems]   = useState<any[]>([])
  const [labor,   setLabor]   = useState(0)
  const [obs,     setObs]     = useState('')
  const [payment, setPayment] = useState('')
  const [signing, setSigning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [savedOSId, setSavedOSId] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing   = useRef(false)

  const steps      = ['Cliente', 'Veículo', 'Peças', 'Orçamento']
  const partsTotal = items.reduce((s, i) => s + i.price, 0)
  const total      = partsTotal + labor

  const [selStock, setSelStock] = useState('')
  const [selQty,   setSelQty]   = useState(1)
  const [extName,  setExtName]  = useState('')
  const [extPrice, setExtPrice] = useState('')
  const [extQty,   setExtQty]   = useState(1)

  function addStock() {
    if (!selStock) return
    const s = stock.find(x => x.id === selStock)
    if (!s) return
    if (s.qty < selQty) { setError(`Estoque insuficiente (${s.qty} disponíveis).`); return }
    setItems([...items, { name: s.name, qty: selQty, price: s.sale_price * selQty, from_stock: s.id }])
    setSelStock(''); setSelQty(1); setError('')
  }

  async function addExternal() {
    if (!extName) return
    const p = parseFloat(extPrice) || 0
    setItems([...items, { name: extName, qty: extQty, price: p * extQty, from_stock: null }])
    await supabase.from('notifications').insert({
      workshop_id: workshopId,
      message: `Peca externa "${extName}" utilizada em OS - considere adicionar ao estoque.`,
    })
    setExtName(''); setExtPrice(''); setExtQty(1)
  }

  async function saveAndSign() {
    if (!payment) { setError('Selecione a forma de pagamento.'); return }
    setLoading(true)
    const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('workshop_id', workshopId)
    const num = `OS-${String((count || 0) + 1).padStart(3, '0')}`
    for (const it of items) {
      if (it.from_stock) {
        const s = stock.find(x => x.id === it.from_stock)
        if (s) await supabase.from('stock').update({ qty: s.qty - it.qty }).eq('id', it.from_stock)
      }
    }
    const { data: os, error: osErr } = await supabase.from('orders').insert({
      workshop_id: workshopId, number: num, status: 'open',
      client, vehicle, items, labor, total, obs,
      payment_method: payment,
      signed: false, delivered: false,
    }).select().single()
    if (osErr || !os) { setError('Erro ao salvar OS: ' + osErr?.message); setLoading(false); return }
    setSavedOSId(os.id)
    setLoading(false)
    setSigning(true)
    setTimeout(initCanvas, 100)
  }

  function initCanvas() {
    const cv = canvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d')!
    ctx.strokeStyle = '#eeeef8'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    const pos = (e: any) => {
      const r = cv.getBoundingClientRect()
      const src = e.touches ? e.touches[0] : e
      return [(src.clientX - r.left) * (cv.width / r.width), (src.clientY - r.top) * (cv.height / r.height)]
    }
    cv.onmousedown  = e => { drawing.current = true; ctx.beginPath(); const [x,y] = pos(e); ctx.moveTo(x,y) }
    cv.onmousemove  = e => { if (!drawing.current) return; const [x,y] = pos(e); ctx.lineTo(x,y); ctx.stroke() }
    cv.onmouseup = cv.onmouseleave = () => { drawing.current = false }
    cv.ontouchstart = e => { e.preventDefault(); drawing.current = true; ctx.beginPath(); const [x,y] = pos(e); ctx.moveTo(x,y) }
    cv.ontouchmove  = e => { e.preventDefault(); if (!drawing.current) return; const [x,y] = pos(e); ctx.lineTo(x,y); ctx.stroke() }
    cv.ontouchend   = () => { drawing.current = false }
  }

  function clearCanvas() { canvasRef.current?.getContext('2d')?.clearRect(0,0,520,160) }

  async function confirmSig() {
    const cv = canvasRef.current; if (!cv || !savedOSId) return
    await supabase.from('orders').update({ signed: true, sig_auth: cv.toDataURL() }).eq('id', savedOSId)
    router.push(`/os/${savedOSId}`)
  }

  const payLabel = PAYMENT_OPTIONS.find(p => p.value === payment)?.label || ''

  if (signing) return (
    <div className="max-w-lg mx-auto">
      <h1 className="font-heading text-2xl font-bold mb-2">Assinatura do Cliente</h1>
      <p className="text-sm text-[#9090b0] mb-6">
        Eu, <strong>{client.name}</strong>, autorizo os servicos no valor de <strong>R$ {total}</strong>
        {payment && ` — pagamento via ${payLabel}`}.
      </p>
      <div className="card mb-4">
        <div className="border border-dashed border-[#353540] rounded-xl overflow-hidden relative bg-[#18181f]">
          <canvas ref={canvasRef} width={520} height={160} className="w-full cursor-crosshair touch-none" />
          <button onClick={clearCanvas} className="absolute top-2 right-2 btn-ghost text-xs px-2 py-1">Limpar</button>
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <button onClick={() => { setSigning(false); router.push('/os') }} className="btn-ghost">Cancelar</button>
        <button onClick={confirmSig} className="btn-primary">Confirmar Assinatura</button>
      </div>
    </div>
  )

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="font-heading text-2xl font-bold mb-6">Nova Ordem de Servico</h1>
      <div className="flex gap-1 mb-6">
        {steps.map((s, i) => (
          <div key={s} className={`flex-1 h-1 rounded-full transition-all ${i < step ? 'bg-green-400' : i === step ? 'bg-[#ff6b2b]' : 'bg-[#252530]'}`} />
        ))}
      </div>
      <p className="text-xs text-[#9090b0] mb-4">Passo {step + 1} / {steps.length} — {steps[step]}</p>

      {step === 0 && (
        <div className="card space-y-3">
          <h2 className="font-heading text-base font-bold mb-2">Dados do Cliente</h2>
          {[
            { label: 'Nome completo *', key: 'name',  placeholder: 'Ana Lima',          type: 'text'  },
            { label: 'CPF *',           key: 'cpf',   placeholder: '123.456.789-00',    type: 'text'  },
            { label: 'Telefone *',      key: 'phone', placeholder: '(11) 99999-0000',   type: 'text'  },
            { label: 'E-mail',          key: 'email', placeholder: 'cliente@email.com', type: 'email' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-1">{f.label}</label>
              <input className="input-base" type={f.type} placeholder={f.placeholder}
                value={(client as any)[f.key]} onChange={e => setClient({ ...client, [f.key]: e.target.value })} />
            </div>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="card space-y-3">
          <h2 className="font-heading text-base font-bold mb-2">Dados do Veiculo</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Modelo *', key: 'model', placeholder: 'Honda Civic 2022' },
              { label: 'Placa *',  key: 'plate', placeholder: 'ABC-1234'         },
              { label: 'Cor',      key: 'color', placeholder: 'Prata'            },
              { label: 'Km atual', key: 'km',    placeholder: '45000'            },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-1">{f.label}</label>
                <input className="input-base" placeholder={f.placeholder}
                  value={(vehicle as any)[f.key]}
                  onChange={e => setVehicle({ ...vehicle, [f.key]: f.key === 'plate' ? e.target.value.toUpperCase() : e.target.value })} />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-1">Problema relatado *</label>
            <textarea className="input-base" rows={3} placeholder="Descreva o problema..."
              value={vehicle.problem} onChange={e => setVehicle({ ...vehicle, problem: e.target.value })} />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card space-y-4">
          <h2 className="font-heading text-base font-bold">Pecas e Materiais</h2>
          <div>
            <p className="text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-2">Do estoque</p>
            <div className="flex gap-2">
              <select className="input-base flex-1" value={selStock} onChange={e => setSelStock(e.target.value)}>
                <option value="">Selecionar item</option>
                {stock.map(s => <option key={s.id} value={s.id}>{s.name} ({s.qty} {s.unit}) - R$ {s.sale_price}</option>)}
              </select>
              <input className="input-base w-16" type="number" min={1} value={selQty} onChange={e => setSelQty(parseInt(e.target.value)||1)} />
              <button onClick={addStock} className="btn-primary px-3">+</button>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-2">Peca externa</p>
            <div className="flex gap-2">
              <input className="input-base flex-1" placeholder="Nome da peca" value={extName} onChange={e => setExtName(e.target.value)} />
              <input className="input-base w-24" type="number" placeholder="R$" value={extPrice} onChange={e => setExtPrice(e.target.value)} />
              <input className="input-base w-16" type="number" min={1} value={extQty} onChange={e => setExtQty(parseInt(e.target.value)||1)} />
              <button onClick={addExternal} className="btn-primary px-3">+</button>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="flex items-center gap-3 bg-[#18181f] rounded-xl px-4 py-2.5">
                <div className="flex-1">
                  <span className="font-medium text-sm">{it.name}</span>
                  <span className="text-xs text-[#505068] ml-2">x{it.qty}</span>
                </div>
                <span className="text-green-400 font-semibold text-sm">R$ {it.price}</span>
                <button onClick={() => setItems(items.filter((_,j) => j !== i))} className="text-red-400 text-sm">X</button>
              </div>
            ))}
            {!items.length && <p className="text-xs text-[#505068]">Nenhuma peca adicionada</p>}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card space-y-4">
          <h2 className="font-heading text-base font-bold">Orcamento e Pagamento</h2>
          <div className="bg-[#18181f] rounded-xl p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[#9090b0]">Pecas / materiais</span><span>R$ {partsTotal}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#9090b0]">Mao de obra</span>
              <input className="input-base w-28 text-right text-sm py-1.5" type="number" value={labor}
                onChange={e => setLabor(parseFloat(e.target.value)||0)} />
            </div>
            <div className="border-t border-[#252530] pt-3 flex justify-between font-heading font-bold text-xl">
              <span>Total</span><span className="text-green-400">R$ {total}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-3">
              Forma de pagamento *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => setPayment(opt.value)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    payment === opt.value
                      ? 'border-[#ff6b2b] bg-[#ff6b2b]/10 text-[#ff6b2b]'
                      : 'border-[#252530] bg-[#18181f] text-[#9090b0] hover:border-[#353540]'
                  }`}>
                  <span className="text-xl">{opt.icon}</span>
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-1">Observacoes tecnicas</label>
            <textarea className="input-base" rows={2} placeholder="Notas da avaliacao..." value={obs} onChange={e => setObs(e.target.value)} />
          </div>
          <div className="bg-[#ff6b2b]/10 border border-[#ff6b2b]/25 rounded-xl p-3 text-sm text-[#ff6b2b]">
            Apos salvar, o cliente ira assinar digitalmente para autorizar o servico.
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      )}

      <div className="flex gap-3 justify-between mt-5">
        {step > 0
          ? <button onClick={() => { setError(''); setStep(step-1) }} className="btn-ghost">Voltar</button>
          : <button onClick={() => router.push('/os')} className="btn-ghost">Cancelar</button>
        }
        {step < 3 ? (
          <button onClick={() => {
            if (step === 0 && (!client.name || !client.cpf || !client.phone)) { setError('Preencha nome, CPF e telefone.'); return }
            if (step === 1 && (!vehicle.model || !vehicle.plate || !vehicle.problem)) { setError('Preencha modelo, placa e problema.'); return }
            setError(''); setStep(step+1)
          }} className="btn-primary">Proximo</button>
        ) : (
          <button onClick={saveAndSign} disabled={loading} className="btn-primary">
            {loading ? 'Salvando...' : 'Salvar e Assinar'}
          </button>
        )}
      </div>
      {error && step < 3 && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  )
}
