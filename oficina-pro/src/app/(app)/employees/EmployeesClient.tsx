'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Employee {
  id: string; name: string; email?: string; job_title?: string
}

const JOB_LABELS: Record<string, string> = {
  mechanic: 'Mecânico',
  painter: 'Funileiro / Pintor',
  receptionist: 'Recepcionista',
}

export default function EmployeesClient({ employees, workshopId }: {
  employees: Employee[]; workshopId: string
}) {
  const supabase = createClient()
  const [items, setItems] = useState<Employee[]>(employees)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', job_title: 'mechanic' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function openAdd() {
    setEditing(null)
    setForm({ name: '', email: '', password: '', job_title: 'mechanic' })
    setError('')
    setModal(true)
  }

  function openEdit(e: Employee) {
    setEditing(e)
    setForm({ name: e.name, email: e.email || '', password: '', job_title: e.job_title || 'mechanic' })
    setError('')
    setModal(true)
  }

  async function save() {
    setError('')
    if (!form.name) { setError('Informe o nome.'); return }
    setLoading(true)

    if (editing) {
      // Editar apenas nome e cargo (email e senha via admin do Supabase)
      const { data } = await supabase
        .from('profiles')
        .update({ name: form.name, job_title: form.job_title })
        .eq('id', editing.id)
        .select()
        .single()
      if (data) setItems(items.map(i => i.id === editing.id ? { ...i, ...data } : i))
    } else {
      if (items.length >= 5) { setError('Limite de 5 funcionários atingido.'); setLoading(false); return }
      if (!form.email || form.password.length < 6) { setError('E-mail e senha (mín. 6 chars) obrigatórios.'); setLoading(false); return }

      // Criar usuário via API Route (usa service_role no server)
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password, job_title: form.job_title, workshop_id: workshopId }),
      })
      const result = await res.json()
      if (!res.ok) { setError(result.error || 'Erro ao criar funcionário.'); setLoading(false); return }
      setItems([...items, result.profile])
    }

    setModal(false)
    setLoading(false)
  }

  async function del(id: string) {
    if (!confirm('Remover funcionário?')) return
    await fetch(`/api/employees?id=${id}`, { method: 'DELETE' })
    setItems(items.filter(i => i.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">Funcionários</h1>
          <p className="text-sm text-[#9090b0] mt-1">{items.length}/5 cadastrados</p>
        </div>
        {items.length < 5
          ? <button onClick={openAdd} className="btn-primary">+ Novo Funcionário</button>
          : <span className="badge-red">Limite de 5 atingido</span>
        }
      </div>

      <div className="grid grid-cols-3 gap-4">
        {items.map(e => (
          <div key={e.id} className="card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-full bg-[#ff6b2b]/20 border border-[#ff6b2b]/30 flex items-center justify-center text-[#ff6b2b] font-bold text-lg flex-shrink-0">
                {e.name[0]}
              </div>
              <div>
                <div className="font-semibold text-sm">{e.name}</div>
                <div className="text-xs text-[#9090b0]">{JOB_LABELS[e.job_title || ''] || e.job_title}</div>
              </div>
            </div>
            {e.email && <div className="text-xs text-[#9090b0] mb-3">✉️ {e.email}</div>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => openEdit(e)} className="btn-yellow text-xs px-2 py-1">✏️ Editar</button>
              <button onClick={() => del(e.id)} className="btn-danger text-xs px-2 py-1">🗑️</button>
            </div>
          </div>
        ))}
        {!items.length && (
          <div className="col-span-3 text-center py-16 text-[#505068]">
            <div className="text-4xl mb-3">👷</div>
            <p>Nenhum funcionário cadastrado</p>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <div className="bg-[#111118] border border-[#252530] rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-bold">{editing ? 'Editar' : 'Novo'} Funcionário</h2>
              <button onClick={() => setModal(false)} className="text-[#9090b0] hover:text-white">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-1">Nome completo *</label>
                <input className="input-base" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="João Silva" />
              </div>
              {!editing && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-1">E-mail *</label>
                    <input className="input-base" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="joao@email.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-1">Senha *</label>
                    <input className="input-base" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-1">Cargo</label>
                <select className="input-base" value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })}>
                  <option value="mechanic">Mecânico</option>
                  <option value="painter">Funileiro / Pintor</option>
                  <option value="receptionist">Recepcionista</option>
                </select>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
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
