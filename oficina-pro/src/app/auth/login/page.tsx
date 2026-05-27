'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()

    // Admin com credenciais fixas — traduz para email real no Supabase Auth
    const loginEmail = email.trim() === 'Adminof'
      ? 'admin@oficinapro.system'
      : email.trim()

    const loginPassword = email.trim() === 'Adminof'
      ? '040511_admin_secret'
      : password

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    })

    if (authError || !data.user) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }

    // Buscar perfil para redirecionar para a tela certa
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, workshop_id')
      .eq('id', data.user.id)
      .single()

    if (!profile) {
      setError('Perfil não encontrado. Contate o suporte.')
      setLoading(false)
      return
    }

    if (profile.role === 'admin') {
      router.push('/admin')
    } else if (profile.role === 'owner' && !profile.workshop_id) {
      router.push('/auth/setup')
    } else if (profile.role === 'employee') {
      router.push('/os')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="bg-[#111118] border border-[#252530] rounded-2xl p-10">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-11 h-11 bg-[#ff6b2b] rounded-xl flex items-center justify-center text-xl">🔧</div>
        <span className="font-heading text-xl font-bold">
          Oficina<span className="text-[#ff6b2b]">PRO</span>
        </span>
      </div>

      <h1 className="font-heading text-xl font-bold mb-1">Bem-vindo de volta</h1>
      <p className="text-sm text-[#9090b0] mb-6">Entre com suas credenciais para acessar o sistema.</p>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-1.5">
            E-mail
          </label>
          <input
            className="input-base"
            type="text"
            placeholder="seu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-1.5">
            Senha
          </label>
          <input
            className="input-base"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
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
              Entrando...
            </span>
          ) : 'Entrar'}
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-[#252530]" />
        <span className="text-xs text-[#505068]">não tem conta?</span>
        <div className="flex-1 h-px bg-[#252530]" />
      </div>

      <Link href="/auth/register" className="btn-ghost w-full justify-center">
        Criar conta de dono de oficina
      </Link>

      <p className="text-xs text-center text-[#505068] mt-5">
        Admin: <strong className="text-[#9090b0]">Adminof</strong> / <strong className="text-[#9090b0]">040511</strong>
      </p>
    </div>
  )
}
