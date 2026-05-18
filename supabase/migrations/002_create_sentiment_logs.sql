-- 파일: supabase/migrations/002_create_sentiment_logs.sql
-- 의도: 감정 분석 결과를 PRD 명세에 맞춰 저장하고 암호화 적용

-- 1. sentiment_logs 테이블 생성
create table public.sentiment_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  input_text_enc bytea not null,   -- PRD 명세: input_text_enc (bytea)
  sentiment text not null,         -- 분석 결과 (varchar/text)
  confidence numeric(5,2) not null, -- PRD 명세: numeric
  reason_enc bytea,                -- PRD 명세: reason_enc (bytea)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. RLS 활성화
alter table public.sentiment_logs enable row level security;

-- 3. RLS 정책 설정
create policy "사용자는 본인의 분석 기록만 조회 가능합니다."
  on public.sentiment_logs for select
  using ( auth.uid() = user_id );

create policy "사용자는 본인의 분석 기록만 생성 가능합니다."
  on public.sentiment_logs for insert
  with check ( auth.uid() = user_id );
