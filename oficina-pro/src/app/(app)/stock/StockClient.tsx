'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface StockItem {
  id: string; name: string; category?: string; unit: string;
  cost_price: number; sale_price: number; qty: number;
}

export default function StockClient({ stock, workshopId, isOwner }: {
  stock: StockItem[]; workshopId: string; isOwner: boolean
}) {
  const supabase = createClient()
  const router = useRouter()
  const [items, setItems] = useState<StockItem[]>(stock)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<StockItem | null>(null)
  const [form, setForm] = useState({ name:'', category:'', unit:'un', cost_price:'', sale_price:'', qty:'' })
  const [loading, setLoading] = useState(false)

  function openAdd() { setEditing(null); setForm({name:'',category:'',unit:'un',cost_price:'',sale_price:'',qty:''}); setModal(true) }
  function openEdit(s: StockItem) {
    if (!isOwner) { alert('Apenas o dono pode editar o estoque.'); return }
    setEditing(s)
    setForm({ name:s.name, category:s.category||'', unit:s.unit, cost_price:String(s.cost_price), sale_price:String(s.sale_price), qty:String(s.qty) })
    setModal(true)
  }

  async function save() {
    if (!form.name || !form.sale_price) return
    setLoading(true)
    const payload = {
      name: form.name, category: form.category, unit: form.unit,
      cost_price: parseFloat(form.cost_price)||0,
      sale_price: parseFloat(form.sale_price)||0,
      qty: parseInt(form.qty)||0,
      workshop_id: workshopId,
    }
    if (editing) {
      const { data } = await supabase.from('stock').update(payload).eq('id', editing.id).select().single()
      if (data) setItems(items.map(i => i.id === editing.id ? data : i))
    } else {
      const { data } = await supabase.from('stock').insert(payload).select().single()
      if (data) setItems([...items, data])
    }
    setModal(false); setLoading(false)
  }

  async function del(id: string) {
    if (!isOwner) { alert('Apenas o dono pode remover itens.'); return }
    if (!confirm('Remover este item?')) return
    await supabase.from('stock').delete().eq('id', id)
    setItems(items.filter(i => i.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">Estoque</h1>
          <p className="text-sm text-[#9090b0] mt-1">{items.length} itens</p>
        </div>
        {isOwner && <button onClick={openAdd} className="btn-primary">+ Adicionar Item</button>}
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th className="table-th">Item</th><th className="table-th">Categoria</th>
              <th className="table-th">Qtd</th><th className="table-th">Un.</th>
              {isOwner && <th className="table-th">Custo</th>}
              <th className="table-th">Venda</th><th className="table-th">Status</th>
              <th className="table-th">Ações</th>
            </tr></thead>
            <tbody>
              {items.map(s => (
                <tr key={s.id} className="hover:bg-[#18181f]">
                  <td className="table-td font-medium">{s.name}</td>
                  <td className="table-td"><span className="badge-gray">{s.category||'—'}</span></td>
                  <td className={`table-td font-bold ${s.qty===0?'text-red-400':s.qty<=3?'text-yellow-400':''}`}>{s.qty}</td>
                  <td className="table-td text-[#9090b0]">{s.unit}</td>
                  {isOwner && <td className="table-td text-[#9090b0]">R$ {s.cost_price}</td>}
                  <td className="table-td text-green-400 font-semibold">R$ {s.sale_price}</td>
                  <td className="table-td">
                    {s.qty===0?<span className="badge-red">Esgotado</span>:s.qty<=3?<span className="badge-yellow">Baixo</span>:<span className="badge-green">Ok</span>}
                  </td>
                  <td className="table-td">
                    <div className="flex gap-2">
                      {isOwner ? (
                        <>
                          <button onClick={() => openEdit(s)} className="btn-yellow text-xs px-2 py-1">✏️ Editar</button>
                          <button onClick={() => del(s.id)} className="btn-danger text-xs px-2 py-1">🗑️</button>
                        </>
                      ) : (
                        <button onClick={() => openEdit(s)} className="btn-primary text-xs px-2 py-1">✏️ Preço venda</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && <tr><td colSpan={8} className="text-center py-12 text-[#505068]">Estoque vazio</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <div className="bg-[#111118] border border-[#252530] rounded-2xl w-full max-w-md p-6" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-bold">{editing ? 'Editar Item' : 'Novo Item'}</h2>
              <button onClick={() => setModal(false)} className="text-[#9090b0] hover:text-white">✕</button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-1">Nome *</label>
                <input className="input-base" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Pastilha de freio" /></div>
              {isOwner && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-1">Categoria</label>
                      <input className="input-base" value={form.category} onChange={e=>setForm({...form,category:e.target.value})} placeholder="Freios..." /></div>
                    <div><label className="block text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-1">Unidade</label>
                      <select className="input-base" value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>
                        {['un','par','litro','lata','m','kg'].map(u=><option key={u} value={u}>{u}</option>)}
                      </select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-1">Custo (compra)</label>
                      <input className="input-base" type="number" value={form.cost_price} onChange={e=>setForm({...form,cost_price:e.target.value})} placeholder="0.00" /></div>
                    <div><label className="block text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-1">Quantidade</label>
                      <input className="input-base" type="number" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})} placeholder="0" /></div>
                  </div>
                </>
              )}
              <div><label className="block text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-1">Preço de venda *</label>
                <input className="input-base" type="number" value={form.sale_price} onChange={e=>setForm({...form,sale_price:e.target.value})} placeholder="0.00" /></div>
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button onClick={() => setModal(false)} className="btn-ghost">Cancelar</button>
              <button onClick={save} disabled={loading} className="btn-primary">{loading ? 'Salvando...' : '✓ Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
