'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SetupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Verificar se já tem oficina configurada
  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('workshop_id')
        .eq('id', user.id)
        .single()
      if (profile?.workshop_id) router.push('/dashboard')
    }
    check()
  }, [])

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('A logo precisa ter menos de 2MB.')
      return
    }
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = ev => setLogoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    setError('')
  }

  function maskCNPJ(v: string) {
    v = v.replace(/\D/g, '').slice(0, 14)
    if (v.length > 12) return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d+)/, '$1.$2.$3/$4-$5')
    if (v.length > 8) return v.replace(/^(\d{2})(\d{3})(\d{3})(\d+)/, '$1.$2.$3/$4')
    if (v.length > 5) return v.replace(/^(\d{2})(\d{3})(\d+)/, '$1.$2.$3')
    if (v.length > 2) return v.replace(/^(\d{2})(\d+)/, '$1.$2')
    return v
  }

  function maskPhone(v: string) {
    v = v.replace(/\D/g, '').slice(0, 11)
    if (v.length > 10) return v.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    if (v.length > 6) return v.replace(/^(\d{2})(\d{4,5})(\d+)/, '($1) $2-$3')
    if (v.length > 2) return v.replace(/^(\d{2})(\d+)/, '($1) $2')
    return v
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) { setError('Informe o nome da empresa.'); return }
    if (!cnpj.trim()) { setError('Informe o CNPJ.'); return }
    if (!phone.trim()) { setError('Informe o telefone de atendimento.'); return }

    setLoading(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    // Upload da logo se existir
    let logo_url: string | null = null
    if (logoFile) {
      const ext = logoFile.name.split('.').pop()
      const filePath = `${user.id}/logo.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, logoFile, { upsert: true, contentType: logoFile.type })

      if (uploadError) {
        console.warn('Upload da logo falhou:', uploadError.message)
        // Não bloquear o cadastro por falha no upload
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('logos')
          .getPublicUrl(filePath)
        logo_url = publicUrl
      }
    }

    // Criar a oficina
    const { data: workshop, error: workshopError } = await supabase
      .from('workshops')
      .insert({
        name: name.trim(),
        cnpj: cnpj.trim(),
        phone: phone.trim(),
        address: address.trim() || null,
        logo_url,
        status: 'active',
        owner_id: user.id,
      })
      .select()
      .single()

    if (workshopError) {
      setError('Erro ao salvar oficina: ' + workshopError.message)
      setLoading(false)
      return
    }

    // Vincular dono ao workshop
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ workshop_id: workshop.id })
      .eq('id', user.id)

    if (profileError) {
      setError('Erro ao vincular perfil: ' + profileError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="bg-[#111118] border border-[#252530] rounded-2xl p-10 max-w-lg w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 bg-[#ff6b2b] rounded-xl flex items-center justify-center text-xl">🔧</div>
        <span className="font-heading text-xl font-bold">
          Oficina<span className="text-[#ff6b2b]">PRO</span>
        </span>
      </div>

      <h1 className="font-heading text-xl font-bold mb-1">Configure sua oficina</h1>
      <p className="text-sm text-[#9090b0] mb-6">
        Essas informações aparecem em todos os relatórios e ordens de serviço gerados.
      </p>

      <form onSubmit={handleSetup} className="space-y-4">
        {/* Logo upload */}
        <div>
          <label className="block text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-1.5">
            Logo / Foto da empresa
          </label>
          <label className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#353540] rounded-xl cursor-pointer hover:border-[#ff6b2b] transition-all bg-[#18181f] overflow-hidden">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="preview logo"
                className="absolute inset-0 w-full h-full object-contain p-3"
              />
            ) : (
              <>
                <span className="text-3xl text-[#505068]">📷</span>
                <span className="text-xs text-[#505068] mt-2">Clique para enviar (PNG ou JPG, máx 2MB)</span>
              </>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={handleLogoChange}
            />
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-1.5">
            Nome da empresa *
          </label>
          <input
            className="input-base"
            type="text"
            placeholder="Oficina do Carlos Ltda."
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-1.5">
              CNPJ *
            </label>
            <input
              className="input-base"
              type="text"
              placeholder="00.000.000/0001-00"
              value={cnpj}
              onChange={e => setCnpj(maskCNPJ(e.target.value))}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-1.5">
              Telefone *
            </label>
            <input
              className="input-base"
              type="text"
              placeholder="(11) 99999-0000"
              value={phone}
              onChange={e => setPhone(maskPhone(e.target.value))}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-1.5">
            Endereço
          </label>
          <input
            className="input-base"
            type="text"
            placeholder="Rua das Oficinas, 123 — São Paulo / SP"
            value={address}
            onChange={e => setAddress(e.target.value)}
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full justify-center py-2.5 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Salvando...
            </span>
          ) : '🏪 Salvar e entrar no sistema'}
        </button>
      </form>
    </div>
  )
}
