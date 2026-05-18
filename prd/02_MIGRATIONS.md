# 02. Migrations — 마이그레이션 가이드

> 본 문서는 AGENTS.md §7 (Supabase 쿼리 관리 규칙) 의 **확장 명세**입니다.
> 규칙은 AGENTS.md 에, 사용법·예시는 본 문서에 있습니다.

---

## 1. 목적 (Why this exists)

데이터베이스 스키마는 시간이 지나면 반드시 변합니다.
변경 이력을 SQL 파일로 남기고, 누구든 같은 순서로 실행하면 똑같은 DB 상태가 되도록 강제하는 것이 **마이그레이션 디시플린**입니다.

본 실습에서는 Supabase CLI 를 사용하여 마이그레이션을 관리합니다.

---

## 2. 학습 목표 (What learner achieves)

- 마이그레이션 파일을 **올바른 이름·위치**로 만들 수 있다.
- 한 파일 = 한 변경 의도 원칙을 지킬 수 있다.
- 파괴적 변경에는 롤백 짝꿍 파일을 함께 만든다.
- `supabase db push` / `supabase db reset` 의 차이를 안다.

---

## 3. 파일 명명 규칙 (Spec)

```
<3자리 번호>_<영문 동사>_<snake_case 대상>.sql
```

### 3.1 예시 — 학기 진행 순서대로
```
supabase/migrations/
├── 001_create_sentiment_logs_table.sql
├── 002_add_index_user_created.sql
├── 003_enable_rls_on_sentiment_logs.sql
├── 004_create_policy_select_own.sql
├── 005_create_policy_insert_own.sql
├── 006_create_policy_update_own.sql
├── 007_create_policy_delete_own.sql
├── 008_add_encryption_helpers.sql
└── 009_seed_admin_user.sql
```

### 3.2 허용 동사 목록 (영문 소문자)
- `create`, `add`, `alter`, `enable`, `disable`, `drop`, `rename`, `seed`, `revoke`, `grant`

### 3.3 한 파일 = 한 의도
- ❌ 나쁨: `001_create_table_and_add_index.sql`
- ✅ 좋음: `001_create_table.sql` + `002_add_index.sql`

### 3.4 롤백 짝꿍
파괴적 변경(`drop`, `rename`, 타입 변경)에는 같은 번호의 `_rollback.sql` 을 같이 만듭니다.

```
005_drop_legacy_column.sql
005_drop_legacy_column_rollback.sql
```

---

## 4. 마이그레이션 파일 템플릿 (실행 가능)

```sql
-- 파일: supabase/migrations/002_add_index_user_created.sql
-- 의도: sentiment_logs 에 (user_id, created_at desc) 복합 인덱스 추가
-- 작성일: 2026-05-15
-- 관련: prd/01_DATABASE_DESIGN.md §3.3

-- 인덱스 추가
create index if not exists idx_sentiment_logs_user_created
  on sentiment_logs (user_id, created_at desc);

-- 검증용 출력 (선택)
do $$
begin
  raise notice '인덱스 생성 완료: idx_sentiment_logs_user_created';
end $$;
```

**이 SQL이 하는 일**:
- 본인 기록 최근순 조회를 빠르게 하기 위한 복합 인덱스를 만듭니다.
- `if not exists` 로 멱등성(여러 번 실행해도 결과가 같음)을 확보합니다.

---

## 5. Supabase CLI 자주 쓰는 명령

```bash
# 새 마이그레이션 파일을 자동 번호로 생성 (수동 작성도 가능)
supabase migration new add_index_user_created

# 로컬 DB에 적용
supabase db reset       # 모든 마이그레이션을 처음부터 다시 (개발용)
supabase db push        # 원격 DB(연결된 프로젝트)에 변경분만 적용

# 적용된 마이그레이션 확인
supabase migration list
```

> ⚠️ **`supabase db reset` 은 데이터를 모두 지웁니다.** AGENTS.md §9.3 에 따라 사용자 확인 없이 실행 금지.

---

## 6. Antigravity 프롬프트 예시

- "prd/01 의 sentiment_logs 스키마에 따라, `supabase/migrations/001_create_sentiment_logs_table.sql` 을 작성해 주세요. AGENTS.md §7 명명 규칙을 정확히 지켜야 합니다."
- "방금 만든 마이그레이션에 인덱스 추가 마이그레이션을 002 번호로 이어주세요."

---

## 7. 검증 방법 (Verification)

1. `ls supabase/migrations/` 결과가 번호 순서대로 정렬되는지 (3자리 0-padding 효과)
2. `supabase migration list` 결과에 모든 파일이 보이는지
3. `supabase db reset` 으로 전체 재적용 시 에러 없는지 (=의존 순서 정확)
4. 롤백 파일이 필요한 마이그레이션은 동명의 `_rollback.sql` 이 함께 있는지

---

## 8. Acceptance Criteria

- [ ] 모든 마이그레이션 파일이 `supabase/migrations/` 안에 있다.
- [ ] 파일명이 `<3자리>_<동사>_<대상>.sql` 형식이다.
- [ ] 한 파일 안에 둘 이상의 변경 의도가 섞여 있지 않다.
- [ ] 파괴적 변경 파일에는 `_rollback.sql` 짝꿍이 있다.
- [ ] `supabase db reset` 이 1회로 끝까지 성공한다.
