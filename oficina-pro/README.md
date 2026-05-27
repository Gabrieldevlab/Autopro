# 🔧 OficinaPRO

Sistema completo de gestão para oficinas e funilarias.
**Stack:** Next.js 14 · Supabase (PostgreSQL + Auth + Storage) · Tailwind CSS · Vercel

---

## ⚡ Rodar do zero — passo a passo

### 1. Instalar ferramentas necessárias

Você precisa ter instalado no seu computador:
- **Node.js 18+** → https://nodejs.org (baixe a versão LTS)
- **Git** → https://git-scm.com
- **VS Code** (recomendado) → https://code.visualstudio.com

Verifique se está tudo ok:
```bash
node -v     # deve mostrar v18 ou superior
npm -v      # deve mostrar versão do npm
git -v      # deve mostrar versão do git
```

---

### 2. Criar projeto no Supabase

1. Acesse **https://supabase.com** e crie uma conta (gratuita)
2. Clique em **New project**
3. Preencha:
   - **Name:** `oficina-pro`
   - **Database password:** crie uma senha forte e guarde!
   - **Region:** South America (São Paulo)
4. Aguarde ~1 minuto o projeto inicializar

#### 2a. Pegar as chaves do projeto

1. No menu lateral → **Settings** (engrenagem) → **API**
2. Copie:
   - **Project URL** → `https://xxxxxx.supabase.co`
   - **anon public key** → `eyJhbGci...`
   - **service_role key** → `eyJhbGci...` (⚠️ nunca expor no frontend!)

#### 2b. Executar o SQL do banco

1. No menu lateral → **SQL Editor** → **New query**
2. Abra o arquivo `supabase/schema.sql` deste projeto
3. Cole todo o conteúdo no editor e clique em **Run**

#### 2c. Criar o bucket de logos

Ainda no SQL Editor, execute separadamente:
```sql
insert into storage.buckets (id, name, public) values ('logos', 'logos', true);

create policy "logos_public" on storage.objects
  for select using (bucket_id = 'logos');

create policy "logos_upload" on storage.objects
  for insert with check (bucket_id = 'logos' and auth.uid() is not null);

create policy "logos_update" on storage.objects
  for update using (bucket_id = 'logos' and auth.uid() is not null);
```

#### 2d. Criar o usuário Admin fixo

No SQL Editor:
```sql
-- Cria o usuário admin no Auth do Supabase
select auth.admin_create_user('{
  "email": "admin@oficinapro.system",
  "password": "040511_admin_secret",
  "email_confirm": true
}'::jsonb);
```

Depois pegue o UUID gerado e insira o perfil:
```sql
insert into profiles (id, name, role)
values ('<UUID_DO_ADMIN_AQUI>', 'Super Admin', 'admin');
```

---

### 3. Configurar o projeto local

```bash
# Clone ou extraia a pasta do projeto
cd oficina-pro

# Instale as dependências
npm install

# Crie o arquivo de variáveis de ambiente
cp .env.example .env.local
```

Abra o arquivo `.env.local` e preencha com suas chaves:
```
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...sua_anon_key...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...sua_service_role_key...
```

---

### 4. Rodar o projeto localmente

```bash
npm run dev
```

Acesse **http://localhost:3000** no navegador.

Para testar:
- **Admin:** login `Adminof` / senha `040511`
- **Dono:** crie uma conta em "Criar conta" e configure a oficina
- **Funcionário:** criado pelo dono na aba "Funcionários"

---

### 5. Subir para o GitHub

```bash
# Inicialize o repositório git
git init
git add .
git commit -m "feat: OficinaPRO - versão inicial"

# Crie um repositório no GitHub (https://github.com/new)
# Depois conecte e faça o push:
git remote add origin https://github.com/SEU_USUARIO/oficina-pro.git
git branch -M main
git push -u origin main
```

---

### 6. Deploy na Vercel

1. Acesse **https://vercel.com** e faça login com GitHub
2. Clique em **Add New Project**
3. Selecione o repositório `oficina-pro`
4. A Vercel detecta Next.js automaticamente
5. Em **Environment Variables**, adicione as 3 variáveis:
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   ```
6. Clique em **Deploy**

Pronto! O sistema estará em `https://oficina-pro.vercel.app` (ou similar).

A cada `git push` para `main`, a Vercel faz deploy automático.

---

## 📁 Estrutura do projeto

```
oficina-pro/
├── src/
│   ├── app/
│   │   ├── auth/
│   │   │   ├── login/          # Tela de login
│   │   │   ├── register/       # Criar conta
│   │   │   └── setup/          # Cadastro da oficina (1ª vez)
│   │   ├── (app)/              # Rotas protegidas
│   │   │   ├── dashboard/      # Dashboard financeiro
│   │   │   ├── os/             # Ordens de Serviço
│   │   │   │   ├── new/        # Criar nova OS
│   │   │   │   └── [id]/       # Detalhes da OS
│   │   │   ├── stock/          # Estoque
│   │   │   ├── costs/[type]/   # Custos fixos e aditivos
│   │   │   ├── employees/      # Funcionários
│   │   │   ├── settings/       # Configurações da empresa
│   │   │   └── notifications/  # Notificações
│   │   └── api/
│   │       └── employees/      # API para criar/remover funcionários
│   ├── components/
│   │   └── layout/
│   │       ├── Sidebar.tsx
│   │       └── Topbar.tsx
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts       # Client-side Supabase
│   │       └── server.ts       # Server-side Supabase
│   ├── types/
│   │   └── index.ts            # Tipos TypeScript
│   └── middleware.ts            # Proteção de rotas
├── supabase/
│   └── schema.sql              # SQL completo do banco
├── .env.example                # Exemplo de variáveis de ambiente
├── .gitignore                  # Arquivos ignorados pelo git
├── next.config.js
├── tailwind.config.js
└── package.json
```

---

## 🔐 Perfis e permissões

| Funcionalidade | Admin | Dono | Funcionário |
|---|---|---|---|
| Dashboard financeiro | ✓ (todas oficinas) | ✓ | ✗ |
| Ordens de Serviço | ✗ | ✓ | ✓ |
| Criar/gerenciar OS | ✗ | ✓ | ✓ |
| Imprimir OS (PDF) | ✗ | ✓ | ✗ |
| Registrar entrega | ✗ | ✓ | ✗ |
| Estoque — ver | ✗ | ✓ | ✓ |
| Estoque — editar | ✗ | ✓ | ✗ |
| Custos | ✗ | ✓ | ✗ |
| Funcionários | ✗ | ✓ | ✗ |
| Bloquear oficinas | ✓ | ✗ | ✗ |

---

## 🆘 Problemas comuns

**`Error: supabase URL is required`**
→ Verifique se `.env.local` existe e tem as chaves corretas.

**Login admin não funciona**
→ Execute o SQL do passo 2d para criar o usuário admin no Supabase.

**`npm install` com erro**
→ Certifique-se de ter Node.js 18+: `node -v`

**Imagens de logo não carregam na Vercel**
→ Verifique se o bucket `logos` está público no Supabase Storage.
