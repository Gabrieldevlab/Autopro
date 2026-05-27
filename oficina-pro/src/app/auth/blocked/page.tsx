import Link from 'next/link'

export default function BlockedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#08080f]">
      <div className="bg-[#111118] border border-red-500/20 rounded-2xl p-10 max-w-md w-full text-center">
        <div className="text-5xl mb-4">🚫</div>
        <h1 className="font-heading text-xl font-bold mb-2 text-red-400">Acesso bloqueado</h1>
        <p className="text-sm text-[#9090b0] mb-6">
          Sua oficina foi suspensa temporariamente. Entre em contato com o suporte do OficinaPRO.
        </p>
        <Link href="/auth/login" className="btn-ghost text-sm">
          Voltar ao login
        </Link>
      </div>
    </div>
  )
}
