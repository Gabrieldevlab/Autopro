'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Cost {
  id: string; name: string; value: number; month?: string; type: string
}

export default function CostsClient({ costs, workshopId, type, isOwner }: {
  costs: Cost[]; workshopId: string; type: string; isOwner: boolean
}) {
  const supabase = createClient()
  const [items, setItems] = useState<Cost[]>(costs)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Cost | null>(null)
  const [form, setForm] = useState({ name: '', value: '', month: new Date().toISOString().slice(0, 7) })
  const [loading, setLoading] = useState(false)

  const label = type === 'fixed' ? 'Custos Fixos' : 'Custos Aditivos'
  const total = items.reduce((s, c) => s + c.value, 0)

  function openAdd() {
    if (!isOwner) { alert('Apenas o dono pode gerenciar custos.'); return }
    setEditing(null)
    setForm({ name: '', value: '', month: new Date().toISOString().slice(0, 7) })
    setModal(true)
  }

  function openEdit(c: Cost) {
    if (!isOwner) { alert('Apenas o dono pode editar custos.'); return }
    setEditing(c)
    setForm({ name: c.name, value: String(c.value), month: c.month || '' })
    setModal(true)
  }

  async function save() {
    if (!form.name || !form.value) return
    setLoading(true)
    const payload = {
      name: form.name,
      value: parseFloat(form.value),
      month: form.month,
      type,
      workshop_id: workshopId,
    }
    if (editing) {
      const { data } = await supabase.from('costs').update(payload).eq('id', editing.id).select().single()
      if (data) setItems(items.map(i => i.id === editing.id ? data : i))
    } else {
      const { data } = await supabase.from('costs').insert(payload).select().single()
      if (data) setItems([...items, data])
    }
    setModal(false)
    setLoading(false)
  }

  async function del(id: string) {
    if (!isOwner) { alert('Apenas o dono pode remover custos.'); return }
    if (!confirm('Remover este custo?')) return
    await supabase.from('costs').delete().eq('id', id)
    setItems(items.filter(i => i.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">{label}</h1>
          <p className="text-sm text-[#9090b0] mt-1">{type === 'fixed' ? 'Despesas recorrentes mensais' : 'Despesas extras e eventuais'}</p>
        </div>
        {isOwner && <button onClick={openAdd} className="btn-primary">+ Adicionar</button>}
      </div>

      <div className="card mb-4" style={{ maxWidth: 200 }}>
        <p className="text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-1">Total {label}</p>
        <p className="font-heading text-2xl font-bold text-red-400">
          R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      </div>

      <div className="card">
        <table className="w-full">
          <thead><tr>
            <th className="table-th">Descrição</th>
            <th className="table-th">Mês Ref.</th>
            <th className="table-th">Valor</th>
            <th className="table-th">Ações</th>
          </tr></thead>
          <tbody>
            {items.map(c => (
              <tr key={c.id} className="hover:bg-[#18181f]">
                <td className="table-td font-medium">{c.name}</td>
                <td className="table-td"><span className="badge-gray">{c.month || '—'}</span></td>
                <td className="table-td text-red-400 font-semibold">
                  R$ {c.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="table-td">
                  <div className="flex gap-2">
                    {isOwner ? (
                      <>
                        <button onClick={() => openEdit(c)} className="btn-yellow text-xs px-2 py-1">✏️ Editar</button>
                        <button onClick={() => del(c.id)} className="btn-danger text-xs px-2 py-1">🗑️</button>
                      </>
                    ) : (
                      <span className="text-xs text-[#505068]">Sem permissão</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr><td colSpan={4} className="text-center py-12 text-[#505068]">Nenhum custo cadastrado</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <div className="bg-[#111118] border border-[#252530] rounded-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-bold">{editing ? 'Editar' : 'Adicionar'} {label.slice(0, -1)}</h2>
              <button onClick={() => setModal(false)} className="text-[#9090b0] hover:text-white">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-1">Descrição *</label>
                <input className="input-base" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder={type === 'fixed' ? 'Aluguel, energia...' : 'Material extra...'} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-1">Valor R$ *</label>
                <input className="input-base" type="number" value={form.value}
                  onChange={e => setForm({ ...form, value: e.target.value })} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-1">Mês de referência</label>
                <input className="input-base" type="month" value={form.month}
                  onChange={e => setForm({ ...form, month: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button onClick={() => setModal(false)} className="btn-ghost">Cancelar</button>
              <button onClick={save} disabled={loading} className="btn-primary">
                {loading ? 'Salvando...' : '✓ Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
