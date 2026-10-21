# 백엔드 작업 목록

프론트엔드는 `src/lib/api.ts`를 통해서만 데이터를 읽습니다. 아래 API를 만들고 `api.ts`의 함수 본문을 fetch로 바꾸면 됩니다.
타입 정의는 `src/lib/types.ts`(`AcademyClass`, `ClassDetail`, `Payment` 등)를 기준으로 합니다. 경로는 제안안입니다.

## 데이터 모델 (요약)

- **Class**: slug, name, cat(정석/특강/세미나/경영/온라인), field, target, type(offline/seminar/waitlist/online/upcoming), day, time, place, date(개강일), capacity, applied, price(부가세 포함 최종가), taxType(taxable/exempt), cert, noob, step(로드맵 1~4), level(정석), weeks/months, summary, manualEnd
- **ClassContent**: checklist, lessons[], instructorId, prep, faqs[], thumbnail/banner/detailImage URL, preview(온라인 1강)
- **Instructor**, **Review**(클래스별 구매평)
- **Application**(신청): user, class, 신청자 정보(이름·휴대폰·이메일·근무 매장), 동의 항목, 상태(입금 대기/수강 확정/수강 완료/신청 취소)
- **Payment**: 주문번호, 결제수단, 금액, 과세 구분, 상태(결제완료/부분환불/환불완료/입금대기), refund{}, invoice{}
- **Enrollment**(온라인 수강권한): 진도, 만료일
- **WaitlistAlert**(개설 알림 신청), **Inquiry**(제휴 문의), **User**

모집 상태는 저장하지 않고 정원·신청 수·개강일로 계산합니다 (`src/lib/status.ts`의 `computeStatus` 규칙: 개강일 경과=종료, 정원 도달=마감, 잔여 2석 이하(정원 50명 초과는 10% 이하)=마감임박).

## 공개 API

| 메서드 | 경로 | 사용 화면 |
|---|---|---|
| GET | `/api/classes` | 메인, 클래스 목록 |
| GET | `/api/classes/:slug` | 클래스 상세, 신청·결제 |
| GET | `/api/search?q=` | 메인 내부 검색 (현재는 클라이언트 인덱스 `src/data/searchIndex.ts`) |
| POST | `/api/classes/:slug/waitlist` | 개설 알림 신청 |
| POST | `/api/inquiries` | 제휴·가맹 문의 |

## 회원 / 마이페이지 (인증 필요)

| 메서드 | 경로 | 비고 |
|---|---|---|
| POST | `/api/auth/login`, `/api/auth/logout` | 로그인 화면 신규 필요 |
| GET/PATCH | `/api/me` | 내 정보 수정·비밀번호 변경 |
| DELETE | `/api/me` | 회원 탈퇴 (진행 중 수강 확인) |
| GET | `/api/me/applications` | 신청 내역 |
| POST | `/api/me/applications/:id/cancel` | 취소 신청 (환불 규정 적용) |
| GET | `/api/me/payments`, `/api/me/payments/:id/receipt` | 결제 내역·영수증(과세/면세) |
| GET | `/api/me/enrollments` | 온라인 수강권한·진도 |

## 신청 · 결제

| 메서드 | 경로 | 비고 |
|---|---|---|
| POST | `/api/orders` | 신청서 + 동의 → 주문 생성, 주문번호 발급 (`VA-YYYYMMDD-NNNN`) |
| POST | `/api/orders/:id/confirm` | 토스페이먼츠 결제 승인 (카드/간편결제/계좌이체) |
| POST | `/api/payments/webhook` | 가상계좌 입금 확인 → 입금대기 → 수강 확정 |

결제 완료 시: 신청 수 증가, 알림톡 발송(오프라인: 개강 3일 전 준비물 안내 / 온라인: 즉시 수강·만료 30일 전 안내).

## 관리자 API

| 메서드 | 경로 | 화면 |
|---|---|---|
| GET | `/api/admin/classes` | 대시보드 카드 |
| POST / PUT | `/api/admin/classes`, `/api/admin/classes/:id` | 클래스 등록·편집 (임시저장 포함) |
| PATCH | `/api/admin/classes/:id` | 정원 조정, 개강일 변경, 강제 종료/취소 |
| POST | `/api/admin/uploads` | 썸네일·배너·상세 이미지 업로드 (상세 이미지는 원본 비율 유지) |
| GET | `/api/admin/stats/revenue`, `/api/admin/stats/daily` | 매출 히어로, 분류별 매출, 7일 결제 건수 |
| GET | `/api/admin/payments?status=&method=&period=&q=` | 결제 관리 |
| POST | `/api/admin/payments/:id/refund` | 전액/부분 환불 (PG 환불 API) |
| POST | `/api/admin/payments/:id/invoice` | 세금계산서 발행·재발행 |
| GET | `/api/admin/payments.csv` | CSV 내보내기 |
| GET | `/api/content/:page` | 고객용 페이지 게시본 (main/list/detail/about/guide/my/pay) — 없으면 `siteContent.ts` 기본값 |
| PUT | `/api/admin/content/:page` | 디자인 모드 게시 (변경 메모 포함) → 새 버전 생성 |
| GET | `/api/admin/content/:page/versions` | 버전 기록 · 특정 버전 내용 (복구는 초안으로 불러온 뒤 다시 게시) |
| — | 신청자 목록 · 배치 상담 · 개설 알림 | 관리자 화면 미구현 (프로토타입 없음) |

## 외부 연동

- PG: 토스페이먼츠 (결제창, 승인, 환불, 가상계좌 웹훅)
- 알림톡: 결제 완료·개강 안내·만료 안내·개설 알림
- 전자세금계산서 발행 서비스
- 지도 API (오시는 길)
- 이미지 스토리지 (S3 등)

## 프론트 교체 지점

- `src/lib/api.ts` — 모든 조회 함수
- `src/app/checkout/CheckoutFlow.tsx` — `pay()` 시뮬레이션 → PG 결제창
- `src/app/admin/classes/ClassForm.tsx` — `save()`, `loadFile()`(현재 브라우저 미리보기만)
- `src/app/admin/payments/Payments.tsx` — `confirmRefund()`, `confirmInvoice()`
- `src/app/admin/Dashboard.tsx` — 정원·개강일·종료 변경 (현재 화면 상태만)
- `src/app/about/PartnerForm.tsx`, `src/app/mypage/MyPageView.tsx` — 폼 제출
- `src/data/siteContent.ts` `getMainContent()` — 게시된 페이지 콘텐츠 조회 (현재 메인·상단 메뉴·푸터가 사용, 나머지 페이지 문구도 같은 방식으로 연결 예정)
- `src/app/admin/design/DesignMode.tsx` — `loadState()`/`persist()`(현재 localStorage) → 콘텐츠 API, 사진은 data URL 대신 업로드 API URL
