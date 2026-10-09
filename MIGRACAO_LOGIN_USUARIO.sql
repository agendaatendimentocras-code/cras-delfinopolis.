-- ============================================================
-- Migração: login por USUÁRIO (em vez de e-mail)
-- Rode este script no SQL Editor do Supabase UMA vez.
-- ============================================================
-- O sistema passa a usar o domínio interno 'delf.com'.
-- O usuário digita apenas o nome (ex.: 'admin', 'ayla') e o
-- sistema converte internamente para 'nome@delf.com'.
--
-- O admin atual está como 'admin@cras.delfinopolis'. Esse
-- domínio é rejeitado pelo GoTrue (não tem MX). Vamos migrar
-- o e-mail interno do admin para 'admin@delf.com' para que ele
-- consiga logar digitando apenas 'admin'.
-- ============================================================

-- 1) auth.users
UPDATE auth.users
SET email = 'admin@delf.com'
WHERE email = 'admin@cras.delfinopolis';

-- 2) auth.identities (mantém o identity_data coerente)
UPDATE auth.identities
SET identity_data = jsonb_set(identity_data, '{email}', '"admin@delf.com"')
WHERE identity_data->>'email' = 'admin@cras.delfinopolis';

-- 3) profiles (para exibição correta na tela de Usuários)
UPDATE public.profiles
SET email = 'admin@delf.com'
WHERE email = 'admin@cras.delfinopolis';

-- ============================================================
-- (Opcional) Definir/!redefinir a senha do admin via SQL:
-- UPDATE auth.users
-- SET encrypted_password = crypt('SUA_SENHA_AQUI', gen_salt('bf'))
-- WHERE email = 'admin@delf.com';
-- ============================================================
