'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function SettingsClient({ workshop }: { workshop: any }) {
  const supabase = createClient()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: workshop?.name || '',
    cnpj: workshop?.cnpj || '',
    phone: workshop?.phone || '',
    address: workshop?.address || '',
  })
  const [logo, setLogo] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(workshop?.logo_url || null)
  const [loading, setLoading] = useState(false)

  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setLogo(f)
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target?.result as string)
    reader.readAsDataURL(f)
  }

  async function save() {
    setLoading(true)
    let logo_url = workshop?.logo_url

    if (logo) {
      const ext = logo.name.split('.').pop()
      const path = `${workshop.owner_id}/logo.${ext}`
      await supabase.storage.from('logos').upload(path, logo, { upsert: true })
      const { data } = supabase.storage.from('logos').getPublicUrl(path)
      logo_url = data.publicUrl
    }

    await supabase.from('workshops').update({ ...form, logo_url }).eq('id', workshop.id)
    setEditing(false)
    setLoading(false)
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">Minha Empresa</h1>
          <p className="text-sm text-[#9090b0] mt-1">Dados que aparecem em todos os relatórios e OS</p>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="btn-yellow">✏️ Editar</button>
        )}
      </div>

      <div className="card max-w-xl">
        {/* Logo */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-2">Logo</p>
          {editing ? (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#353540] rounded-xl cursor-pointer hover:border-[#ff6b2b] transition-all relative overflow-hidden bg-[#18181f]">
              {preview
                ? <img src={preview} alt="logo" className="absolute inset-0 w-full h-full object-contain p-2" />
                : <><span className="text-2xl text-[#505068]">📷</span><span className="text-xs text-[#505068] mt-2">Clique para trocar a logo</span></>
              }
              <input type="file" accept="image/*" className="hidden" onChange={handleLogo} />
            </label>
          ) : (
            preview
              ? <img src={preview} alt="logo" className="h-20 object-contain bg-[#18181f] rounded-xl p-2" />
              : <div className="w-20 h-20 bg-[#ff6b2b]/20 rounded-xl flex items-center justify-center text-[#ff6b2b] font-bold text-3xl">{workshop?.name?.[0]}</div>
          )}
        </div>

        {/* Fields */}
        {[
          { label: 'Nome da empresa', key: 'name', placeholder: 'Oficina do Carlos Ltda.' },
          { label: 'CNPJ', key: 'cnpj', placeholder: '00.000.000/0001-00' },
          { label: 'Telefone de atendimento', key: 'phone', placeholder: '(11) 99999-0000' },
          { label: 'Endereço', key: 'address', placeholder: 'Rua das Oficinas, 123' },
        ].map(f => (
          <div key={f.key} className={`flex justify-between items-start py-3 border-b border-[#252530] ${editing ? 'flex-col gap-1' : ''}`}>
            <span className="text-xs font-semibold text-[#9090b0] uppercase tracking-wider">{f.label}</span>
            {editing
              ? <input className="input-base mt-1" value={(form as any)[f.key]} placeholder={f.placeholder}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
              : <span className="text-sm font-medium">{(workshop as any)?.[f.key] || '—'}</span>
            }
          </div>
        ))}

        {editing && (
          <div className="flex gap-3 justify-end mt-5">
            <button onClick={() => { setEditing(false); setPreview(workshop?.logo_url || null) }} className="btn-ghost">Cancelar</button>
            <button onClick={save} disabled={loading} className="btn-primary">
              {loading ? 'Salvando...' : '✓ Salvar alterações'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
