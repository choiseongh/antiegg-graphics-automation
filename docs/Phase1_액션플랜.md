# 정기그래픽 자동화 액션플랜 v2

> **목표**: Ghost CMS → Claude 텍스트 처리 → Talk to Figma MCP로 카드뉴스 완성까지 자동화  
> **기대 효과**: 수작업 2~3시간 → 스크립트 실행 + 검수 15분  
> **작성일**: 2026-03-14  
> **최종 수정**: 2026-03-15 (Phase 0 진행 상황 반영)

---

## 아키텍처 변경 요약

### AS-IS (v1 — XLSX + Buzz)

```
Ghost API → Python 서문 추출 → Claude 분할 → XLSX 생성 → Buzz 플러그인 → 수동 이미지 배치 → 수동 export
                                                          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
                                                          수동 작업 다수, 이미지 자동화 불가
```

### TO-BE (v2 — Talk to Figma MCP)

```
Ghost API → Python 서문 추출 → Claude 분할/제목 2줄 → JSON 생성
    → Claude Code + Talk to Figma MCP로 Figma 직접 조작:
        텍스트 삽입 + 이미지 URL fill + 컴포넌트 복제 + PNG export
                                                          ~~~~~~
                                                          Figma 열기만 하면 나머지 자동
```

### 핵심 변경점

| 항목 | v1 (XLSX + Buzz) | v2 (Talk to Figma MCP) |
|---|---|---|
| 중간 파일 | XLSX 필수 | 불필요 (JSON만) |
| 이미지 삽입 | ❌ 수동 | ✅ URL → 자동 fill |
| Figma 조작 | Buzz 플러그인 수동 실행 | Claude Code가 MCP로 직접 조작 |
| export | 수동 | ✅ 자동 가능 |
| 수동 개입 | XLSX 업로드 + Buzz 실행 + 이미지 배치 + export | Figma 열기 + 플러그인 연결 (1회) |

---

## 기존 자산 (v1에서 이어받는 것)

| 항목 | 상태 | 비고 |
|---|---|---|
| Ghost API 연동 | ✅ 완료 | `fetch_posts_by_slugs()`, `fetch_recent_posts()` |
| `extract_intro()` | ✅ 완료 | h2/h3/h4/hr 종료 마커 처리 |
| Claude API 서문 분할 | ✅ 완료 | `claude-3-haiku-20240307`, 10개 아티클 테스트 통과 |
| `SPLIT_PROMPT` | ✅ 완료 | 231호 실데이터 기반 규칙 |
| `.env` / API 키 설정 | ✅ 완료 | |
| GitHub 레포 | ✅ 완료 | `choiseongh/antiegg-graphics-automation` (로컬: `repo/` 폴더에 클론됨) |

---

## Phase 0. 사전 검증 (MCP 환경)

> 여기서 막히면 v1(XLSX) 방식으로 fallback.

| # | 태스크 | 누가 | 예상 시간 | 상태 |
|---|---|---|---|---|
| 0-1 | **Bun 런타임 설치** | Claude | 2분 | ✅ 완료 (v1.3.10 이미 설치됨) |
| 0-2 | **Talk to Figma MCP 서버 설치** — `bunx cursor-talk-to-figma-mcp@latest` 방식 채택 (npx → bunx 전환) | Claude | 5분 | ✅ 완료 (.mcp.json 설정 완료) |
| 0-3 | **WebSocket 릴레이 서버 기동 테스트** (`bun socket` → `ws://localhost:3055` 정상 연결 확인) | Claude | 3분 | ✅ 완료 (port 3055 리스닝 + Figma 연결 확인) |
| 0-4 | **Figma 플러그인 설치** (Figma Community에서 Cursor MCP Plugin 설치 또는 로컬 로드) | 본인 | 5분 | ✅ 완료 (설치 + 실행 중) |
| 0-5 | **채널 연결 테스트** (Figma 플러그인에서 채널 join → MCP 서버에서 `get_document_info` 호출 → 응답 확인) | 본인+Claude | 5분 | 🔴 실패 — 아래 참고 |
| 0-6 | **기본 명령어 테스트** — 텍스트 레이어 수정 (`set_text_content`) | Claude | 3분 | ⬜ (0-5 해결 후) |
| 0-7 | **이미지 fill 테스트** — 이미지 URL로 레이어에 이미지 적용 (`set_image_fill`) | Claude | 5분 | ⬜ (0-5 해결 후) |
| 0-8 | **export 테스트** — 프레임을 PNG로 내보내기 (`export_node_as_image`) | Claude | 3분 | ⬜ (0-5 해결 후) |

### 0-5 채널 연결 실패 상세 (2026-03-15)

```
증상: join_channel("m5hvqfox") 호출 시 "Failed to verify connection" 에러
환경:
  - WebSocket 릴레이: 정상 (port 3055, bun PID 32672 리스닝)
  - Figma ↔ 릴레이: 연결됨 (ESTABLISHED)
  - MCP 서버 ↔ 릴레이: 연결됨 (bun PID 33433 + node PID 33455)
  - 플러그인 UI: "Connected" 표시
  - TalkToFigma, ClaudeTalkToFigma 두 MCP 서버 모두 동일 에러

추정 원인:
  1. 플러그인이 실제로 해당 채널에 join하지 않았을 수 있음
  2. .mcp.json 변경 후 MCP 서버 재시작 필요 (Claude Code 재시작)
  3. 채널명 불일치 가능성

다음 시도:
  - Figma 플러그인에서 채널을 새로 생성하거나 재연결
  - Claude Code 세션 재시작 후 새 채널명으로 join_channel 재시도
```

### 판단 분기점

```
0-5 실패 (WebSocket 연결 안 됨) → Bun/네트워크 문제 디버깅. 해결 안 되면 v1 fallback
0-6 실패 (텍스트 수정 안 됨) → 플러그인 권한/노드ID 문제. 디버깅
0-7 실패 (이미지 fill 안 됨) → arinspunk fork 문제. 이미지만 수동, 나머지 MCP 유지
0-8 실패 (export 안 됨)     → export만 수동 (Figma에서 직접 export). 나머지 MCP 유지
```

---

## Phase 1. 환경 세팅

| # | 태스크 | 상태 |
|---|---|---|
| 1-1 | **Python 환경** — anthropic, requests, beautifulsoup4, python-dotenv | ✅ 완료 |
| 1-2 | **.env 파일** — `ANTHROPIC_API_KEY` 설정 | ✅ 완료 |
| 1-3 | **Bun 런타임 설치** — `curl -fsSL https://bun.sh/install \| bash` | ✅ 완료 (v1.3.10) |
| 1-4 | **Talk to Figma MCP 설치** — ~~git clone~~ `bunx cursor-talk-to-figma-mcp@latest` 방식 채택 | ✅ 완료 |
| 1-5 | **MCP 설정 파일** — `.mcp.json`에 TalkToFigma 서버 등록 | ✅ 완료 |
| 1-6 | **Figma 플러그인** — Cursor MCP Plugin 설치 | ✅ 완료 |

### MCP 설정 예시

```json
{
  "mcpServers": {
    "TalkToFigma": {
      "command": "bunx",
      "args": ["cursor-talk-to-figma-mcp@latest"]
    }
  }
}
```

---

## Phase 2. 데이터 수집 + 텍스트 처리 (Python)

> Ghost API + Claude API 부분. 기존 코드 대부분 재사용.

| # | 태스크 | 의존성 | 상태 |
|---|---|---|---|
| 2-1 | **Ghost API 호출** | — | ✅ 구현됨 |
| 2-2 | **`extract_intro()` 서문 추출** | — | ✅ 구현됨 |
| 2-3 | **Claude 서문 분할** | — | ✅ 구현됨 |
| 2-4 | **Claude 제목/부제목 2줄 생성 추가** — `SPLIT_PROMPT`에 제목 2줄 + 부제목 2줄 생성 통합 | 2-3 | ⬜ |
| 2-5 | **응답 파서 확장** — 서문 분할 + 제목_2줄 + 부제목_2줄 JSON 파싱 | 2-4 | ⬜ |
| 2-6 | **JSON 출력** — 아티클별 데이터를 MCP에서 사용할 JSON 형식으로 출력 | 2-5 | ⬜ |
| 2-7 | **`load_dotenv()` 추가** | — | ⬜ |
| 2-8 | **과도하게 긴 서문 처리** — 1500자+ 산문형 아티클 글자수 제한 또는 fallback | — | ⬜ (중기) |

### JSON 출력 형식 (예시)

```json
[
  {
    "no": 1,
    "content_type": "큐레이션",
    "title": "멈춘 자리에서 피어난 통찰",
    "title_2line": "멈춘 자리에서\n피어난 통찰",
    "subtitle": "안규철, 에마 미첼, 존 버거처럼 관찰하기",
    "subtitle_2line": "안규철, 에마 미첼,\n존 버거처럼 관찰하기",
    "editor": "김보경",
    "intro_pages": [
      "첫 번째 페이지 텍스트...",
      "두 번째 페이지 텍스트...",
      "세 번째 페이지 텍스트..."
    ],
    "feature_image": "https://square.antiegg.kr/content/images/..."
  }
]
```

### 제목/부제목 2줄 규칙 (확정)

```
• 서문 분할과 동일 API 호출에서 함께 생성
• 줄바꿈 기준: 의미 단위 경계 (조사 뒤, 절 경계, 수식어/명사구 경계)
• Claude에게 맡기는 방식 (규칙 기반 X)
```

---

## Phase 3. Figma 템플릿 준비

> MCP가 조작할 Figma 템플릿의 레이어 구조를 파악하고 정리.  
> **이 단계는 본인이 Figma에서 직접 해야 할 부분이 많음.**

| # | 태스크 | 누가 | 상태 |
|---|---|---|---|
| 3-1 | **카드뉴스 템플릿 구조 파악** — 현재 Figma 파일에서 큐레이션/그레이/브랜디드 각 유형의 컴포넌트 구조 확인 | 본인+Claude | ⬜ |
| 3-2 | **레이어 네이밍 규칙 확정** — MCP가 찾을 수 있도록 레이어 이름 통일 (예: `title`, `subtitle`, `body_1`, `hero_image` 등) | 본인 | ⬜ |
| 3-3 | **마스터 컴포넌트 정리** — MCP로 복제할 기준 컴포넌트 확정. 각 페이지 유형(표지, 서문1, 서문2, 서문3 등)별 컴포넌트 | 본인 | ⬜ |
| 3-4 | **노드 ID 수집** — `scan_text_nodes`와 `get_node_info`로 텍스트/이미지 레이어의 노드 ID 매핑 | Claude (MCP) | ⬜ |

### 레이어 네이밍 예시

```
카드뉴스 — 큐레이션
├── cover (표지 프레임)
│   ├── title          ← 제목 (2줄 버전)
│   ├── subtitle       ← 부제목 (2줄 버전)
│   ├── editor_name    ← 에디터명
│   └── hero_image     ← 대표 이미지 (Rectangle, image fill 대상)
├── page_1 (서문 1페이지)
│   └── body           ← 서문 텍스트
├── page_2 (서문 2페이지)
│   └── body
└── page_3 (서문 3페이지, 있으면)
    └── body
```

---

## Phase 4. MCP 파이프라인 구축

> Python JSON 출력 → Claude Code가 MCP로 Figma 조작.

| # | 태스크 | 의존성 | 상태 |
|---|---|---|---|
| 4-1 | **워크플로우 스크립트 작성** — Python JSON을 읽고 MCP 명령 순서를 정의하는 실행 흐름 | Phase 2, 3 | ⬜ |
| 4-2 | **컴포넌트 복제 자동화** — 아티클 수만큼 마스터 컴포넌트를 `clone_node` / `create_component_instance`로 복제 | 3-3 | ⬜ |
| 4-3 | **텍스트 일괄 삽입** — `set_multiple_text_contents`로 제목/부제목/서문 텍스트 주입 | 3-2, 3-4 | ⬜ |
| 4-4 | **이미지 fill 자동화** — `set_image_fill`로 대표이미지 URL → hero_image 레이어에 적용 | 3-2 | ⬜ |
| 4-5 | **PNG export 자동화** — `export_node_as_image`로 각 카드 프레임을 PNG로 추출 → 파일 저장 | 4-3, 4-4 | ⬜ |
| 4-6 | **에러 핸들링** — 이미지 fetch 실패, 텍스트 overflow, 노드 못 찾음 등 예외 처리 | 4-1~4-5 | ⬜ |

### MCP 명령 실행 순서

```
1. get_document_info()           — Figma 파일 연결 확인
2. get_local_components()        — 마스터 컴포넌트 ID 확보
3. FOR each article:
   a. clone_node(masterComponentId)  — 카드 세트 복제
   b. set_text_content(titleNodeId, title_2line)
   c. set_text_content(subtitleNodeId, subtitle_2line)
   d. set_text_content(editorNodeId, editor)
   e. set_text_content(body1NodeId, intro_pages[0])
   f. set_text_content(body2NodeId, intro_pages[1])
   g. set_text_content(body3NodeId, intro_pages[2])  — 3장일 때만
   h. set_image_fill(heroImageNodeId, feature_image, "url")
4. FOR each completed frame:
   a. export_node_as_image(frameId, "PNG", 2)  — scale 2x
   b. base64 → 파일 저장
```

---

## Phase 5. 통합 테스트

| # | 태스크 | 의존성 | 상태 |
|---|---|---|---|
| 5-1 | **단일 아티클 테스트** — 1개 아티클로 전체 파이프라인 실행 (Ghost → Claude → JSON → MCP → Figma → PNG) | Phase 4 | ⬜ |
| 5-2 | **231호 전체 테스트** — 10~11개 아티클 일괄 처리. 기존 231호 이미지와 결과 비교 | 5-1 | ⬜ |
| 5-3 | **품질 검수** — 텍스트 위치/크기, 이미지 크롭, 줄바꿈 등 시각적 확인 | 5-2 | ⬜ |
| 5-4 | **에지케이스 확인** — 서문 2장 vs 3장, 긴 제목, 브랜디드 유형, 이미지 없는 아티클 | 5-2 | ⬜ |
| 5-5 | **실전 투입** — 다음 호에 실제 적용. 기존 방식과 병행 비교 | 5-1~5-4 | ⬜ |

---

## 남은 태스크 우선순위

### 즉시 (Phase 0~1)

| # | 태스크 | 상태 |
|---|---|---|
| A-1 | Bun 설치 + Talk to Figma MCP 설치 | ✅ 완료 |
| A-2 | Figma 플러그인 설치 + 채널 연결 테스트 | 🔴 채널 연결 실패 — 재시도 필요 |
| A-3 | 기본 명령어 테스트 (텍스트, 이미지, export) | ⬜ A-2 해결 후 |

### 단기 (Phase 2~4)

| # | 태스크 |
|---|---|
| B-1 | Claude 프롬프트에 제목/부제목 2줄 생성 통합 |
| B-2 | Python 스크립트 → JSON 출력 형식으로 리팩토링 |
| B-3 | Figma 템플릿 레이어 네이밍 정리 |
| B-4 | MCP 파이프라인 구축 (복제 → 텍스트 → 이미지 → export) |

### 중기

| # | 태스크 |
|---|---|
| C-1 | 과도하게 긴 서문 처리 (1500자+ fallback) |
| C-2 | 서문 분할 품질 고도화 (프롬프트 튜닝) |
| C-3 | Notion API 연동 (URL + 콘텐츠 유형 자동 수집) |
| C-4 | 뉴스레터 미리보기 자동화 |

---

## 의존성 맵

```
[Phase 0: MCP 환경 검증]
  0-1~0-3 서버 설치/기동    ← Claude가 처리
  0-4~0-5 플러그인 설치/연결 ← 본인이 Figma에서
  0-6~0-8 명령어 테스트      ← 함께

[Phase 1: 환경 세팅]  ✅ 전부 완료 (Python + Bun + MCP + 플러그인)

[Phase 2: 데이터 수집 + 텍스트]
  2-1~2-3 ✅ 완료
  2-4~2-6 제목 2줄 + JSON 출력 추가 필요  ← Phase 0 통과 후

[Phase 3: Figma 템플릿]  ← Phase 0 통과 후
  3-1~3-2 본인이 Figma에서 레이어 정리
  3-3~3-4 Claude가 MCP로 노드 ID 수집

[Phase 4: MCP 파이프라인]  ← Phase 2 + 3 완료 후
  4-1~4-6 Claude가 구축

[Phase 5: 통합 테스트]  ← Phase 4 완료 후
```

---

## 본인이 직접 해야 할 일

| # | 할 일 | 이유 |
|---|---|---|
| 1 | ~~Figma에서 MCP 플러그인 설치~~ + **채널 재연결** | 플러그인 설치 완료, 채널 연결만 남음 |
| 2 | 카드뉴스 템플릿 레이어 이름 정리 | 디자인 구조 판단 필요 |
| 3 | 마스터 컴포넌트 확정 | 어떤 컴포넌트를 복제할지 본인 결정 |
| 4 | 품질 검수 (텍스트 위치, 이미지 크롭, 줄바꿈) | 시각적 판단 |
| 5 | 실전 투입 결정 | 본인 판단 |

**나머지** (Bun 설치, MCP 설정, 스크립트 수정, 파이프라인 구축, export) → Claude가 처리

---

## 기술 스택 (v2)

| 구성 요소 | 기술 | 비용 |
|---|---|---|
| 데이터 수집 | Ghost Content API | 무료 |
| 서문 추출 | BeautifulSoup4 | 무료 |
| 텍스트 처리 | Claude 3 Haiku API | 월 ~$0.20 |
| Figma 조작 | Talk to Figma MCP (`bunx cursor-talk-to-figma-mcp`) | 무료 |
| 런타임 | Bun (WebSocket relay) | 무료 |
| 버전 관리 | GitHub | 무료 |
| **월 총비용** | | **~$0.20** |

---

## 프로젝트 경로

```
로컬: ~/Desktop/Database/1. 진행/정기그래픽-자동화/
MCP 레포: ~/Desktop/Database/1. 진행/claude-talk-to-figma-mcp/  (참고용, 직접 사용 X — bunx로 실행)
GitHub: https://github.com/choiseongh/antiegg-graphics-automation
```

---

## Fallback 계획

```
MCP 전체 실패 → v1 (XLSX + Buzz) 방식으로 복귀. 기존 코드 유지됨.
이미지만 실패 → MCP로 텍스트 자동화, 이미지만 수동 (v1보다는 개선)
export만 실패 → MCP로 텍스트+이미지 자동화, Figma에서 수동 export (충분히 개선)
```
