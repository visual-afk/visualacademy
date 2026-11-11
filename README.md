# 비주얼아카데미 홈페이지 (프론트엔드)

비주얼아카데미 홈페이지 리뉴얼 프로토타입(claude.ai 아티팩트 10종, "홈페이지 프로토타입 허브")을 **Next.js 앱으로 그대로 옮긴 프론트엔드**입니다.
백엔드는 아직 없으며, 모든 데이터는 `src/data/`의 목업을 `src/lib/api.ts`를 통해 읽습니다. 백엔드가 준비되면 `api.ts` 함수 본문만 실제 API 호출로 바꾸면 됩니다.

## 실행

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start   # 프로덕션 빌드 확인
npm run lint
```

Node.js 20 이상 필요 (개발 환경: Node 24, Next.js 16, React 19, TypeScript).

## 백엔드 설정 (Supabase)

`.env.local`(git 제외)에 키를 넣는다. 키가 없으면 지금처럼 `src/data/` 목업으로 동작한다.

| 변수 | 설명 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 아카데미 Supabase 프로젝트 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 (DB 쓰기·조회) |
| `VISUAL_AUTO_SUPABASE_URL` / `VISUAL_AUTO_SUPABASE_ANON_KEY` | 관리자 로그인 — visual-auto 본사(hq_admin) 계정 확인 |
| `ADMIN_SESSION_SECRET` | 관리자 쿠키 서명. 설정하면 `/admin`이 로그인으로 잠긴다 |
| 알림톡 · 본사 채팅 · Cron | [docs/alimtalk-templates.md](docs/alimtalk-templates.md) 참고 (`SOLAPI_*`, `KAKAO_SENDER_KEY`, `KAKAO_TMPL_*`, `ACADEMY_CHAT_WEBHOOK_URL`, `CRON_SECRET`) — 없으면 알림만 건너뛴다 |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` / `TOSS_SECRET_KEY` | 토스페이먼츠 **결제위젯 연동 키** (`gck_` / `gsk_`). API 개별 연동 키(`ck_`/`sk_`)와 섞어 쓰면 승인이 실패한다 |

1. Supabase SQL Editor에서 `supabase/migrations/0001_init.sql` 실행
2. `npm run seed` — 목업 클래스·강사를 DB에 넣기
3. `supabase/migrations/0002_orders.sql` 실행 (신청·결제)
4. 토스 개발자센터 > 웹훅에 `https://<도메인>/api/payments/webhook` 등록 (가상계좌 입금 반영)
5. 카카오 관리자 등록: `admins` 테이블에 `name`, `email`(카카오 계정 이메일) 행 추가 → 첫 로그인 때 연결

결제 흐름: 신청서 → `POST /api/orders`(결제대기, 금액은 서버가 DB 가격으로) → 토스 결제위젯 → `/checkout/success`에서 금액 대조 · `hold_seat`로 정원 확인 · 승인. 0원 클래스는 결제 없이 바로 수강확정.

로그인 흐름: 고객 `/login`(카카오) → `/auth/callback` → 휴대폰이 없으면 `/login/profile`. 관리자 `/admin/login`(visual-auto 계정 또는 카카오). 접근 제어는 `src/proxy.ts`.

## 화면 (라우트)

| 구분 | 경로 | 내용 |
|---|---|---|
| 고객 | `/` | 메인 — 다크 히어로 + 내부 검색, 성장 로드맵, 모집중 클래스, 프로그램, 온라인 배너, 강사, 후기 |
| 고객 | `/classes` (`?cat=정석\|특강\|세미나\|경영\|온라인`) | 클래스 목록 — 로드맵, 상태 탭·6개 필터, 레벨별/수업별 보기 |
| 고객 | `/classes/[slug]` | 클래스 상세 — 썸네일·요약, 온라인 1강 미리보기, 상세/구매평/Q&A/반품 탭, 구매박스 |
| 고객 | `/about` (`?tab=intro\|inst\|gallery\|way\|partner`) | 아카데미 소개 · 강사 · 갤러리 · 오시는 길 · 제휴 문의 |
| 고객 | `/guide` (`?tab=proc\|faq`) | 수강 절차 · FAQ (환불 규정은 모든 페이지 푸터의 팝업, `?tab=refund`는 팝업으로 연결) |
| 고객 | `/login` (`?next=`) | 카카오 로그인 · 가입 — 처음 오는 회원은 정보 확인·약관 동의 후 가입, 이미 가입한 회원은 바로 로그인 |
| 고객 | `/mypage` (`?tab=apply\|pay\|online\|info`) | 신청 내역 · 결제 내역(영수증 모달) · 온라인 수강권한 · 내 정보(탈퇴 플로우) |
| 고객 | `/checkout?cls=[slug]` | 신청 정보 → 결제 수단 → 처리중/실패 → 완료(가상계좌 대기) |
| 관리자 | `/admin` | 대시보드 — 매출 현황, 클래스 현황, 카드별 정원 조정·개강일 수정·강제 종료 |
| 관리자 | `/admin/classes/new`, `/admin/classes/[id]/edit` | 클래스 기본 정보 등록/편집 |
| 관리자 | `/admin/classes/[id]/content` | 클래스 콘텐츠 관리 — 썸네일·배너·상세 이미지 업로드 미리보기, 가이드선, 우클릭 교체 |
| 관리자 | `/admin/design` | 디자인 모드(페이지 관리) — 고객용 8개 페이지 문구·사진·영역 편집, 초안/게시/버전 복구 |
| 관리자 | `/admin/payments` | 결제 관리 — 필터, 상세 행, 전액/부분 환불, 세금계산서 발행 |

## 폴더 구조

```
src/
  app/                    라우트 (App Router). 페이지별 클라이언트 컴포넌트는 같은 폴더에
  components/
    site/                 고객용 공통: SiteHeader, SiteFooter, GrowthRoadmap, TabBar, Accordion, ClassThumb
    admin/                관리자 공통: AdminTopbar
    common/               useToast
  data/                   목업 데이터 (classes, payments, instructors, mypage, searchIndex, site)
                          siteContent.ts — 디자인 모드에서 편집하는 페이지 콘텐츠 기본값
  lib/
    api.ts                데이터 접근 레이어 — 백엔드 교체 지점
    types.ts              도메인 타입 (API 스키마 기준)
    status.ts             모집 상태 자동 계산 (정원·개강일 기반)
    format.ts             날짜·금액·부가세 계산
    search.ts             메인 내부 검색 (동의어·오타·비교 질문·추천 질문)
  styles/                 site.css(고객 공통) · admin.css · roadmap.css · pages/*.css
public/images/roadmap/    성장 로드맵 hover 이미지
docs/                     기획·디자인·백엔드 정리 문서
```

스타일은 프로토타입 CSS를 거의 그대로 옮겨 **루트 클래스로 스코프**했습니다 (`.site.pg-home`, `.admin-ui.pg-payments` 등, 네이티브 CSS 중첩 사용). Tailwind는 쓰지 않습니다.

## 문서

- [docs/pages.md](docs/pages.md) — 페이지별 기능 명세와 프로토타입 대비 변경점
- [docs/design-system.md](docs/design-system.md) — 컬러 토큰·타이포·컴포넌트 규칙
- [docs/backend-todo.md](docs/backend-todo.md) — 백엔드에서 만들어야 할 API·데이터 모델

## 알아둘 점

- 모집 상태·D-day는 **오늘 날짜 기준**으로 요청 시점에 계산합니다 (해당 페이지는 동적 렌더링).
- 목업 개강일은 2026-10-14를 '오늘'로 두고 정한 값이라, 날짜가 지나도 같은 상태가 보이도록 지난 날수만큼 자동으로 미뤄서 보여줍니다 (`src/lib/api.ts`의 `MOCK_TODAY`, 백엔드 연동 시 삭제).
- 결제·로그인·업로드·알림은 모두 화면 동작만 있고 실제 처리는 없습니다 (UI에 안내 문구 표시).
- 로그인 상태는 카카오 연동 전까지 브라우저(localStorage `va-login`)에 회원 이름만 저장합니다 (`src/lib/auth.ts`). 로그인 전에 신청·결제로 가면 '로그인이 필요해요' 안내가 뜹니다.
- 디자인 모드의 게시본·버전 기록은 현재 브라우저(localStorage)에만 저장됩니다. 메인 페이지·상단 메뉴·푸터는 `src/data/siteContent.ts`를 읽으므로, 백엔드가 게시본을 내려주면 실제 사이트에 반영됩니다.
- "예시 데이터" 점선 태그가 붙은 영역(메인 강사·후기 등)은 실제 콘텐츠로 교체가 필요합니다.
