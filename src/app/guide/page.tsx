import type { Metadata } from "next";
import Link from "next/link";
import Accordion from "@/components/site/Accordion";
import { RefundAutoOpen } from "@/components/site/RefundPopup";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import TabBar, { pickTab } from "@/components/site/TabBar";
import { ROUTES } from "@/data/site";

export const metadata: Metadata = { title: "수강 안내" };

/* 환불 규정은 탭이 아니라 모든 페이지 푸터의 '환불 규정' 팝업 (?tab=refund 링크는 팝업으로 연결) */
const TABS = [
  { key: "proc", label: "수강 절차" },
  { key: "faq", label: "자주 묻는 질문" },
] as const;

const FAQ_GROUPS = [
  {
    title: "신청 · 결제",
    items: [
      { q: "비전공자도 수강할 수 있나요?", a: "네, 클래스마다 \"비전공자 가능\" 여부가 표시돼 있어요. 입문 과정은 기초 이론부터 차근차근 안내해드려요." },
      { q: "결제 수단은 무엇이 있나요?", a: "신용카드, 실시간 계좌이체, 무통장입금을 지원해요. 무통장입금은 입금 확인 후 신청이 확정돼요." },
      { q: "세금계산서 발행이 가능한가요?", a: "사업자 회원은 결제 후 마이페이지에서 세금계산서를 신청할 수 있어요. 신청일 기준 익월 10일까지 발행돼요." },
    ],
  },
  {
    title: "수강 관련",
    items: [
      { q: "개인 사정으로 결석하면 어떻게 되나요?", a: "정규 과정은 다음 기수 동일 회차에 보강 참여가 가능해요. 단회차 특강은 보강이 제공되지 않아요." },
      { q: "온라인 강의는 몇 번이나 볼 수 있나요?", a: "수강 기간 내에는 횟수 제한 없이 반복해서 볼 수 있어요." },
      { q: "정원이 마감되면 신청할 수 없나요?", a: "정원이 마감된 클래스는 개설 대기 신청을 해두시면, 추가 기수가 열릴 때 가장 먼저 안내해드려요." },
    ],
  },
  {
    title: "환불 · 변경",
    items: [
      { q: "신청한 클래스를 취소하고 싶어요", a: "마이페이지 > 신청 내역에서 직접 취소 신청할 수 있어요. 환불 비율은 화면 맨 아래 '환불 규정'을 눌러 확인해주세요." },
      { q: "다른 기수로 일정을 변경할 수 있나요?", a: "개강 3일 전까지는 1회에 한해 다른 기수로 일정 변경이 가능해요. 카카오채널로 문의해주세요." },
    ],
  },
  {
    title: "수료증",
    items: [
      { q: "수료증은 모든 과정에서 발급되나요?", a: "정규 레벨 과정과 일부 온라인 강의는 수료증이 발급돼요. 단회차 특강은 참가확인증이 제공돼요. 클래스 상세 페이지의 \"수료증 발급\" 여부를 확인해주세요." },
    ],
  },
];

const PROC: { title: string; desc: React.ReactNode; notes?: [string, string][] }[] = [
  { title: "클래스 둘러보기", desc: <>정규 레벨 과정, 단독 특강, 온라인 강의 중 원하는 클래스를 확인하세요. <Link href={ROUTES.classes}>클래스 상세 페이지</Link>에서 일정·장소·수강료를 바로 볼 수 있어요.</> },
  { title: "상담 신청 (선택)", desc: <>어떤 과정이 나에게 맞을지 모르겠다면, <Link href={ROUTES.about("way")}>상담 신청</Link>으로 먼저 안내받을 수 있어요.</> },
  { title: "신청서 작성", desc: "이름, 연락처, 근무 매장(선택) 등 기본 정보를 입력하고 환불 규정 및 이용약관에 동의해요." },
  { title: "결제", desc: "신용카드, 실시간 계좌이체, 무통장입금 중 원하는 방법으로 결제를 진행해요." },
  {
    title: "수강 확정 안내",
    desc: "결제가 완료되면 신청 내역을 문자와 카카오 알림톡으로 안내드려요.",
    notes: [
      ["오프라인", "개강 전 일정·준비물 안내를 다시 한 번 보내드려요"],
      ["온라인", "결제 즉시 마이페이지에서 강의를 바로 시청할 수 있어요"],
    ],
  },
  { title: "수강 시작", desc: "오프라인은 개강일에 맞춰 본원으로 방문해주시고, 온라인은 원하는 시간에 자유롭게 학습을 시작하시면 돼요." },
  { title: "수료증 발급", desc: "과정별 출석률(오프라인) 또는 수강 완료율(온라인) 기준을 충족하면 수료증이 발급돼요." },
];

export default async function GuidePage({ searchParams }: PageProps<"/guide">) {
  const raw = (await searchParams).tab;
  const tab = pickTab(TABS, raw);

  return (
    <div className="site pg-guide">
      <SiteHeader active="guide" />
      <div className="wrap narrow pagehead">
        <h1>수강 안내</h1>
        <p>신청부터 수료까지 궁금한 점을 한 곳에서 확인하세요.</p>
      </div>

      <div className="wrap narrow">
        <TabBar basePath="/guide" tabs={TABS} active={tab} />

        <div className="tab-panel">
          {tab === "proc" && (
            <div className="section">
              <h2>신청부터 수료까지, 이렇게 진행돼요</h2>
              <div className="proc">
                {PROC.map((s, i) => (
                  <div key={s.title} className="proc-step">
                    <div className="proc-num">{i + 1}</div>
                    <div className="proc-body">
                      <p className="proc-title">{s.title}</p>
                      <p className="proc-desc">{s.desc}</p>
                      {s.notes?.map(([k, v]) => (
                        <div key={k} className="proc-note"><b>{k}</b>{v}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "faq" &&
            FAQ_GROUPS.map((g) => (
              <div key={g.title} className="faq-group">
                <h3>{g.title}</h3>
                <Accordion items={g.items} />
              </div>
            ))}
        </div>
      </div>
      {raw === "refund" && <RefundAutoOpen />}
      <SiteFooter />
    </div>
  );
}
