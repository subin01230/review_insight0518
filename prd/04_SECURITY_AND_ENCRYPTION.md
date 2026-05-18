# 04. Security and Encryption — 보안 및 암호화

> 본 문서는 **본 실습의 1순위 학습 목표** 중 하나입니다 (prd/00 §2).
> AGENTS.md §8 (강력한 보안 및 암호화) 의 구체 실행 가이드입니다.

---

## 1. 목적 (Why this exists)

학생이 입력하는 텍스트는 본인의 감정·생각이 담긴 **매우 민감한 개인정보**입니다.
DB 가 해킹당하거나 백업 파일이 유출되더라도, 평문이 직접 보이지 않도록 **저장 전 암호화**가 반드시 필요합니다.

본 실습은 다음 두 가지 암호화 패턴을 모두 가르칩니다.
- **단방향 해시** (`bcrypt`) — 비밀번호처럼 복원할 필요가 없는 데이터
- **양방향 암호화** (`pgcrypto` 의 `pgp_sym_*`) — 입력 텍스트처럼 나중에 보여줘야 하는 데이터

---

## 2. 학습 목표 (What learner achieves)

- `pgcrypto` 확장을 활성화할 수 있다.
- `pgp_sym_encrypt` / `pgp_sym_decrypt` 로 양방향 암호화를 수행할 수 있다.
- 암호화 키를 **DB 안에 저장하지 않고** 환경변수로 주입할 수 있다.
- INSERT 시 암호화, SELECT 시 복호화를 자연스럽게 SQL 안에서 처리할 수 있다.

---

## 3. 암호화 방식 매트릭스 (Spec)

| 데이터 | 방식 | 라이브러리 | 컬럼 타입 |
|---|---|---|---|
| 비밀번호 (만약 만든다면) | 단방향 해시 | `bcrypt` (cost 12 이상) | `text` |
| 입력 텍스트 (`input_text`) | 양방향 AES | `pgcrypto.pgp_sym_encrypt` | `bytea` |
| 분석 이유 (`reason`) | 양방향 AES | `pgcrypto.pgp_sym_encrypt` | `bytea` |
| sentiment / confidence | 평문 OK | — | `varchar`, `numeric` |

> **왜 sentiment 는 평문인가요?** 사용자별로 통계 쿼리(예: 본인의 긍정/부정 비율)를 돌릴 수 있어야 하므로, 검색 가능한 평문이 필요합니다. RLS 가 다른 사람의 row 를 못 보게 막아주므로 노출 위험은 통제됩니다.

---

## 4. 마이그레이션 예시 — pgcrypto 활성화

```sql
-- 파일: supabase/migrations/008_enable_pgcrypto.sql
-- 의도: 양방향 암호화에 사용할 pgcrypto 확장 활성화

create extension if not exists pgcrypto;

-- 확인용
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pgcrypto') then
    raise exception 'pgcrypto 확장 활성화 실패';
  end if;
  raise notice 'pgcrypto 확장 활성화 완료';
end $$;
```

---

## 5. 암호화 INSERT / 복호화 SELECT 예시

### 5.1 INSERT (앱 → DB)
```sql
-- 환경변수에서 가져온 키를 앱이 :enc_key 파라미터로 전달한다고 가정
insert into sentiment_logs (
  user_id, input_text_enc, sentiment, confidence, reason_enc
) values (
  auth.uid(),
  pgp_sym_encrypt('오늘 정말 행복했어요', :enc_key),
  '긍정',
  92.50,
  pgp_sym_encrypt('긍정 표현이 명확히 드러남', :enc_key)
);
```

### 5.2 SELECT (DB → 앱)
```sql
select
  id,
  pgp_sym_decrypt(input_text_enc, :enc_key)::text as input_text,
  sentiment,
  confidence,
  pgp_sym_decrypt(reason_enc, :enc_key)::text as reason,
  created_at
from sentiment_logs
order by created_at desc
limit 20;
```

**여기서 일어나는 일**:
1. INSERT 시 `pgp_sym_encrypt(평문, 키)` 가 평문을 암호문(bytea)으로 바꿔서 저장합니다.
2. SELECT 시 `pgp_sym_decrypt(암호문, 키)` 가 거꾸로 복호화합니다.
3. **키(`:enc_key`)는 SQL 에 하드코딩하지 않습니다.** 앱이 환경변수에서 읽어 매번 파라미터로 전달합니다.

---

## 6. 환경변수로 암호화 키 관리

### 6.1 `.env` 파일
```
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...   # ⚠️ 절대 클라이언트에 노출 금지
OPENAI_API_KEY=sk-...
ENCRYPTION_KEY=                          # 32자 이상의 무작위 문자열
```

> **`ENCRYPTION_KEY` 만드는 법** (Node.js 한 줄):
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### 6.2 `.gitignore` 필수
```
.env
.env.local
.env.*.local
```

### 6.3 `.env.example` (공유용)
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
ENCRYPTION_KEY=
```

---

## 7. 백엔드(Node.js)에서 쓰는 패턴

```javascript
// server/services/sentimentRepo.js
// 의도: 암호화된 sentiment_logs 의 INSERT / SELECT 헬퍼

const { createClient } = require('@supabase/supabase-js');

// 환경변수는 process.env 로 안전하게 읽음
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const ENC_KEY = process.env.ENCRYPTION_KEY; // 절대 코드 하드코딩 금지

// 분석 결과 저장 (암호화)
async function insertSentimentLog({ userId, accessToken, inputText, sentiment, confidence, reason }) {
  // 사용자 JWT 를 헤더에 실어 보내면 RLS 가 본인 row만 INSERT 허용
  const { data, error } = await supabase
    .auth.setSession({ access_token: accessToken, refresh_token: '' })
    .then(() => supabase.rpc('insert_sentiment_log_encrypted', {
      p_user_id: userId,
      p_input_text: inputText,
      p_sentiment: sentiment,
      p_confidence: confidence,
      p_reason: reason,
      p_enc_key: ENC_KEY
    }));

  if (error) throw error;
  return data;
}

module.exports = { insertSentimentLog };
```

> 위 코드의 `insert_sentiment_log_encrypted` 는 DB 함수로 분리해두면 SQL 파라미터 바인딩이 더 안전해집니다. 자세한 함수 정의는 별도 마이그레이션으로 작성합니다.

---

## 8. Antigravity 프롬프트 예시

- "prd/04 §5 의 INSERT/SELECT 예시를 Node.js 백엔드 코드로 변환해 주세요. ENCRYPTION_KEY 는 process.env 에서만 읽어야 합니다."
- "pgcrypto 가 켜져 있는지 확인하는 SQL을 한 줄로 알려주세요."

---

## 9. 검증 방법 (Verification)

1. DB Editor 에서 `select input_text_enc from sentiment_logs limit 1;` 했을 때 **평문이 보이지 않고** `\x...` 같은 hex 가 보여야 함.
2. 같은 row를 `select pgp_sym_decrypt(input_text_enc, '잘못된키')::text from sentiment_logs limit 1;` 시도 시 에러 발생.
3. `.env` 파일이 `git status` 결과에 안 나와야 함 (gitignore 가 잘 동작).
4. 코드를 grep 했을 때 `ENCRYPTION_KEY=` 형태의 하드코딩이 단 한 곳도 없어야 함.

---

## 10. Acceptance Criteria

- [ ] `pgcrypto` 확장이 활성화되어 있다.
- [ ] `input_text_enc`, `reason_enc` 컬럼이 평문이 아닌 `bytea` 로 저장되어 있다.
- [ ] 잘못된 키로 복호화 시도 시 에러가 발생한다.
- [ ] `.env` 가 git 에 커밋되어 있지 않다.
- [ ] 모든 비밀값(`OPENAI_API_KEY`, `ENCRYPTION_KEY` 등) 이 코드에 하드코딩되어 있지 않다.
