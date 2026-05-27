import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OficinaPRO — Gestão de Oficinas',
  description: 'Sistema completo de gestão para oficinas e funilarias',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#08080f] text-[#eeeef8]">
        {children}
      </body>
    </html>
  )
}
