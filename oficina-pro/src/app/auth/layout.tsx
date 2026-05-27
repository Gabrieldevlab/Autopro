export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#252530 1px,transparent 1px),linear-gradient(90deg,#252530 1px,transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      {/* Orange glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%,rgba(255,107,43,0.07),transparent 70%)' }}
      />
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
