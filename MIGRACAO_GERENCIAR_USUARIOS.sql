-- ============================================================
-- Migração: funções de administração de USUÁRIOS
-- Rode este script no SQL Editor do Supabase UMA vez.
-- ============================================================
-- Cria funções SECURITY DEFINER para que um ADMIN consiga, com
-- segurança, a partir da própria aplicação (sem service_role):
--   * trocar a SENHA de qualquer usuário;
--   * trocar o LOGIN (e-mail interno) de qualquer usuário;
--   * EXCLUIR (apagar de vez) um usuário;
--   * ATIVAR / DESATIVAR um usuário.
--
-- Todas as funções verificam se QUEM chama é admin e está ativo.
-- A senha é gravada com bcrypt (pgcrypto / crypt + gen_salt).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Reutiliza a função public.is_admin() já existente (criada nas
-- políticas RLS) para verificar se quem chama é admin ativo.

-- ------------------------------------------------------------
-- 1) Redefinir a senha de um usuário
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
      updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;
END;
$$;

-- ------------------------------------------------------------
-- 2) Alterar o login (e-mail interno) de um usuário
--    p_novo_email já deve vir no formato usuario@delf.com
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_alterar_login(
  p_user_id UUID,
  p_novo_email TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar o login.';
  END IF;
  IF p_novo_email IS NULL OR p_novo_email = '' THEN
    RAISE EXCEPTION 'O login não pode ficar vazio.';
  END IF;

  -- Impede duplicidade de e-mail
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_novo_email AND id <> p_user_id) THEN
    RAISE EXCEPTION 'Já existe um usuário com este login.';
  END IF;

  UPDATE auth.users
  SET email = p_novo_email,
      updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;

  -- Mantém auth.identities coerente
  UPDATE auth.identities
  SET identity_data = jsonb_set(identity_data, '{email}', to_jsonb(p_novo_email))
  WHERE user_id = p_user_id;

  -- Mantém profiles coerente (exibição)
  UPDATE public.profiles
  SET email = p_novo_email
  WHERE id = p_user_id;
END;
$$;

-- ------------------------------------------------------------
-- 3) Ativar / desativar um usuário
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_definir_ativo(
  p_user_id UUID,
  p_ativo BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar o status.';
  END IF;

  UPDATE public.profiles
  SET ativo = p_ativo
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;
END;
$$;

-- ------------------------------------------------------------
-- 4) Excluir (apagar de vez) um usuário
--    Apaga de auth.users; o profile é removido em cascata.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_excluir_usuario(
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem excluir usuários.';
  END IF;
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode excluir o próprio usuário.';
  END IF;

  DELETE FROM auth.users WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;
END;
$$;

-- ------------------------------------------------------------
-- Permissões: usuários autenticados podem chamar (a checagem
-- de admin é feita dentro de cada função).
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.admin_redefinir_senha(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_alterar_login(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_definir_ativo(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_excluir_usuario(UUID) TO authenticated;
