/*
 * 디자인 모드 — 페이지별 미리보기 렌더러 모음.
 * 미리보기는 실제 고객 페이지와 같은 마크업·클래스로 만든 HTML 문자열이고, 편집기 iframe(실제 사이트 CSS 복사) 안에서 그린다.
 * 모든 사용자 입력은 pv/kit.ts 의 esc()/nl()/rich() 로 이스케이프하고, 이미지 주소는 url() 로 거른다.
 */
import { PV_ABOUT, PV_GREETING } from "./pv/about";
import { PV_DET, PV_LIST } from "./pv/classes";
import type { PagePreview } from "./pv/kit";
import { PV_MAIN } from "./pv/main";
import { PV_LOGIN, PV_MY, PV_PAY } from "./pv/member";
import type { EditorPageKey } from "./schemas";

export { esc, FRAME_CSS, type PagePreview, type PvCtx } from "./pv/kit";

export const PREVIEWS: Record<EditorPageKey, PagePreview> = {
  main: PV_MAIN, list: PV_LIST, detail: PV_DET, about: PV_ABOUT, greeting: PV_GREETING, my: PV_MY, pay: PV_PAY, login: PV_LOGIN,
};
