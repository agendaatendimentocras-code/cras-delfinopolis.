# CRAS Delfinópolis — Sistema V2

Sistema de agendamento e gestão do CRAS Delfinópolis, versão 2.0.
Reescrita completa do sistema legado (HTML monolítico de ~10K linhas) para uma aplicação moderna, modular e segura.

## 🏗️ Arquitetura

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18 + TypeScript + Vite 5 |
| Estilo | Tailwind CSS 3.4 + tema CRAS customizado |
| Backend/DB | Supabase (PostgreSQL + Auth + Realtime) |
| Segurança | Row Level Security (RLS) + audit logging |
| PWA | Service Worker + notificações push + offline-first |

## 📋 Funcionalidades

- **Autenticação**: Login via Supabase Auth com perfis `admin` e `atendente`
- **Dashboard**: KPIs em tempo real, atendimentos do dia, alertas
- **Visão Mensal/Anual**: Dashboards agregados por período
- **Atendimentos**: CRUD completo com filtros e busca
- **Agenda/Calendário**: Visualização mensal com navegação por dias
- **Usuários**: Gerenciamento de perfis (admin-only)
- **Profissionais**: Cadastro de profissionais do CRAS
- **Tipos de Atendimento**: Configuração de categorias de serviço
- **Feriados**: Calendário de feriados nacionais/municipais
- **Chat Interno**: Mensagens em tempo real via Supabase Realtime
- **Relatório**: Exportação CSV de atendimentos
- **Configurações**: Preferências do sistema (admin-only)
- **Logs de Auditoria**: Registro automático de todas as ações (admin-only)
- **Notificações**: Browser notifications + service worker
- **PWA**: Instalável, funciona offline com cache inteligente

## 🚀 Setup Rápido

### Pré-requisitos

- **Node.js 18+** (necessário para Vite 5)
- **npm** 8+
- Conta no [Supabase](https://supabase.com)

### 1. Configurar Supabase

1. Crie um projeto no Supabase (ou use o existente)
2. Vá em **SQL Editor** e execute as migrations **em ordem**:
   ```
   supabase/migrations/00001_initial_schema.sql
   supabase/migrations/00002_rls_policies.sql
   supabase/migrations/00003_audit_triggers.sql
   supabase/migrations/00004_seed_data.sql
   ```
3. Copie a **URL** e a **anon key** do projeto (Settings > API)

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env` com suas credenciais:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

Para scripts de migração/admin, adicione também:
```env
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

### 3. Instalar dependências

```bash
npm install
```

### 4. Criar usuário admin

```bash
npx tsx scripts/create-admin.ts
```

Siga as instruções interativas para criar o primeiro admin.

### 5. Iniciar desenvolvimento

```bash
npm run dev
```

Acesse `http://localhost:5173`

### 6. Build para produção

```bash
npm run build
```

Os arquivos otimizados ficam em `dist/`. Faça deploy em qualquer hosting estático (Vercel, Netlify, etc.).

## 📦 Migração de Dados (V1 → V2)

Se você tem dados no sistema antigo (tabelas legacy no Supabase):

```bash
npx tsx scripts/migrate-from-v1.ts
```

O script:
- Lê dados das tabelas legacy (`usuarios`, `profissionais`, `atendimentos`, etc.)
- Transforma para o schema V2
- Insere nas novas tabelas
- Migra contas (`contas` → `profiles` via Auth API)
- **Requer `SUPABASE_SERVICE_ROLE_KEY`** no `.env`

## 🗂️ Estrutura do Projeto

```
cras-v2/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service Worker
│   └── icons/                 # Ícones PWA (192px, 512px)
├── src/
│   ├── components/
│   │   ├── ui/                # Componentes reutilizáveis (Button, Input, Modal, etc.)
│   │   ├── layout/            # AppLayout, Sidebar
│   │   └── shared/            # ProtectedRoute, AdminRoute, ErrorBoundary
│   ├── pages/                 # 14 páginas da aplicação
│   ├── services/              # 11 serviços (auth, CRUD, chat, audit, etc.)
│   ├── stores/                # Zustand stores (auth, ui, sync)
│   ├── hooks/                 # Custom hooks (auth, realtime, debounce)
│   ├── lib/                   # Supabase client, utilitários
│   ├── types/                 # TypeScript types (models, database, auth)
│   ├── App.tsx                # Rotas e providers
│   ├── main.tsx               # Entry point + SW registration
│   └── index.css              # Tailwind + tema CRAS
├── supabase/
│   └── migrations/            # 4 arquivos SQL (schema, RLS, audit, seed)
├── scripts/
│   ├── create-admin.ts        # Criar admin interativo
│   └── migrate-from-v1.ts     # Migração de dados V1→V2
├── .env.example               # Template de variáveis
├── vite.config.ts             # Config Vite com path aliases
├── tailwind.config.js         # Tailwind + tema CRAS
├── tsconfig.app.json          # TypeScript config
└── package.json
```

## 🔐 Segurança

### Row Level Security (RLS)

Todas as tabelas têm RLS habilitado:
- **Admin**: acesso total (leitura, escrita, exclusão)
- **Atendente**: leitura geral + escrita limitada (sem config, audit, profissionais)
- **Anônimo**: sem acesso (bloqueado)

### Função `is_admin()`

```sql
CREATE FUNCTION is_admin() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND perfil = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### Audit Logging

Toda modificação (INSERT/UPDATE/DELETE) nas tabelas principais é registrada automaticamente na tabela `audit_log` via triggers.

## 👥 Perfis de Usuário

| Perfil | Acesso |
|--------|--------|
| **admin** | Acesso total: dashboard, CRUD de todos os módulos, configurações, auditoria, chat |
| **atendente** | Limitado: dashboard, atendimentos, agenda, chat, relatórios. Sem acesso a: configurações, auditoria, gestão de profissionais, tipos de atendimento, feriados |

## 🎨 Tema CRAS

| Cor | Hex | Uso |
|-----|-----|-----|
| Primary | `#1a5276` | Headers, botões principais |
| Accent | `#2980b9` | Links, destaques, focus rings |
| Success | `#27ae60` | Status ativo, confirmações |
| Danger | `#e74c3c` | Ações destrutivas, inativos |
| Warning | `#f39c12` | Alertas, pendências |
| BG | `#f4f6f8` | Fundo da aplicação |

## 📱 PWA

- **Instalável**: Manifest com ícones 192px e 512px
- **Offline**: Service Worker com cache-first para assets e network-first para API
- **Notificações**: Push notifications via Supabase + Service Worker
- **Badge no ícone**: Contador de mensagens não lidas

## 🛠️ Scripts Disponíveis

| Comando | Descrição |
|---------|----------|
| `npm run dev` | Servidor de desenvolvimento (porta 5173) |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build de produção |
| `npx tsc --noEmit` | Verificação de tipos TypeScript |
| `npx tsx scripts/create-admin.ts` | Criar usuário admin |
| `npx tsx scripts/migrate-from-v1.ts` | Migrar dados do V1 |

## ⚠️ Notas Importantes

1. **Node.js 18+ obrigatório** — Vite 5 não funciona em Node 16 ou anterior
2. **Service Role Key** — Necessária apenas para scripts de migração/admin. **Nunca** exponha no frontend
3. **Migrations em ordem** — Execute as 4 migrations SQL sequencialmente
4. **Senha padrão** — Usuários migrados recebem senha `Mudar@123`. Oriente a alteração no primeiro login
5. **RLS** — As policies usam `is_admin()` e `auth.uid()`. Não desative RLS

## 📄 Licença

Projeto interno — CRAS Delfinópolis / Prefeitura Municipal.
