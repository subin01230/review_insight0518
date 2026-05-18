# 01. Database Design — 데이터베이스 설계

> 본 문서는 **본 실습의 학습 중심**입니다. AGENTS.md §11.2 의 "새 테이블·컬럼 추가" 작업에서 1순위 참조 문서입니다.

---

## 1. 목적 (Why this exists)

본 프로젝트는 사용자가 입력한 감정 텍스트와 AI 분석 결과를 안전하게 저장합니다.
DB 설계는 다음 세 가지를 동시에 만족해야 합니다.

1. **무결성** — 잘못된 값이 들어올 수 없도록 타입·제약조건 강제
2. **소유권** — 모든 row 가 특정 사용자(`auth.users`)에 속함
3. **암호화 가능성** — 민감 컬럼이 `bytea` 형태로 저장될 수 있어야 함

---

## 2. 학습 목표 (What learner achieves)

- PostgreSQL 의 데이터 타입(`uuid`, `text`, `varchar`, `numeric`, `bytea`, `timestamptz`)을 상황에 맞게 선택할 수 있다.
- 외래키와 `ON DELETE` 옵션을 설계할 수 있다.
- 자주 조회되는 컬럼에 인덱스를 적절히 추가할 수 있다.
- 암호화 대상 컬럼을 `bytea` 로 정의해야 한다는 점을 이해한다.

---

## 3. 테이블 스키마 (Spec)

### 3.1 sentiment_logs

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | `uuid` | NOT NULL | — | `auth.users(id)` 외래키 |
| `input_text_enc` | `bytea` | NOT NULL | — | 입력 텍스트의 **암호문** (pgcrypto) |
| `sentiment` | `varchar(10)` | NOT NULL | — | `긍정` / `부정` / `중립` 중 하나 |
| `confidence` | `numeric(5,2)` | NOT NULL | — | 0.00 ~ 100.00 |
| `reason_enc` | `bytea` | NOT NULL | — | OpenAI 분석 이유의 **암호문** |
| `created_at` | `timestamptz` | NOT NULL | `now()` | 생성 시각 |

### 3.2 제약 조건
- `confidence` 는 `CHECK (confidence >= 0 AND confidence <= 100)`
- `sentiment` 는 `CHECK (sentiment IN ('긍정', '부정', '중립'))`
- `user_id` 는 `REFERENCES auth.users(id) ON DELETE CASCADE`

### 3.3 인덱스
- `idx_sentiment_logs_user_created` ON `(user_id, created_at DESC)` — 본인 최근 기록 빠른 조회
- `idx_sentiment_logs_sentiment` ON `(sentiment)` — 감정별 통계용 (선택)

### 3.4 정규화 수준
1NF 수준(원자값만 저장)으로 충분합니다. 학생용 실습이므로 과도한 정규화는 하지 않습니다.

---

## 4. 참고 SQL 예시 (실행 가능)

```sql
-- 본 SQL은 supabase/migrations/001_create_sentiment_logs_table.sql 의 본문 예시입니다.
-- AGENTS.md §7.1 파일명 규칙을 반드시 따릅니다.

-- pgcrypto 확장 활성화 (암호화·UUID 생성에 필요)
create extension if not exists pgcrypto;

-- sentiment_logs 테이블 생성
create table sentiment_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input_text_enc bytea not null,
  sentiment varchar(10) not null check (sentiment in ('긍정', '부정', '중립')),
  confidence numeric(5,2) not null check (confidence >= 0 and confidence <= 100),
  reason_enc bytea not null,
  created_at timestamptz not null default now()
);

-- 본인 최근 기록 조회용 복합 인덱스
create index idx_sentiment_logs_user_created
  on sentiment_logs (user_id, created_at desc);
```

**이 SQL이 하는 일**:
1. `pgcrypto` 확장을 켭니다. 이걸 해야 `pgp_sym_encrypt` 같은 암호화 함수를 쓸 수 있습니다.
2. `sentiment_logs` 테이블을 만들고 `auth.users` 와 연결합니다.
3. 자주 쓸 "내 기록 최근순 조회"를 위해 복합 인덱스를 만듭니다.

---

## 5. Antigravity 프롬프트 예시

- "AGENTS.md §7, prd/01, prd/02 를 읽고, sentiment_logs 테이블을 만드는 첫 마이그레이션 SQL을 `supabase/migrations/001_create_sentiment_logs_table.sql` 로 생성해 주세요. CHECK 제약과 인덱스를 포함하세요."

---

## 6. 검증 방법 (Verification)

1. Supabase Dashboard → Table Editor 에서 `sentiment_logs` 테이블이 생성되어 있는지 확인.
2. `select column_name, data_type, is_nullable from information_schema.columns where table_name = 'sentiment_logs';` 으로 컬럼 타입 확인.
3. `select indexname from pg_indexes where tablename = 'sentiment_logs';` 으로 인덱스 확인.
4. `insert into sentiment_logs (user_id, input_text_enc, sentiment, confidence, reason_enc) values ('<유효uuid>', '\x00', '긍정', 200, '\x00');` 시도 시 CHECK 위반으로 실패해야 함.

---

## 7. Acceptance Criteria

- [ ] `sentiment_logs` 테이블이 위 스키마와 정확히 일치한다.
- [ ] `input_text_enc`, `reason_enc` 가 `bytea` 로 정의되어 있다 (평문 컬럼이 없다).
- [ ] FK가 `auth.users(id) ON DELETE CASCADE` 로 걸려 있다.
- [ ] 복합 인덱스 `(user_id, created_at DESC)` 가 존재한다.
- [ ] `pgcrypto` 확장이 활성화되어 있다.
