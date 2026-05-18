# README_TEST.md — Antigravity 호환성 임시 테스트 sandbox

## 이 폴더는 무엇인가요?

본 폴더는 `C:\Users\subin\OneDrive\바탕 화면\edu_with_claude\` 워크스페이스의 **읽기 전용 복사본**입니다.
원본을 건드리지 않으면서 Antigravity 환경에서 AGENTS.md 의 규칙이 정상 작동하는지 시험할 수 있습니다.

---

## 폴더 구조

```
C:\Users\subin\.claude\sandbox\antigravity_test\
├── AGENTS.md                    # 원본 복사본 (수정 금지)
├── prd\
│   ├── 00_PROJECT_OVERVIEW.md   # 원본 복사본
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
├── supabase\
│   └── migrations\
│       └── .gitkeep              # 빈 폴더 유지용
├── TEST_SCENARIOS.md             # Antigravity 에 던질 5개 시나리오
├── EXPECTED_BEHAVIOR.md          # 각 시나리오의 기대 응답
└── README_TEST.md                # 이 파일
```

---

## 사용 절차 (3단계)

### 1. Antigravity 실행
- Antigravity 를 켭니다.
- 메뉴: File → Open Folder → `C:\Users\subin\.claude\sandbox\antigravity_test`
- AGENTS.md 가 자동 로드되었는지 확인 (Antigravity 가 워크스페이스 진입 시 AGENTS.md 를 자동 인식합니다).

### 2. 시나리오 입력
- `TEST_SCENARIOS.md` 를 열어 S1 부터 S5 까지 차례로 채팅창에 입력합니다.
- 각 시나리오 입력 후 Antigravity 의 응답을 그대로 캡처 또는 메모합니다.

### 3. 비교 평가
- `EXPECTED_BEHAVIOR.md` 의 "기대 응답" 과 실제 응답을 비교합니다.
- 각 시나리오의 검증 포인트 체크박스를 채워보세요.
- 5개 시나리오 중 **3개 이상 어긋나면** 강사에게 알려 AGENTS.md 의 다음 개선판을 만듭니다.

---

## 안전 보장

본 sandbox 는 원본을 절대 건드리지 않습니다.
- 원본 위치: `C:\Users\subin\OneDrive\바탕 화면\edu_with_claude\`
- sandbox 위치: `C:\Users\subin\.claude\sandbox\antigravity_test\`

테스트가 끝난 뒤 sandbox 폴더 전체를 통째로 삭제해도 원본에는 영향이 없습니다.

> 만약 Antigravity 가 sandbox 안에서 `supabase/migrations/001_*.sql` 같은 파일을 새로 만들었다면, 그건 **sandbox 안에만** 생긴 것이며 원본 워크스페이스와는 무관합니다.

---

## 자주 묻는 질문

**Q. Antigravity 가 AGENTS.md 를 자동 로드 안 하면?**
→ 첫 채팅에 "AGENTS.md 와 prd/00 을 먼저 읽어봐" 라고 시킨 뒤 시나리오를 진행하세요.

**Q. supabase/migrations/ 폴더가 비어 있는데 괜찮나요?**
→ 네. Antigravity 가 이 폴더에 마이그레이션 파일을 새로 만드는 동작을 시험하기 위해 일부러 비워두었습니다.

**Q. 실제 Supabase 에 연결돼 있어야 하나요?**
→ 아닙니다. 본 테스트는 Antigravity 가 **규칙대로 응답하는지** 만 확인합니다. 실제 DB 실행은 본 sandbox 의 범위 밖입니다.

**Q. 한 시나리오에서 응답이 어긋났는데, 같은 시나리오를 다시 시도해도 되나요?**
→ 다시 시도해도 됩니다. 단, 같은 채팅 세션에서는 컨텍스트가 누적되니, **새 채팅 세션**에서 다시 시도하는 것을 권장합니다.

---

## 결과 보고 양식 (선택)

테스트 결과를 강사에게 공유할 때 다음 표를 사용하면 좋습니다.

| 시나리오 | 응답 한국어? | Self-check 줄? | Plan 먼저? | 사전 확인? | 결과 |
|---|---|---|---|---|---|
| S1 | ✓ / ✗ | ✓ / ✗ | ✓ / ✗ | N/A | 합격 / 불합격 |
| S2 | ✓ / ✗ | ✓ / ✗ | N/A | ✓ / ✗ | 합격 / 불합격 |
| S3 | ✓ / ✗ | ✓ / ✗ | N/A | ✓ / ✗ | 합격 / 불합격 |
| S4 | ✓ / ✗ | ✓ / ✗ | ✓ / ✗ | ✓ / ✗ | 합격 / 불합격 |
| S5 | ✓ / ✗ | ✓ / ✗ | ✓ / ✗ | N/A | 합격 / 불합격 |
