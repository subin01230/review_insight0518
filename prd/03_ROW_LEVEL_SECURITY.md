# 03. Row Level Security — RLS 정책

> 본 문서는 **본 실습의 1순위 학습 목표** 중 하나입니다 (prd/00 §2).
> AGENTS.md §8.3 에 의해 `auth.users` 와 연결되는 모든 테이블은 RLS가 의무화되어 있습니다.

---

## 1. 목적 (Why this exists)

RLS (Row Level Security, 행 단위 접근 제어) 는 **DB 차원에서 "내 행만 보이게"** 강제하는 기능입니다.
앱 레이어에서 `where user_id = ?` 를 깜빡 빠뜨려도 DB가 막아줍니다.

본 실습에서 학생이 만들 `sentiment_logs` 는 사용자별 감정 기록이므로, **다른 사람의 기록이 절대 보여서는 안 됩니다.**

---

## 2. 학습 목표 (What learner achieves)

- 테이블에 RLS를 활성화할 수 있다.
- SELECT / INSERT / UPDATE / DELETE 각각에 대해 정책을 작성할 수 있다.
- `auth.uid()` 가 무엇인지 이해하고 정책에 사용할 수 있다.
- 정책이 제대로 작동하는지 다른 사용자 계정으로 검증할 수 있다.

---

## 3. RLS 활성화 + 정책 4종 (Spec)

### 3.1 활성화
RLS는 기본적으로 꺼져 있습니다. **반드시 명시적으로 켜야** 합니다.
```sql
alter table sentiment_logs enable row level security;
```

> 활성화만 하고 정책을 안 만들면 **아무도 아무것도 못 합니다** (기본 차단). 정책이 있어야 비로소 허용됩니다.

### 3.2 SELECT 정책 — 본인 row만 조회
```sql
create policy "select_own_sentiment_logs"
  on sentiment_logs for select
  using (auth.uid() = user_id);
```

### 3.3 INSERT 정책 — 본인 user_id 로만 삽입
```sql
create policy "insert_own_sentiment_logs"
  on sentiment_logs for insert
  with check (auth.uid() = user_id);
```

### 3.4 UPDATE 정책 — 본인 row만 수정
```sql
create policy "update_own_sentiment_logs"
  on sentiment_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### 3.5 DELETE 정책 — 본인 row만 삭제
```sql
create policy "delete_own_sentiment_logs"
  on sentiment_logs for delete
  using (auth.uid() = user_id);
```

**용어 정리**
- `auth.uid()` : Supabase Auth 가 현재 요청을 보낸 사용자의 UUID 를 반환하는 함수
- `using (조건)` : 조건이 true 인 row만 *볼 수 있음* (SELECT / UPDATE / DELETE)
- `with check (조건)` : 조건이 true 인 row만 *쓸 수 있음* (INSERT / UPDATE)

---

## 4. 통합 마이그레이션 예시

```sql
-- 파일: supabase/migrations/003_enable_rls_on_sentiment_logs.sql
alter table sentiment_logs enable row level security;

-- 파일: supabase/migrations/004_create_policy_select_own.sql
create policy "select_own_sentiment_logs"
  on sentiment_logs for select
  using (auth.uid() = user_id);

-- 파일: supabase/migrations/005_create_policy_insert_own.sql
create policy "insert_own_sentiment_logs"
  on sentiment_logs for insert
  with check (auth.uid() = user_id);

-- 파일: supabase/migrations/006_create_policy_update_own.sql
create policy "update_own_sentiment_logs"
  on sentiment_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 파일: supabase/migrations/007_create_policy_delete_own.sql
create policy "delete_own_sentiment_logs"
  on sentiment_logs for delete
  using (auth.uid() = user_id);
```

**왜 4개 파일로 나누나요?**
AGENTS.md §7.1 의 "한 파일 = 한 변경 의도" 원칙 때문입니다. 각 정책은 독립적으로 추가·삭제될 수 있어야 하므로 파일을 분리합니다.

---

## 5. Antigravity 프롬프트 예시

- "prd/03 을 따라, sentiment_logs 에 RLS를 켜고 SELECT/INSERT/UPDATE/DELETE 정책을 각각 별도 마이그레이션 파일로 작성해 주세요. 번호는 003~007 입니다."
- "RLS 정책이 잘 동작하는지 두 개의 다른 사용자 계정으로 테스트하는 방법을 알려주세요."

---

## 6. 검증 방법 (Verification)

### 6.1 정책 존재 확인
```sql
select policyname, cmd, qual, with_check
  from pg_policies
  where tablename = 'sentiment_logs';
```
4개 정책이 모두 나와야 합니다.

### 6.2 다른 사용자로 격리 확인
1. 사용자 A로 로그인 → row 1개 INSERT
2. 사용자 B로 로그인 → `select count(*) from sentiment_logs;` 결과가 **0** 이어야 함
3. 사용자 B가 사용자 A의 row id를 알고 `delete from sentiment_logs where id = ?` 시도 → 영향 행 0개

### 6.3 service_role 키 검증 (선택)
service_role 키는 RLS를 우회합니다. 백엔드에서 service_role 키를 함부로 쓰면 RLS가 무력화되니, **백엔드도 anon 키 + JWT 위임**을 우선 사용합니다.

---

## 7. Acceptance Criteria

- [ ] `sentiment_logs` 의 RLS 가 활성화되어 있다.
- [ ] 4개 정책(select/insert/update/delete) 이 모두 존재한다.
- [ ] 다른 사용자로 로그인했을 때 본인 row 외 0개 조회된다.
- [ ] 다른 사용자의 row 를 update/delete 시도 시 0개 영향만 발생한다.
- [ ] `pg_policies` 조회 결과가 §6.1 와 일치한다.
