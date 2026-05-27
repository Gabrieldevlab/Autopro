'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) { setError('Informe seu nome completo.'); return }
    if (password.length < 6) { setError('A senha precisa ter pelo menos 6 caracteres.'); return }

    setLoading(true)
    const supabase = createClient()

    // 1. Criar conta no Auth
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name.trim(), role: 'owner' },
      },
    })

    if (signUpError) {
      setError(
        signUpError.message.includes('already registered')
          ? 'Este e-mail já está cadastrado.'
          : signUpError.message
      )
      setLoading(false)
      return
    }

    if (!data.user) {
      setError('Erro inesperado. Tente novamente.')
      setLoading(false)
      return
    }

    // 2. Criar perfil vinculado ao usuário
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      name: name.trim(),
      role: 'owner',
    })

    if (profileError) {
      setError('Erro ao criar perfil: ' + profileError.message)
      setLoading(false)
      return
    }

    // 3. Redirecionar para configurar a oficina
    router.push('/auth/setup')
  }

  return (
    <div className="bg-[#111118] border border-[#252530] rounded-2xl p-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-11 h-11 bg-[#ff6b2b] rounded-xl flex items-center justify-center text-xl">🔧</div>
        <span className="font-heading text-xl font-bold">
          Oficina<span className="text-[#ff6b2b]">PRO</span>
        </span>
      </div>

      <h1 className="font-heading text-xl font-bold mb-1">Criar conta</h1>
      <p className="text-sm text-[#9090b0] mb-6">
        Cadastre-se como dono de oficina. Funcionários são criados por você após configurar a empresa.
      </p>

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-1.5">
            Nome completo
          </label>
          <input
            className="input-base"
            type="text"
            placeholder="Carlos Silva"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#9090b0] uppercase tracking-wider mb-1.5">
            E-mail
          </label>
          <input
            className="input-base"
            type="email"
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
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="new-password"
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
              Criando conta...
            </span>
          ) : 'Criar conta'}
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-[#252530]" />
        <span className="text-xs text-[#505068]">já tem conta?</span>
        <div className="flex-1 h-px bg-[#252530]" />
      </div>

      <Link href="/auth/login" className="btn-ghost w-full justify-center">
        Fazer login
      </Link>
    </div>
  )
}
