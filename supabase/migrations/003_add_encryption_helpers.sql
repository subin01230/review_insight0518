-- 파일: supabase/migrations/003_add_encryption_helpers.sql
-- 의도: PRD 명세에 따른 암호화/복호화 RPC 함수 정의

-- 1. 암호화 저장 함수 (insert_sentiment_log_encrypted)
create or replace function public.insert_sentiment_log_encrypted(
  p_user_id uuid,
  p_input_text text,
  p_sentiment text,
  p_confidence numeric,
  p_reason text,
  p_enc_key text
)
returns void as $$
begin
  insert into public.sentiment_logs (user_id, input_text_enc, sentiment, confidence, reason_enc)
  values (
    p_user_id,
    pgp_sym_encrypt(p_input_text, p_enc_key),
    p_sentiment,
    p_confidence,
    pgp_sym_encrypt(p_reason, p_enc_key)
  );
end;
$$ language plpgsql security definer set search_path = public, extensions;

-- 2. 복호화 조회 함수 (get_sentiment_history_decrypted)
create or replace function public.get_sentiment_history_decrypted(
  p_enc_key text
)
returns table (
  id uuid,
  sentiment text,
  confidence numeric,
  input_text_dec text,
  reason_dec text,
  created_at timestamp with time zone
) as $$
begin
  return query
  select 
    l.id,
    l.sentiment,
    l.confidence,
    pgp_sym_decrypt(l.input_text_enc, p_enc_key)::text as input_text_dec,
    pgp_sym_decrypt(l.reason_enc, p_enc_key)::text as reason_dec,
    l.created_at
  from public.sentiment_logs l
  where l.user_id = auth.uid()
  order by l.created_at desc;
end;
$$ language plpgsql security definer set search_path = public, extensions;
