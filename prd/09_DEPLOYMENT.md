# 09. Deployment — 배포 가이드

> 본 문서는 실습 결과물을 외부에서 접속 가능한 형태로 배포하는 절차입니다.
> AGENTS.md §11.2 "배포" 작업의 1순위 참조 문서.

---

## 1. 목적 (Why this exists)

학습 결과물이 본인 PC 안에서만 동작하면, 학생이 친구·동료에게 보여줄 수 없습니다.
무료 티어로 배포하되, **환경변수·비밀값이 절대 노출되지 않도록** 분리해서 배포합니다.

---

## 2. 학습 목표 (What learner achieves)

- Vercel 에 정적 프론트엔드를 배포할 수 있다.
- Supabase 프로젝트에 마이그레이션을 적용할 수 있다.
- 환경변수를 코드와 분리해 배포 플랫폼에 등록할 수 있다.
- 배포 후 동작 검증 체크리스트를 수행할 수 있다.

---

## 3. 배포 구성 (Spec)

| 영역 | 호스팅 | 비고 |
|---|---|---|
| Database + Auth | Supabase (cloud) | 무료 티어 |
| Backend (Node.js + Express) | Vercel Serverless Functions | `/api/*` 경로 |
| Frontend (HTML/CSS/JS) | Vercel Static | 같은 도메인 |

> 백엔드를 Vercel Functions 로 같이 배포하면 CORS 설정이 단순해집니다 (동일 도메인).

---

## 4. 환경변수 분리

### 4.1 Supabase 측 (Dashboard → Project Settings)
- `pgcrypto` 키는 사용 안 함. 대신 **앱에서 `ENCRYPTION_KEY` 를 매번 전달**합니다.
- service_role 키는 절대 클라이언트로 보내지 마세요.

### 4.2 Vercel 측 (Project → Settings → Environment Variables)
| 키 | 값 | Scope |
|---|---|---|
| `SUPABASE_URL` | Supabase 프로젝트 URL | Production / Preview |
| `SUPABASE_ANON_KEY` | anon public 키 | Production / Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role 키 (백엔드에서만) | Production / Preview |
| `OPENAI_API_KEY` | OpenAI API 키 | Production / Preview |
| `ENCRYPTION_KEY` | 32바이트 hex 무작위 문자열 | Production / Preview |

### 4.3 프론트엔드에 노출되는 키 (의도적 노출 가능)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

anon 키는 RLS 가 동작하는 상태에서는 공개되어도 안전합니다 (이것이 RLS 학습이 중요한 이유).

---

## 5. 배포 순서

### STEP 1 — Supabase 프로젝트 생성
1. https://supabase.com 로그인 → New project
2. region 선택 (한국에서는 ap-northeast-1, ap-northeast-2 권장)
3. Database password 기록 (절대 공유 금지)

### STEP 2 — 마이그레이션 적용
```bash
# 로컬에서
supabase login
supabase link --project-ref <프로젝트ref>
supabase db push
```

### STEP 3 — Vercel 프로젝트 연결
1. Git 저장소를 Vercel 에 import
2. Framework Preset: **Other** (정적 + serverless)
3. Build Command: 없음 (정적 파일)
4. Output Directory: `client`

### STEP 4 — 환경변수 등록
Vercel 대시보드 → Settings → Environment Variables 에서 §4.2 의 5개 키 등록

### STEP 5 — 배포
```bash
git push
# 또는 Vercel 대시보드의 Deploy 버튼
```

### STEP 6 — 배포 검증
1. 배포된 URL 접속 → 로그인 화면 정상 표시
2. 분석 1회 실행 → 결과 모달 정상
3. Supabase Dashboard 에서 row 생성 확인 (`input_text_enc` 가 평문이 아님)
4. 브라우저 개발자도구 → Network 탭에서 `OPENAI_API_KEY` 가 응답에 노출되지 않는지

---

## 6. 보안 체크리스트 (배포 전 필수)

- [ ] `.env` 가 git 에 커밋되어 있지 않다.
- [ ] `vercel.json` 또는 빌드 산출물에 비밀값이 들어있지 않다.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 가 FE 자바스크립트에 포함되어 있지 않다.
- [ ] 모든 보호된 API 가 401 을 적절히 반환한다.
- [ ] RLS 가 실제로 활성화되어 있다 (Supabase Dashboard 에서 확인).

---

## 7. Antigravity 프롬프트 예시

- "prd/09 STEP 1~6 순서대로 배포를 진행하기 위한 사전 점검 명령들을 알려주세요. 단, 실제 명령은 제가 직접 실행할 테니 실행하지 마세요 (AGENTS.md §9.3)."

---

## 8. 검증 방법 (Verification)

- §5 STEP 6 의 4개 검증을 모두 통과해야 한다.
- 배포된 도메인에서 §8 의 보안 체크리스트도 다시 한 번 통과해야 한다.

---

## 9. Acceptance Criteria

- [ ] 배포된 URL 에서 로그인 → 분석 → 결과 → 히스토리 흐름이 완전히 동작한다.
- [ ] §6 보안 체크리스트 5개 항목 모두 통과
- [ ] Supabase 에 마이그레이션이 모두 적용되어 있다.
- [ ] FE 자바스크립트에 service_role 키·OPENAI 키가 포함되어 있지 않다.
