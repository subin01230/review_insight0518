-- 파일: supabase/migrations/001_create_profiles_table.sql
-- 의도: 사용자 추가 정보를 저장하기 위한 profiles 테이블 생성 및 pgcrypto 확장 활성화

-- 1. pgcrypto 확장 활성화
create extension if not exists pgcrypto;

-- 2. profiles 테이블 생성
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email_enc bytea not null, -- 암호화된 이메일
  full_name_enc bytea,      -- 암호화된 이름
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. RLS 활성화
alter table public.profiles enable row level security;

-- 4. RLS 정책 설정
create policy "사용자는 본인의 프로필만 조회 가능합니다."
  on public.profiles for select
  using ( auth.uid() = id );

create policy "사용자는 본인의 프로필만 수정 가능합니다."
  on public.profiles for update
  using ( auth.uid() = id );

-- 5. 신규 유저 가입 시 profiles 테이블에 자동 삽입하는 트리거 함수
-- 주의: 트리거에서는 ENCRYPTION_KEY를 알 수 없으므로, 초기에는 빈 값으로 넣거나 
-- 혹은 앱 레이어에서 가입 후 업데이트하는 방식을 권장하지만, 
-- 실습 편의상 초기값은 고정된 시스템 키 또는 더미 데이터를 넣고 나중에 업데이트하도록 설계합니다.
-- 여기서는 일단 트리거를 제거하고 앱 레이어(server)에서 처리하도록 변경하거나 
-- 하드코딩된 'system_init_key'를 임시로 사용합니다. (교육 목적)

create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- 초기 가입 시에는 암호화 없이 저장할 수 없으므로, 
  -- 실제 운영 환경에서는 앱 서버에서 가입 직후 업데이트하거나
  -- DB 수준의 마스터 키를 사용합니다.
  -- 여기서는 일단 트리거를 유지하되, 암호화 함수를 호출합니다.
  insert into public.profiles (id, email_enc, full_name_enc)
  values (
    new.id, 
    pgp_sym_encrypt(new.email, 'system_init_key'), 
    pgp_sym_encrypt(coalesce(new.raw_user_meta_data->>'full_name', ''), 'system_init_key')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public, extensions;

-- 6. 트리거 설정
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
