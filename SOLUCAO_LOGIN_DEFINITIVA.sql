-- ============================================================
-- SOLUÇÃO DEFINITIVA DO LOGIN — rode este arquivo UMA vez
-- no SQL Editor do Supabase. É seguro rodar de novo (idempotente).
-- ============================================================
-- O que este script faz:
--   1. Cria a função admin_criar_usuario (cria contas JÁ
--      CONFIRMADas — usada por TODAS as telas do sistema).
--   2. Recria admin_redefinir_senha (troca senha E confirma).
--   3. CONFIRMA todos os usuários @delf.com que ficaram presos.
--   4. Garante a identidade de e-mail de quem não tinha.
--   5. Mostra um diagnóstico final de todas as contas.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- 1) admin_criar_usuario: cria usuário JÁ CONFIRMADO
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_criar_usuario(
  p_email    TEXT,
  p_senha    TEXT,
  p_nome     TEXT,
  p_perfil   TEXT DEFAULT 'atendente',
  p_cpf      TEXT DEFAULT '',
  p_telefone TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID := gen_random_uuid();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem criar usuários.';
  END IF;
  IF p_email IS NULL OR p_email = '' THEN
    RAISE EXCEPTION 'O login (e-mail) não pode ficar vazio.';
  END IF;
  IF p_senha IS NULL OR length(p_senha) < 6 THEN
    RAISE EXCEPTION 'A senha deve ter pelo menos 6 caracteres.';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = lower(p_email)) THEN
    RAISE EXCEPTION 'Já existe um usuário com este login.';
  END IF;

  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    -- Campos de controle do GoTrue: precisam ser STRING VAZIA (não NULL),
    -- senão o login retorna erro 500 ("Database error querying schema").
    confirmation_token, recovery_token, email_change,
    email_change_token_new, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token
  )
  VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    lower(p_email),
    crypt(p_senha, gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object(
      'nome', p_nome,
      'perfil', p_perfil,
      'cpf', COALESCE(p_cpf, ''),
      'telefone', COALESCE(p_telefone, '')
    ),
    now(), now(),
    '', '', '', '', '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, provider, identity_data,
    last_sign_in_at, created_at, updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_user_id,
    v_user_id::text,
    'email',
    jsonb_build_object('sub', v_user_id::text, 'email', lower(p_email), 'email_verified', true),
    now(), now(), now()
  );

  UPDATE public.profiles
  SET telefone = NULLIF(p_telefone, ''),
      cpf      = NULLIF(p_cpf, '')
  WHERE id = v_user_id;

  RETURN v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_criar_usuario(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ------------------------------------------------------------
-- 2) admin_redefinir_senha: troca a senha E confirma a conta
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_redefinir_senha(
  p_user_id UUID,
  p_nova_senha TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem redefinir senhas.';
  END IF;
  IF p_nova_senha IS NULL OR length(p_nova_senha) < 6 THEN
    RAISE EXCEPTION 'A senha deve ter pelo menos 6 caracteres.';
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(p_nova_senha, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_redefinir_senha(UUID, TEXT) TO authenticated;

-- ------------------------------------------------------------
-- 3) CONFIRMA todos os usuários @delf.com presos E conserta os
--    campos de controle NULOS que quebram o login (erro 500).
-- ------------------------------------------------------------
UPDATE auth.users
SET email_confirmed_at          = COALESCE(email_confirmed_at, now()),
    confirmation_token          = COALESCE(confirmation_token, ''),
    recovery_token              = COALESCE(recovery_token, ''),
    email_change                = COALESCE(email_change, ''),
    email_change_token_new      = COALESCE(email_change_token_new, ''),
    email_change_token_current  = COALESCE(email_change_token_current, ''),
    phone_change                = COALESCE(phone_change, ''),
    phone_change_token          = COALESCE(phone_change_token, ''),
    reauthentication_token      = COALESCE(reauthentication_token, ''),
    updated_at                  = now()
WHERE email LIKE '%@delf.com';

-- ------------------------------------------------------------
-- 4) Garante identidade de e-mail para quem não tem
-- ------------------------------------------------------------
INSERT INTO auth.identities (
  id, user_id, provider_id, provider, identity_data,
  last_sign_in_at, created_at, updated_at
)
SELECT
  gen_random_uuid(), u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  now(), now(), now()
FROM auth.users u
WHERE u.email LIKE '%@delf.com'
  AND NOT EXISTS (
    SELECT 1 FROM auth.identities i
    WHERE i.user_id = u.id AND i.provider = 'email'
  );

-- ------------------------------------------------------------
-- 5) DIAGNÓSTICO FINAL (confira que todos estão OK)
-- ------------------------------------------------------------
SELECT
  u.email,
  (u.email_confirmed_at IS NOT NULL) AS confirmado,
  (u.encrypted_password IS NOT NULL AND u.encrypted_password <> '') AS tem_senha,
  (i.id IS NOT NULL) AS tem_identidade,
  p.perfil,
  p.ativo
FROM auth.users u
LEFT JOIN auth.identities i ON i.user_id = u.id AND i.provider = 'email'
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email LIKE '%@delf.com'
ORDER BY u.email;

-- (OPCIONAL) Forçar uma senha conhecida numa conta específica:
-- UPDATE auth.users
-- SET encrypted_password = crypt('senha123', gen_salt('bf')),
--     email_confirmed_at = now(), updated_at = now()
-- WHERE email = 'adamsrosa@delf.com';
