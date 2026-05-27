import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Verifica se o usuário autenticado é dono da oficina
async function verifyOwner(workshopId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, workshop_id')
    .eq('id', user.id)
    .single()

  return profile?.role === 'owner' && profile?.workshop_id === workshopId
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, job_title, workshop_id } = body

    // Validações básicas
    if (!name || !email || !password || !workshop_id) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Senha precisa ter pelo menos 6 caracteres.' }, { status: 400 })
    }

    // Verificar autorização
    const authorized = await verifyOwner(workshop_id)
    if (!authorized) {
      return NextResponse.json({ error: 'Sem permissão para criar funcionários.' }, { status: 403 })
    }

    // Verificar limite de 5 funcionários
    const supabase = createClient()
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('workshop_id', workshop_id)
      .eq('role', 'employee')

    if ((count || 0) >= 5) {
      return NextResponse.json({ error: 'Limite de 5 funcionários por oficina atingido.' }, { status: 400 })
    }

    const admin = createAdminClient()

    // 1. Criar usuário no Auth
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message?.includes('already registered')
          ? 'Este e-mail já está cadastrado.'
          : authError?.message || 'Erro ao criar usuário.' },
        { status: 400 }
      )
    }

    // 2. Criar perfil
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .insert({
        id: authData.user.id,
        name: name.trim(),
        role: 'employee',
        job_title: job_title || 'mechanic',
        workshop_id,
      })
      .select()
      .single()

    if (profileError) {
      // Rollback: deletar usuário criado
      await admin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ profile }, { status: 201 })

  } catch (err: any) {
    console.error('POST /api/employees error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, name, job_title, password, workshop_id } = body

    if (!id || !workshop_id) {
      return NextResponse.json({ error: 'ID e workshop_id obrigatórios.' }, { status: 400 })
    }

    const authorized = await verifyOwner(workshop_id)
    if (!authorized) {
      return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
    }

    const admin = createAdminClient()

    // Atualizar perfil
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .update({ name: name?.trim(), job_title })
      .eq('id', id)
      .select()
      .single()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    // Atualizar senha se informada
    if (password && password.length >= 6) {
      const { error: pwError } = await admin.auth.admin.updateUserById(id, { password })
      if (pwError) {
        return NextResponse.json({ error: 'Perfil atualizado, mas erro ao trocar senha: ' + pwError.message }, { status: 207 })
      }
    }

    return NextResponse.json({ profile })

  } catch (err: any) {
    console.error('PUT /api/employees error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    const workshop_id = req.nextUrl.searchParams.get('workshop_id')

    if (!id || !workshop_id) {
      return NextResponse.json({ error: 'id e workshop_id obrigatórios.' }, { status: 400 })
    }

    const authorized = await verifyOwner(workshop_id)
    if (!authorized) {
      return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
    }

    const admin = createAdminClient()

    // Deletar perfil + usuário Auth
    await admin.from('profiles').delete().eq('id', id)
    await admin.auth.admin.deleteUser(id)

    return NextResponse.json({ ok: true })

  } catch (err: any) {
    console.error('DELETE /api/employees error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
