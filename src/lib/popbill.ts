import "server-only";
import popbill from "popbill";

/*
 * 팝빌 전자세금계산서 — SDK 가 콜백 방식이라 Promise 로 감싼다.
 * 테스트(POPBILL_TEST=true)는 test.popbill.com 에만 발행되고 국세청으로 전송되지 않는다.
 */

export const popbillConfigured = () => Boolean(process.env.POPBILL_LINK_ID && process.env.POPBILL_SECRET_KEY && process.env.POPBILL_CORP_NUM);

/** 공급자 = 아카데미 사업자 (팝빌 연동회원) */
export const INVOICER = {
  corpNum: process.env.POPBILL_CORP_NUM ?? "",
  corpName: "(주)비주얼뷰티",
  ceoName: "이유경",
};

export class PopbillError extends Error {
  constructor(public code: number, message: string) {
    super(message);
  }
}

let service: ReturnType<typeof popbill.TaxinvoiceService> | null = null;
function taxinvoice() {
  if (!service) {
    popbill.config({
      LinkID: process.env.POPBILL_LINK_ID,
      SecretKey: process.env.POPBILL_SECRET_KEY,
      IsTest: process.env.POPBILL_TEST !== "false",
      // Vercel 은 나가는 IP 가 매번 바뀌어서 토큰 IP 제한을 끈다
      IPRestrictOnOff: false,
      UseLocalTimeYN: true,
      defaultErrorHandler: () => {},
    });
    service = popbill.TaxinvoiceService();
  }
  return service;
}

function call<T>(fn: (ok: (v: T) => void, fail: (e: { code: number; message: string }) => void) => void): Promise<T> {
  return new Promise((resolve, reject) => fn(resolve, (e) => reject(new PopbillError(e?.code ?? -1, e?.message ?? "팝빌 요청 실패"))));
}

export type TaxinvoiceDoc = {
  writeDate: string; // yyyyMMdd
  taxType: "과세" | "면세";
  mgtKey: string;
  invoicee: { corpNum: string; corpName: string; ceoName: string; email: string };
  supplyCost: number;
  tax: number;
  itemName: string;
  remark?: string;
  modify?: { code: 1 | 2 | 4; orgNtsConfirmNum: string };
};

/** 즉시발행 — 국세청 승인번호를 돌려준다 */
export async function registIssue(doc: TaxinvoiceDoc): Promise<string> {
  const total = doc.supplyCost + doc.tax;
  const body = {
    writeDate: doc.writeDate,
    chargeDirection: "정과금",
    issueType: "정발행",
    purposeType: "영수",
    taxType: doc.taxType,
    invoicerCorpNum: INVOICER.corpNum,
    invoicerMgtKey: doc.mgtKey,
    invoicerCorpName: INVOICER.corpName,
    invoicerCEOName: INVOICER.ceoName,
    invoiceeType: "사업자",
    invoiceeCorpNum: doc.invoicee.corpNum,
    invoiceeCorpName: doc.invoicee.corpName,
    invoiceeCEOName: doc.invoicee.ceoName,
    invoiceeEmail1: doc.invoicee.email,
    supplyCostTotal: String(doc.supplyCost),
    taxTotal: String(doc.tax),
    totalAmount: String(total),
    ...(doc.remark ? { remark1: doc.remark } : {}),
    ...(doc.modify ? { modifyCode: doc.modify.code, orgNTSConfirmNum: doc.modify.orgNtsConfirmNum } : {}),
    detailList: [{ serialNum: 1, purchaseDT: doc.writeDate, itemName: doc.itemName, qty: "1", supplyCost: String(doc.supplyCost), tax: String(doc.tax) }],
  };
  const r = await call<{ ntsConfirmNum?: string }>((ok, fail) => taxinvoice().registIssue(INVOICER.corpNum, body, ok, fail));
  return r.ntsConfirmNum ?? "";
}

/** 300 발행완료 · 301 전송전 · 302 전송대기 · 303 전송중 · 304 전송성공 · 305 전송실패 · 600 발행취소 */
export async function getState(mgtKey: string): Promise<{ stateCode: number; ntsconfirmNum: string }> {
  return call((ok, fail) => taxinvoice().getInfo(INVOICER.corpNum, popbill.MgtKeyType.SELL, mgtKey, "", ok, fail));
}

/** 국세청 전송 전(발행완료)만 가능 — 신고 대상에서 빠진다 */
export async function cancelIssue(mgtKey: string, memo: string): Promise<void> {
  await call((ok, fail) => taxinvoice().cancelIssue(INVOICER.corpNum, popbill.MgtKeyType.SELL, mgtKey, memo, "", ok, fail));
}

/** 팝빌 문서 보기 팝업 URL (30초 동안만 유효) */
export async function viewUrl(mgtKey: string): Promise<string> {
  return call((ok, fail) => taxinvoice().getPopUpURL(INVOICER.corpNum, popbill.MgtKeyType.SELL, mgtKey, "", ok, fail));
}
