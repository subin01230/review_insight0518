# Antigravity 데이터베이스 실습 워크스페이스

본 폴더는 Antigravity 로 열어서 사용하는 **학생용 실습 워크스페이스**입니다.
Supabase 기반 데이터베이스 관리(마이그레이션·RLS·암호화) 가 학습의 중심입니다.

---

## 첫 진입 — 0번부터 차례로

1. `AGENTS.md` — AI 에이전트가 본 워크스페이스에서 따를 행동 규칙. **모든 작업의 기본**.
2. `prd/00_PROJECT_OVERVIEW.md` — 프로젝트가 무엇인지, 학습 목표 우선순위, Hard Constraints.
3. 그 다음은 작업 종류에 맞는 prd 파일을 보세요 (`AGENTS.md §11.2` 의 매핑 표 참조).

---

## 폴더 구조

```
antigravity_workspace/
├── AGENTS.md                  # 행동 규칙 (필수, 항상 로드)
├── prd/                       # 영역별 명세 11개
│   ├── 00_PROJECT_OVERVIEW.md
│   ├── 01_DATABASE_DESIGN.md
│   ├── 02_MIGRATIONS.md
│   ├── 03_ROW_LEVEL_SECURITY.md
│   ├── 04_SECURITY_AND_ENCRYPTION.md
│   ├── 05_OPENAI_INTEGRATION.md
│   ├── 06_API_SPEC.md
│   ├── 07_FRONTEND_OUTLINE.md
│   ├── 08_TEST_PLAN.md
│   ├── 09_DEPLOYMENT.md
│   └── 10_TROUBLESHOOTING.md
├── supabase/migrations/       # SQL 마이그레이션 (학생이 채워나감)
├── server/                    # Node.js + Express
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   └── middleware/
├── client/                    # HTML + CSS + Vanilla JS
├── _testing/                  # AGENTS.md 지시율 검증용 (학습과 별개)
├── .env.example               # 환경변수 키 이름 (복사하여 .env 로 사용)
└── .gitignore                 # 비밀값 보호
```

---

## 시작하기 (Quick Start)

```text
1) .env.example 을 .env 로 복사하고 키 값을 채웁니다.
   - Supabase: https://supabase.com 에서 프로젝트 만들고 URL·anon·service_role 키 발급
   - OpenAI:  https://platform.openai.com 에서 API 키 발급
   - ENCRYPTION_KEY: 32바이트 hex 무작위 문자열
     예) node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

2) Antigravity 채팅창에 다음을 입력:
   "AGENTS.md 와 prd/00, prd/01, prd/02 를 읽고 첫 마이그레이션을 작성해 주세요."

3) 에이전트가 Plan 을 먼저 보여줍니다. 검토 후 "진행해 주세요" 라고 답합니다.

4) prd/00 §2 의 학습 목표 우선순위대로 단계별 진행:
   1순위: RLS + 암호화
   2순위: 마이그레이션
   3순위: API 안전성
   4순위: 배포
```

---

## 글로벌 룰과의 관계

본 워크스페이스의 `AGENTS.md` 는 **워크스페이스 룰**입니다.
사용자의 글로벌 룰(`%USERPROFILE%\.gemini\GEMINI.md`) 이 있다면 그것도 Antigravity 에 자동 로드되며, 두 룰은 합쳐서 적용됩니다.
규칙이 충돌하면 본 워크스페이스 `AGENTS.md` 의 §0 (우선순위) 에 따라 처리됩니다.

---

## 워크스페이스 검증 (선택)

`_testing/` 폴더에는 본 AGENTS.md 가 Antigravity 에서 제대로 작동하는지 확인하기 위한 5개 시나리오가 있습니다.
실습 전에 한 번 돌려보면 에이전트의 응답 품질을 미리 체크할 수 있습니다.
- `_testing/README_TEST.md` 참고

---

## 안전 약속

- 본 워크스페이스는 학생이 자유롭게 작업할 수 있는 **격리 공간**입니다.
- `C:\Users\subin\.claude\` 같은 다른 도구의 로컬 경로에는 접근하지 않습니다.
- 모든 마이그레이션은 `supabase/migrations/` 폴더 안에만 만들어집니다 (AGENTS.md §7.2).
- 민감 데이터는 `pgcrypto` 로 암호화한 뒤 저장합니다 (AGENTS.md §8, prd/04).
