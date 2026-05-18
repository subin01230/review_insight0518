# 08. Test Plan — 테스트 계획

> 본 문서는 DB·RLS·암호화의 **격리 보장**을 검증하는 데 초점을 둡니다.
> 단순 UI 테스트가 아니라 "데이터가 새지 않음" 을 증명하는 것이 목표입니다.

---

## 1. 목적 (Why this exists)

학습 결과가 진짜로 안전한지 확인하려면, 의도적으로 깨뜨려보는 테스트가 필요합니다.
본 문서는 **3개 계층**의 테스트를 정의합니다.

1. 단위 (Unit)
2. 통합 (Integration)
3. 보안·격리 (Security & Isolation) ← 가장 중요

---

## 2. 학습 목표 (What learner achieves)

- 다른 사용자 계정으로 RLS 우회를 시도해보고, 결과가 항상 0건임을 확인할 수 있다.
- 암호화된 컬럼이 평문으로 누출되는지 검증할 수 있다.
- 잘못된 입력(빈 문자열, 매우 긴 텍스트, 특수문자)에 백엔드가 죽지 않는지 확인할 수 있다.

---

## 3. 단위 테스트 (Unit) — server/services

| 대상 | 케이스 | 기대 결과 |
|---|---|---|
| `sanitizeUserText` | 정상 문자열 | 그대로 반환 |
| `sanitizeUserText` | 1001자 입력 | 1000자로 잘림 |
| `sanitizeUserText` | 제어문자 포함 | 제어문자 제거 |
| `validateAnalysisJson` | 정상 JSON | true |
| `validateAnalysisJson` | sentiment 가 "매우 긍정" | false |
| `validateAnalysisJson` | confidence 가 음수 | false |
| `validateAnalysisJson` | reason 누락 | false |

---

## 4. 통합 테스트 (Integration) — API 레벨

```
POST /api/analyze
  ├ 토큰 없음        → 401 UNAUTHORIZED
  ├ 토큰 만료        → 401 UNAUTHORIZED
  ├ text 누락        → 400 INVALID_INPUT
  ├ text 빈 문자열   → 400 INVALID_INPUT
  ├ text 1001자      → 400 INVALID_INPUT
  ├ 정상 호출        → 200, DB 에 row 1개 추가
  └ OpenAI mock 실패 → 422 OPENAI_SCHEMA_ERROR
```

```
GET /api/history
  ├ 토큰 없음 → 401
  ├ limit=101 → 400
  └ 정상 호출 → 200, 본인 데이터만 반환
```

---

## 5. 보안·격리 테스트 (가장 중요)

### 5.1 RLS 격리
**시나리오**:
1. 사용자 A 로 로그인 → POST /api/analyze 로 row 1개 생성
2. 사용자 B 로 로그인 → GET /api/history → **0건** 반환
3. 사용자 B 가 사용자 A 의 row id 를 알아낸 상황 가정 → 직접 Supabase 클라이언트로 `.from('sentiment_logs').delete().eq('id', '<A의 id>')` 시도 → **0건 영향**
4. service_role 키로 같은 쿼리 실행 → 정상 동작 (RLS 우회 확인, **반드시 백엔드 안에서만 사용**)

### 5.2 암호화 격리
**시나리오**:
1. 사용자 A 로 분석 1회 수행
2. Supabase Dashboard 의 SQL Editor 에서 `select input_text_enc from sentiment_logs limit 1;` 실행
3. 결과가 **평문이 아닌 `\x...` hex 문자열** 이어야 함
4. 잘못된 키로 복호화 시도 → 에러 발생

### 5.3 환경변수 노출
1. `git ls-files` 결과에 `.env` 가 없어야 함
2. 빌드된 클라이언트 자바스크립트 안에 `SUPABASE_SERVICE_ROLE_KEY` 가 검색되지 않아야 함

---

## 6. Edge Case 모음

| 입력 | 기대 |
|---|---|
| `text = ""` | 400 |
| `text = "  "` (공백만) | 400 |
| `text = "x".repeat(1000)` | 200 |
| `text = "x".repeat(1001)` | 400 |
| `text` 에 이모지 `😀` | 200 (UTF-8 처리 OK) |
| `text` 에 따옴표 `"` | 200, JSON escape 자동 처리 |
| `text` 가 한국어가 아닌 영어 | 200, 모델이 영어 감정도 분석 가능 |
| OpenAI 응답이 비어있음 | 422 |

---

## 7. 테스트 명령 (예시)

```bash
# 단위 테스트
npm run test:unit

# 통합 테스트 (Supabase 로컬 인스턴스 필요)
supabase start
npm run test:integration

# RLS 격리 시나리오 (직접 작성한 스크립트)
node scripts/test_rls_isolation.js
```

---

## 8. Antigravity 프롬프트 예시

- "prd/08 §5.1 RLS 격리 시나리오를 자동화 스크립트 scripts/test_rls_isolation.js 로 만들어 주세요. 사용자 두 명을 만들고 격리를 확인해야 합니다."

---

## 9. 검증 방법 (Verification)

- [ ] 단위 테스트 모두 통과
- [ ] 통합 테스트 모두 통과
- [ ] RLS 격리 시나리오 3단계 모두 통과
- [ ] 암호화 격리 시나리오 통과
- [ ] git 에 비밀값 누출 없음

---

## 10. Acceptance Criteria

- [ ] 다른 사용자 토큰으로 본인 데이터에 접근 불가능
- [ ] DB 의 암호화 컬럼에 평문 노출 없음
- [ ] 클라이언트 빌드 결과물에 비밀값 노출 없음
- [ ] Edge case 8개 모두 명세대로 동작
