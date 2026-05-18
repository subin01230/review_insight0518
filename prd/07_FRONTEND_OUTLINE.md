# 07. Frontend Outline — 프론트엔드 개요

> 본 문서는 **의도적으로 짧습니다.**
> DB·RLS·암호화가 본 실습의 중심이며, 프론트엔드는 학습 본체가 아닙니다.
> 학생 인지 부하를 줄이기 위해 HTML/CSS/Vanilla JS만 사용합니다 (prd/00 §8 Hard Constraints).

---

## 1. 목적 (Why this exists)

학생이 만든 백엔드·DB 가 잘 작동하는지 **눈으로 확인할 수 있는 최소 UI**를 제공합니다.
화려한 UX 가 목적이 아닙니다.

---

## 2. 학습 목표 (What learner achieves)

- `fetch` API 로 백엔드와 JWT 인증 통신을 할 수 있다.
- Supabase 클라이언트 라이브러리로 로그인 토큰을 얻을 수 있다.
- 로딩·성공·에러 상태를 분리해 UI 에 반영할 수 있다.

---

## 3. 화면 4개 (Spec)

| 화면 | 파일 | 역할 |
|---|---|---|
| 로그인 | `index.html` 상단 영역 | Supabase Auth UI (이메일 + 비밀번호) |
| 입력 | `index.html` 본문 | textarea + "분석하기" 버튼 |
| 결과 모달 | `index.html` 의 hidden `<dialog>` | sentiment / confidence / reason 표시 |
| 히스토리 | `index.html` 하단 | 본인 분석 기록 최근 20개 |

> 한 페이지(SPA-lite) 안에서 영역을 보여주고 숨기는 방식. 라우터 없음.

---

## 4. 폴더 구조

```
client/
├── index.html      # 모든 마크업
├── style.css       # 디자인 토큰 (간단)
└── app.js          # 모든 JS (Supabase 클라이언트 + fetch + DOM)
```

---

## 5. 상태 관리

전역 상수 + 단순 변수만 사용합니다.
```javascript
const STATE = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
};

let currentState = STATE.IDLE;
let currentUser = null; // Supabase 세션 객체
```

각 상태별로 보일 영역을 CSS class `.is-active` 로 토글합니다.

---

## 6. fetch 호출 예시

```javascript
// 분석 요청 함수
async function requestAnalyze(text) {
  // 현재 세션의 access_token 을 가져옴
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('로그인이 필요합니다.');
  }

  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ text })
  });

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || '분석에 실패했습니다.');
  }
  return json.result;
}
```

**이 함수가 하는 일**:
1. 현재 로그인 세션의 토큰을 꺼냅니다.
2. Authorization 헤더에 실어 백엔드에 요청합니다.
3. 응답이 실패 형식이면 한국어 에러 메시지를 throw 합니다 (UI 에서 catch 해 사용자에게 표시).

---

## 7. 디자인 토큰 (CSS 변수)

```css
:root {
  --color-bg: #FFFFFF;
  --color-fg: #080808;
  --color-border: #D8D8D8;
  --color-accent: #7A3DFF;
  --color-positive: #00D722;
  --color-negative: #FF3D3D;
  --radius-button: 4px;
  --radius-card: 8px;
  --font-body: 16px;
  --font-hero: 48px;
}
```

> 원본 PRD의 80px hero 폰트는 학생 실습 환경에서 너무 크므로 48px로 조정했습니다.

---

## 8. Antigravity 프롬프트 예시

- "prd/07 의 명세를 따라 client/index.html, style.css, app.js 를 작성해 주세요. 화면 4개 모두 한 파일 안에서 표시·숨김으로 처리합니다."

---

## 9. 검증 방법 (Verification)

1. 브라우저에서 로그인 → 텍스트 입력 → "분석하기" 버튼 → 결과 모달 표시 흐름이 끊김 없이 동작
2. 로그아웃 상태에서 "분석하기" 클릭 시 "로그인이 필요합니다" 메시지 표시
3. 네트워크 차단 시 "에러" 상태로 깔끔히 전환

---

## 10. Acceptance Criteria

- [ ] 4개 화면 모두 동작한다.
- [ ] FE 코드에 `OPENAI_API_KEY` 같은 비밀값이 노출되어 있지 않다.
- [ ] React/Vue/Svelte 등 프레임워크가 들어있지 않다.
- [ ] 모든 fetch 호출이 Authorization 헤더를 포함한다.
