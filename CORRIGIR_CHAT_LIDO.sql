-- ============================================================
-- CORRIGIR CHAT: badge vermelho de mensagem nao lida nao some
-- Rode este arquivo UMA vez no SQL Editor do Supabase.
-- E seguro rodar de novo (idempotente).
-- ============================================================
-- Problema: a regra de seguranca (RLS) so deixava QUEM ENVIOU
-- a mensagem atualiza-la. Marcar como lida e feito por QUEM
-- RECEBE, entao o banco bloqueava e a mensagem continuava
-- "nao lida" -> a bolinha vermelha voltava sempre.
--
-- Solucao: permitir que o DESTINATARIO (e, no chat publico,
-- qualquer pessoa logada) tambem possa marcar como lida.
-- ============================================================

DROP POLICY IF EXISTS "chat_update_recipient" ON public.chat_mensagens;

CREATE POLICY "chat_update_recipient" ON public.chat_mensagens
  FOR UPDATE TO authenticated
  USING (
    destinatario_id = auth.uid()   -- mensagem privada endereçada a mim
    OR destinatario_id IS NULL     -- mensagem do chat publico (grupo)
  )
  WITH CHECK (
    destinatario_id = auth.uid()
    OR destinatario_id IS NULL
  );

-- A regra antiga (chat_update_own) continua valendo para o
-- remetente. As duas regras convivem sem conflito.
