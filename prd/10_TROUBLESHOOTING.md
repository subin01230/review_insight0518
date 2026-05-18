# 10. Troubleshooting — 자주 발생하는 오류 한글 해결법

> 본 문서는 실습 중 학생이 가장 자주 마주치는 오류를 모은 **응급 매뉴얼**입니다.
> 오류 메시지를 그대로 검색하기 좋게 영문 메시지와 한글 해설을 함께 표기합니다.

---

## 1. 목적 (Why this exists)

실습 중 막혔을 때 강사를 찾기 전 학생 스스로 1차 해결을 시도할 수 있게 합니다.
또한 AI 에이전트가 동일 오류를 만났을 때 본 문서를 보고 자동 복구를 시도할 수 있습니다 (AGENTS.md §11.2 "오류 발생" 시 참조).

---

## 2. 자주 발생하는 오류 매뉴얼

### 2.1 RLS 관련

#### A. `new row violates row-level security policy for table "sentiment_logs"`
- **상황**: INSERT 가 RLS 정책에 막혔습니다.
- **원인**: `with check (auth.uid() = user_id)` 정책에서 `user_id` 가 현재 로그인 사용자의 UUID 와 다릅니다.
- **해결**:
  1. INSERT 시 `user_id` 컬럼을 명시적으로 채우고 있는지 확인 (`auth.uid()` 또는 `req.user.id`)
  2. 백엔드가 사용자 JWT 를 Supabase 클라이언트에 제대로 전달하고 있는지 확인 (prd/04 §7 참조)

#### B. `SELECT` 결과가 항상 0건
- **상황**: 분명 INSERT 했는데 조회 결과가 비어 있음.
- **원인**: SELECT 정책이 없거나, anon 키만 쓰고 JWT 가 안 실려 있음.
- **해결**:
  1. `select * from pg_policies where tablename = 'sentiment_logs';` 결과에 SELECT 정책이 있는지 확인 (prd/03 §3.2)
  2. 요청 헤더에 `Authorization: Bearer <access_token>` 이 실려 있는지

---

### 2.2 pgcrypto 관련

#### A. `function pgp_sym_encrypt(text, text) does not exist`
- **상황**: 암호화 함수가 없다고 합니다.
- **원인**: `pgcrypto` 확장이 활성화되지 않음.
- **해결**:
  ```sql
  create extension if not exists pgcrypto;
  ```
  마이그레이션 파일로 만들어 두면 다음 `supabase db reset` 시 자동 적용.

#### B. `pgp_sym_decrypt` 결과가 깨진 문자
- **상황**: 복호화는 됐는데 한글이 깨져 나옴.
- **원인**: `bytea` 를 `text` 로 캐스팅할 때 인코딩 미지정.
- **해결**: `pgp_sym_decrypt(col, :key)::text` 처럼 `::text` 명시 (prd/04 §5.2)

---

### 2.3 마이그레이션 관련

#### A. `relation "sentiment_logs" already exists`
- **상황**: 마이그레이션 재실행 시 테이블 이미 존재 에러.
- **해결**:
  - 마이그레이션 작성 시 `create table if not exists` 사용
  - 또는 `supabase db reset` 으로 처음부터 다시 (⚠️ 데이터 삭제됨 — AGENTS.md §9.3)

#### B. 마이그레이션 순서가 꼬임
- **상황**: 002 가 001 전에 실행되어 외래키 에러
- **원인**: 파일명에 3자리 0-padding 이 빠져서 `2_xxx.sql` 가 `10_xxx.sql` 보다 뒤에 정렬됨
- **해결**: AGENTS.md §7.1 의 `<3자리>_<동사>_<대상>.sql` 규칙 준수 (`001`, `002`, ..., `010`)

---

### 2.4 OpenAI 관련

#### A. `401 Incorrect API key provided`
- **원인**: `OPENAI_API_KEY` 환경변수 오타·만료.
- **해결**:
  1. `.env` 의 키를 OpenAI Dashboard 에서 발급한 최신 키로 갱신
  2. 서버 재시작 (`.env` 는 시작 시점에 1회 로드됨)

#### B. JSON 파싱 실패
- **원인**: 모델이 JSON 외 텍스트를 같이 출력함.
- **해결**: `response_format: { type: 'json_object' }` 옵션 사용 + 시스템 프롬프트에 "JSON 외 응답 금지" 명시 (prd/05 §4)

#### C. 응답 너무 느림 (10초 초과)
- **해결**:
  1. Timeout 늘리지 말고 학생에게 다시 시도 안내가 더 안전
  2. 모델을 `gpt-4o-mini` 같은 빠른 모델로 유지

---

### 2.5 환경변수 / 비밀값 관련

#### A. `.env` 가 git 에 커밋되어 버림
- **즉시 조치**:
  1. **모든 비밀 키를 즉시 회전(재발급)** — 이미 노출됐다고 가정 (Supabase, OpenAI 양쪽)
  2. `git rm --cached .env` + `.gitignore` 에 `.env` 추가 후 새 커밋
  3. **단, 기존 커밋 히스토리에서 .env 를 완전 제거하려면 `git filter-repo` 등이 필요** — 이는 AGENTS.md §2 의 파괴적 작업이므로 사용자 확인 필수

#### B. service_role 키가 FE 코드에 포함됨
- **원인**: 빌드 스크립트가 모든 환경변수를 노출.
- **해결**: anon 키만 FE 에 노출, service_role 은 백엔드 환경변수로만 (prd/09 §4)

---

### 2.6 배포 관련

#### A. Vercel 배포 후 `/api/analyze` 가 404
- **원인**: Vercel Serverless Functions 가 `api/` 폴더만 인식. 폴더 구조가 안 맞음.
- **해결**: 백엔드 라우터를 `api/analyze.js` 같은 형태로 배치 또는 `vercel.json` 의 `rewrites` 설정

#### B. CORS 에러
- **원인**: 백엔드가 다른 도메인에 있음.
- **해결**: Vercel 에 백엔드를 함께 배포(prd/09 §3) 또는 백엔드에 `cors()` 미들웨어 추가

---

## 3. 디버깅 체크리스트 (먼저 이걸 다 확인)

문제가 생기면 다음을 차례로 확인합니다.

1. **환경변수 로딩 확인**: `console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'OK' : 'MISSING')`
2. **DB 연결 확인**: `supabase.from('sentiment_logs').select('id').limit(1)` 가 에러 없이 응답
3. **JWT 확인**: 브라우저 개발자도구 Network 탭에서 `Authorization` 헤더가 실려 있는지
4. **RLS 확인**: `select * from pg_policies where tablename = '대상테이블'`
5. **로그 확인**: 백엔드 콘솔에 에러 stack trace 가 찍히는지

---

## 4. Antigravity 프롬프트 예시

- "prd/10 §2.1.A 와 동일한 에러가 나고 있어요. 원인을 추적해서 어디를 수정해야 할지 알려주세요. 코드를 직접 수정하기 전에 원인 분석부터 보여주세요 (AGENTS.md §3)."

---

## 5. Acceptance Criteria

- [ ] 위 매뉴얼이 실제 발생할 수 있는 6대 카테고리(RLS, pgcrypto, 마이그레이션, OpenAI, 환경변수, 배포) 를 모두 다룬다.
- [ ] 각 오류에 영문 메시지(검색용) + 한글 해설이 함께 있다.
- [ ] 학생이 본 문서만 보고 1차 자가 진단이 가능하다.
