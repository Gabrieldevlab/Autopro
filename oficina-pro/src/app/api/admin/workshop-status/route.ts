import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(new URL('/auth/login', req.url))

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Sem permissao.' }, { status: 403 })
    }

    const formData = await req.formData()
    const id = formData.get('id') as string
    const status = formData.get('status') as string

    const admin = createAdminClient()
    await admin.from('workshops').update({ status }).eq('id', id)

    return NextResponse.redirect(new URL('/admin', req.url))
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
