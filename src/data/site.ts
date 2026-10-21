/* 사이트 공통 정보 (푸터·오시는 길·검색 결과 없음 안내 등에서 사용) */
export const COMPANY = {
  name: "(주)비주얼뷰티",
  ceo: "이유경",
  bizNo: "652-81-03393",
  address: "서울 강남구 언주로 622 (논현동, 구암빌딩) 1층",
  phone: "010-2755-7452",
  kakao: "_bipxhn",
  email: "visual7452@gmail.com",
  hours: "평일 10:00 ~ 19:00 (주말·공휴일 휴무)",
};

export const ROUTES = {
  home: "/",
  classes: "/classes",
  classList: (cat: string) => `/classes?cat=${encodeURIComponent(cat)}`,
  classDetail: (slug: string) => `/classes/${slug}`,
  checkout: (slug: string) => `/checkout?cls=${slug}`,
  about: (tab?: string) => (tab ? `/about?tab=${tab}` : "/about"),
  guide: (tab?: string) => (tab ? `/guide?tab=${tab}` : "/guide"),
  mypage: "/mypage",
  admin: "/admin",
  adminPayments: "/admin/payments",
  adminNewClass: "/admin/classes/new",
  adminEditClass: (id: number) => `/admin/classes/${id}/edit`,
  adminClassContent: (id: number) => `/admin/classes/${id}/content`,
  adminDesign: "/admin/design",
};
