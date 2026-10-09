# CRAS Delfinópolis V2 — Guia de Instalação

> Sistema de gestão do CRAS Delfinópolis, reescrito em React + TypeScript + Vite + Supabase.

---

## 1. Pré-requisitos

| Requisito | Versão mínima |
|-----------|-------------|
| **Node.js** | 18.x (LTS recomendado) |
| **npm** | 8.x+ (vem com Node 18) |
| **Git** | Qualquer versão recente |
| **Conta Supabase** | Plano gratuito serve |

> ⚠️ Node 16 **não** funciona com Vite 5. Use Node 18+.

---

## 2. Criar o projeto Supabase

1. Acesse [https://supabase.com](https://supabase.com) e crie uma conta (ou faça login).
2. Clique em **New Project**.
3. Preencha:
   - **Name**: `cras-delfinopolis`
   - **Database Password**: anote essa senha!
   - **Region**: escolha a mais próxima (ex: São Paulo)
4. Aguarde o projeto ser provisionado (~2 min).

---

## 3. Configurar o banco de dados

### 3.1 Obter a URL e a chave anon

No painel do Supabase:
1. Vá em **Settings → API**.
2. Copie:
   - **Project URL** → será a `VITE_SUPABASE_URL`
   - **anon public key** → será a `VITE_SUPABASE_ANON_KEY`

### 3.2 Executar as migrations SQL

No painel do Supabase:
1. Vá em **SQL Editor**.
2. Abra cada arquivo da pasta `supabase/migrations/` **na ordem**:
   - `00001_initial_schema.sql` — cria todas as tabelas
   - `00002_rls_policies.sql` — políticas de segurança (RLS)
   - `00003_audit_triggers.sql` — triggers de auditoria
   - `00004_seed_data.sql` — dados iniciais (tipos, feriados, config)
3. Cole o conteúdo no editor e clique em **Run**.
4. Verifique se não há erros. Cada script deve retornar "Success".

> 💡 Execute **um de cada vez**, na ordem. Não pule etapas.
> 💡 As migrations são **idempotentes** — podem ser re-executadas sem erros.

### 3.3 Criar o primeiro usuário admin

> ⚠️ **NÃO** faça `INSERT INTO auth.users` direto no SQL — isso causa o erro
> `users_email_partial_key` quando executado mais de uma vez com o mesmo e-mail.

Escolha **uma** das opções abaixo:

#### Opção A: Pelo Supabase Dashboard (mais simples) ✅

1. No painel do Supabase, vá em **Authentication → Users**.
2. Clique em **Add user → Create new user**.
3. Preencha:
   - **Email**: `admin@cras.delfinopolis` (ou seu e-mail real)
   - **Password**: `Admin@123` (altere depois!)
   - **Auto Confirm User**: ✅ marque esta opção!
4. Clique em **Create user**.
5. O trigger `on_auth_user_created` cria automaticamente o profile.
6. No **SQL Editor**, execute para promover a admin:

```sql
UPDATE public.profiles SET perfil = 'admin'
WHERE email = 'admin@cras.delfinopolis';
```

> 💡 Se quiser usar outro e-mail, substitua no SQL acima.

#### Opção B: Pelo script create-admin.ts

Requer a **Service Role Key** do Supabase:

1. Vá em **Settings → API** e copie a `service_role key`.
2. Adicione ao `.env`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

3. Execute:

```bash
npx tsx scripts/create-admin.ts
```

4. O script detecta se o usuário já existe e **atualiza o profile** em vez de falhar.

> ⚠️ Se o usuário já existe, o script atualiza o perfil para admin automaticamente.

---

## 4. Instalar e rodar o frontend

### 4.1 Descompactar o código-fonte

```bash
unzip cras-v2-source.zip -d cras-v2
cd cras-v2
```

### 4.2 Instalar dependências

```bash
npm install
```

### 4.3 Configurar variáveis de ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Edite `.env` com seus dados do Supabase:

```env
VITE_SUPABASE_URL=https://tizruuquhhpmykkjsupabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_l-COxHSUAoiOf7PMXAb3SQ_ZWZk1v1w
```

> ⚠️ Substitua os valores acima pelos dados **do seu projeto** Supabase.

### 4.4 Rodar em desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:5173](http://localhost:5173) no navegador.

### 4.5 Build de produção

```bash
npm run build
```

Os arquivos prontos para deploy ficam em `dist/`.

---

## 5. Deploy (opcional)

### 5.1 Vercel (recomendado)

1. Faça push do código para um repositório GitHub.
2. No [Vercel](https://vercel.com), clique em **New Project**.
3. Conecte o repositório.
4. Nas variáveis de ambiente, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Clique em **Deploy**.

### 5.2 Netlify

1. No [Netlify](https://netlify.com), clique em **Add new site → Deploy manually**.
2. Arraste a pasta `dist/` para o Netlify.
3. Em **Site settings → Build & deploy → Environment**, configure as variáveis.

### 5.3 Servidor próprio (Nginx)

1. Copie o conteúdo de `dist/` para `/var/www/cras/`.
2. Configure o Nginx com fallback para SPA:

```nginx
server {
    listen 80;
    server_name cras.delfinopolis.mg.gov.br;
    root /var/www/cras;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 6. Usando o dist pronto (sem build)

Se você não quer compilar o código, pode usar o build pronto:

1. Descompacte `cras-v2-dist.zip`.
2. Edite o arquivo `dist/index.html` e substitua os placeholders de URL/key, **ou**
3. Sirva os arquivos estáticos com qualquer servidor web.

> 💡 Os valores do Supabase são embutidos no JS no momento do build.
> Se usar o dist pronto, você precisa rebuildar com suas credenciais.

---

## 7. Primeiro login

1. Acesse a URL do sistema.
2. Entre com o e-mail/senha configurados no passo 3.3.
3. Você verá o Dashboard com KPIs e agenda do dia.
4. No menu lateral, acesse **Usuários** para cadastrar atendentes.
5. Acesse **Cidadãos** para cadastrar beneficiários.

---

## 8. Perfis de acesso

| Funcionalidade | Admin | Atendente |
|---------------|-------|----------|
| Dashboard | ✅ | ✅ |
| Visão Mensal/Anual | ✅ | ✅ |
| Atendimentos | ✅ | ✅ |
| Agenda | ✅ | ✅ |
| Usuários | ✅ | ✅ |
| Cidadãos | ✅ | ✅ |
| Profissionais | ✅ | ❌ |
| Tipos de Atendimento | ✅ | ❌ |
| Feriados | ✅ | ❌ |
| Chat Interno | ✅ | ✅ |
| Relatório | ✅ | ✅ |
| Configurações | ✅ | ❌ |
| Auditoria | ✅ | ❌ |

---

## 9. Estrutura do projeto

```
cras-v2/
├── public/                  # Arquivos estáticos
├── src/
│   ├── components/          # Componentes reutilizáveis
│   │   ├── layout/          # Sidebar, Header, Layout
│   │   └── ui/              # Card, Button, Modal, etc.
│   ├── lib/                 # supabase client, utils
│   ├── pages/               # Páginas da aplicação
│   ├── services/            # Serviços (audit, auth)
│   ├── stores/              # Zustand stores (auth, ui)
│   └── types/               # database.ts
├── supabase/
│   └── migrations/          # Scripts SQL (ordem importa!)
├── .env.example             # Template de variáveis
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 10. Tabelas do banco

| Tabela | Descrição |
|--------|----------|
| `profiles` | Usuários do sistema (admin/atendente) |
| `usuarios` | Cidadãos beneficiários |
| `profissionais` | Profissionais do CRAS |
| `atendimentos` | Atendimentos agendados/realizados |
| `tipos_atendimento` | Tipos de serviço (com cor e duração) |
| `feriados` | Feriados e pontos facultativos |
| `configuracoes` | Configurações gerais do sistema |
| `limites_diarios` | Limite de atendimentos por profissional/dia |
| `audit_logs` | Log de ações do sistema |
| `chat_mensagens` | Mensagens do chat interno |
| `notificacoes` | Notificações dos usuários |

---

## 11. Solução de problemas

### Erro: `users_email_partial_key` (duplicate key)

**Causa**: Tentou criar um usuário no `auth.users` com e-mail que já existe.

**Solução**:
1. Verifique se o usuário já existe em **Authentication → Users**.
2. Se já existe, **não** crie de novo. Apenas atualize o perfil:

```sql
UPDATE public.profiles SET perfil = 'admin'
WHERE email = 'admin@cras.delfinopolis';
```

3. Se precisa redefinir a senha, use **Authentication → Users → ⋯ → Reset password**.

> ⚠️ Nunca faça `INSERT INTO auth.users` direto no SQL. Use sempre o Dashboard
> ou o script `create-admin.ts`.

### Erro: `crypto.getRandomValues is not a function`

→ Node.js antigo. Use Node 18+.

### Erro: `relation "public.profiles" does not exist`

→ As migrations SQL não foram executadas. Volte ao passo 3.2.

### Login não funciona (erro 400)

→ Verifique se `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão corretas no `.env`.

### Tela branca após deploy

→ O servidor não está fazendo fallback para `index.html` (SPA). Configure `try_files` no Nginx ou redirects no Vercel/Netlify.

### RLS bloqueando tudo

→ Você precisa estar logado. O RLS usa `auth.uid()` e `perfil` para controlar acesso.

### Migrations falham ao re-executar

→ As migrations agora são **idempotentes** (podem ser re-executadas). Se ainda houver erro, verifique se não há dados conflitantes e use `ON CONFLICT DO NOTHING` ou `DROP ... IF EXISTS` conforme necessário.

---

## 12. Suporte

Em caso de dúvidas, verifique:
1. Se todas as migrations SQL foram executadas na ordem correta.
2. Se o `.env` tem as variáveis corretas.
3. Se o Node.js é 18+ (`node --version`).
4. Se o projeto Supabase está ativo (não pausado por inatividade).

---

*Sistema desenvolvido para o CRAS Delfinópolis — Assistência Social.*
