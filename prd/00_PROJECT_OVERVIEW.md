# 00. Project Overview — 프로젝트 개요

> 본 문서는 프로젝트가 무엇을 만드는지에 대한 최상위 컨텍스트입니다.
> AI 에이전트는 **`AGENTS.md` 규칙을 우선 준수**한 뒤 본 명세를 따릅니다.

---

## 0. 에이전트 진입 절차 (Onboarding Flow)

AI 에이전트가 본 워크스페이스에서 작업을 시작할 때 **반드시** 다음 순서로 문서를 읽고 진입합니다.

1. **`/AGENTS.md`** — 모든 행동의 기본 규칙. 어떤 작업이든 이 규칙을 먼저 머릿속에 로드합니다.
2. **`/prd/00_PROJECT_OVERVIEW.md`** (본 문서) — 프로젝트가 무엇인지, 어떤 제약이 있는지 파악합니다.
3. **작업 종류에 해당하는 prd 파일** — `AGENTS.md §11.2` 의 "작업별 참조 문서" 표를 보고 해당 번호의 prd 파일을 읽습니다.
4. **연관 prd 파일** (필요 시) — 1·2순위 참조 문서를 추가로 읽습니다.

> 본 절차를 건너뛰면 `AGENTS.md §9.1` "Before You Edit" 체크리스트의 첫 항목을 위반합니다.

---

## 1. 목적 (Why this exists)

본 프로젝트는 코딩 초보 학습자가 **Supabase 기반의 데이터베이스 관리**를 실습할 수 있도록 설계된 교육용 미니 서비스입니다.
표면적인 기능은 "사용자가 입력한 텍스트를 OpenAI로 감성 분석"이지만, **학습의 본체는 다음과 같습니다.**

- 안전한 테이블 설계와 마이그레이션
- Row Level Security (RLS) 정책 작성
- 민감 데이터의 암호화 저장
- DB와 API 레이어 사이의 안전한 데이터 흐름

감성 분석 기능은 "DB에 무엇을 저장하고, 어떻게 안전하게 조회할 것인가"를 가르치기 위한 도메인 껍데기일 뿐입니다.

---

## 2. 학습 목표 (What learner achieves)

본 실습을 끝낸 학생은 다음을 할 수 있게 됩니다. **번호가 낮을수록 학습 우선순위가 높습니다.**

| 우선순위 | 목표 | 학습 영역 |
|---|---|---|
| 1순위 (필수) | `auth.users` 와 연결된 테이블에 RLS 정책을 적용해 본인 데이터만 조회·수정하도록 막을 수 있다. | RLS |
| 1순위 (필수) | 민감한 텍스트 데이터를 `pgcrypto` 로 암호화하여 저장·조회할 수 있다. | 암호화 |
| 2순위 | Supabase에서 새 테이블을 생성하고 마이그레이션 파일로 관리할 수 있다. | 마이그레이션 |
| 3순위 | 외부 API(OpenAI) 응답을 검증하고 DB에 안전하게 저장할 수 있다. | API 안전성 |
| 4순위 | 환경변수 누출 없이 배포할 수 있다. | 배포 |

> 1순위(RLS·암호화)는 본 실습의 **핵심 평가 항목**입니다. 이 두 목표를 달성하지 못한 결과물은 실습 합격이 아닙니다.

---

## 3. 핵심 기능 (Functional Spec)

- 사용자 로그인 (Supabase Auth, 이메일/비밀번호 또는 매직링크)
- 텍스트 입력 → OpenAI 감성 분석 호출
- 분석 결과(긍정/부정/중립, 신뢰도, 이유)를 사용자별로 DB에 저장
- 본인이 과거에 분석한 기록 조회 (RLS로 타인 기록 차단)
- 입력 텍스트는 암호화하여 저장, 조회 시 복호화

---

## 4. 기술 스택 (Tech Stack)

| 레이어 | 기술 | 비고 |
|---|---|---|
| Database | Supabase (PostgreSQL 15+) | 본 실습의 중심 |
| Auth | Supabase Auth | 이메일 기반 |
| AI | OpenAI API (gpt-4o-mini 권장) | 비용 최소화 |
| Backend | Node.js + Express | API 한 개만 노출 |
| Frontend | HTML + CSS + Vanilla JS | 프레임워크 없이 단순화 |
| Deploy | Vercel (FE) + Supabase (DB·Auth) | 환경변수 분리 |
| Encryption | `pgcrypto` 확장 | DB 레벨 암호화 |

---

## 5. 사용자 플로우 (User Flow)

```
[로그인 (Supabase Auth)]
   ↓
[텍스트 입력]
   ↓
[POST /api/analyze]
   ↓
[입력 검증 / sanitize]
   ↓
[OpenAI 호출]
   ↓
[JSON 응답 파싱·검증]
   ↓
[입력 텍스트 암호화 (pgcrypto)]   ←── 1순위 학습 포인트
   ↓
[DB INSERT (RLS 적용 테이블)]      ←── 1순위 학습 포인트
   ↓
[결과 모달 표시 (사용자에게 평문 반환)]
```

조회 시 흐름은 다음과 같습니다.
```
[로그인된 사용자] → [GET /api/history]
   → [RLS로 본인 row만 SELECT]
   → [pgcrypto로 복호화]
   → [응답]
```

> 암호화·복호화 단계를 의도적으로 별도 박스로 분리한 이유는, **데이터가 평문에서 암호문으로 바뀌는 정확한 지점**을 학생이 머릿속에서 그려보도록 하기 위함입니다.

---

## 6. 폴더 구조 (Top-level)

```
edu_with_claude/
├── AGENTS.md                 ← AI 에이전트 규칙 (최상위)
├── prd/                      ← 본 PRD 문서 모음
├── supabase/
│   └── migrations/           ← 모든 SQL 마이그레이션
│       ├── 001_*.sql
│       └── ...
├── server/                   ← Node.js 백엔드
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   └── middleware/
├── client/                   ← 정적 프론트엔드
│   ├── index.html
│   ├── style.css
│   └── app.js
├── .env.example              ← 키 이름만 공유
└── .env                      ← 실제 비밀값 (gitignore)
```

---

## 7. Antigravity 프롬프트 예시 (How to ask the agent)

학생이 Antigravity에게 작업을 시킬 때 사용하기 좋은 프롬프트 예시입니다.

- "AGENTS.md 와 prd/00 을 읽고, 본 프로젝트를 위한 기본 폴더 구조를 만들어 주세요."
- "prd/01 의 스키마를 보고, 첫 번째 마이그레이션 파일을 작성해 주세요. 규칙 7번을 반드시 지켜주세요."

---

## 8. Hard Constraints (절대 변경 금지)

다음 제약은 본 실습의 학습 목표 달성을 위해 **변경 불가**합니다. 에이전트는 이 제약과 충돌하는 사용자 요청을 받으면, 진행 전에 반드시 "이 제약을 변경해도 될까요?"라고 다시 확인합니다.

| 영역 | 제약 | 변경 불가 이유 |
|---|---|---|
| Database | **Supabase (PostgreSQL 15+) 만 사용** | 본 실습이 Supabase 마이그레이션·RLS 학습용 |
| Auth | **Supabase Auth 만 사용** (Firebase·Auth0 금지) | `auth.users` 와의 RLS 연계가 학습 핵심 |
| 암호화 | **`pgcrypto` 확장 우선** (앱 레이어 암호화는 사유 명시 시만 허용) | DB 레벨 암호화 학습 |
| 마이그레이션 위치 | **`supabase/migrations/` 고정** | `AGENTS.md §7.2` 규칙 |
| 마이그레이션 파일명 | **`<3자리>_<동사>_<대상>.sql`** | `AGENTS.md §7.1` 규칙 |
| Backend | **Node.js + Express** | 단순 API 한 개만 필요 |
| Frontend | **HTML + CSS + Vanilla JS** (React/Vue/Svelte 금지) | 학생 인지 부하 최소화. FE는 본체 아님 |
| Deploy | **Vercel (FE) + Supabase (DB·Auth)** | 무료·교육용으로 충분 |

> 본 제약을 어기는 결정은 학습 목표를 흔들 수 있으므로, **AI 에이전트가 임의로 바꾸지 않습니다.**

---

## 9. Acceptance Criteria

다음 기준을 모두 만족하면 본 문서가 충분히 잘 쓰여진 것으로 간주합니다. (학생 자가 검증용 측정 가능 기준)

- [ ] 학생이 본 문서만 읽고도 **2장의 학습 목표 5개를 외부 자료 없이 모두 나열**할 수 있다.
- [ ] 학생이 본 문서를 보고 **§8 Hard Constraints 8개 항목 중 6개 이상을 기억해서 말할 수 있다.**
- [ ] 폴더 구조가 §7장과 일치한다.
- [ ] 기술 스택이 본 명세(§4) 대로 선정되어 있다.
- [ ] §5 사용자 플로우에서 **암호화·복호화가 일어나는 시점**을 학생이 정확히 지목할 수 있다.
- [ ] DB 관리(RLS·암호화·마이그레이션)가 학습의 중심임이 명확히 드러난다.
