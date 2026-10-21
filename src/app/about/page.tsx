import type { Metadata } from "next";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import TabBar, { pickTab } from "@/components/site/TabBar";
import { instructors } from "@/data/instructors";
import { COMPANY } from "@/data/site";
import PartnerForm from "./PartnerForm";

export const metadata: Metadata = { title: "아카데미 소개" };

const TABS = [
  { key: "intro", label: "아카데미 소개" },
  { key: "inst", label: "강사 소개" },
  { key: "gallery", label: "갤러리" },
  { key: "way", label: "오시는 길" },
  { key: "partner", label: "제휴 문의" },
] as const;

const FACILITIES = [
  ["p1", "프로페셔널 스튜디오 A", "최대 40명, 정규 과정 강의실"],
  ["p2", "프로페셔널 스튜디오 B", "최대 20명, 그룹 수업 공간"],
  ["p6", "라운지 / 셀프바", "안락한 휴게 공간"],
  ["p4", "프라이빗 락커", "36개의 개인 보관함"],
  ["p5", "미팅룸 / CEO룸", "상담·회의 전용 공간"],
  ["p3", "데스크", "수강 안내 · 방문 접수"],
];
const SALONS = ["강남점", "홍대점", "신촌점", "분당점", "일산점", "수원점", "인천점", "부산 서면전포점"];
const HISTORY = [
  ["2015", "비주얼살롱 1호점 오픈, 사내 교육 프로그램 시작"],
  ["2019", "비주얼아카데미 정식 출범, 디자이너의 정석 커리큘럼 개발"],
  ["2022", "비주얼살롱 8개 지점 확장, 트리필드 헤어케어 브랜드 론칭"],
  ["2024", "오토사장반 경영 컨설팅 과정 개설, 온라인 강의 플랫폼 오픈"],
  ["2026", "누적 수강생 4,200명 돌파, 비주얼아카데미 홈페이지 자체 개발 리뉴얼"],
];
const GALLERY = [
  ["g1", "프로페셔널 스튜디오 A"],
  ["g2", "프로페셔널 스튜디오 B"],
  ["g3", "라운지 & 셀프바"],
  ["g4", "프라이빗 락커"],
  ["g5", "미팅룸 / CEO룸"],
  ["g6", "IFBS 협회 인증 현장"],
];

function IntroPanel() {
  return (
    <>
      <div className="section about-intro">
        <p className="kicker">WELCOME TO VISUAL ACADEMY</p>
        <h2>예술과 사랑이 만나는 곳,<br />비주얼아카데미입니다.</h2>
        <p className="strong">비주얼 아카데미에 오신 것을 진심으로 환영합니다.</p>
        <p>우리는 단순히 기술을 가르치는 교육 기관을 넘어, 사랑으로 동행자를 섬기는 곳입니다. 미용이라는 아름다운 예술 안에서 여러분의 여정에 함께할 수 있음을 큰 영광으로 생각합니다.</p>
        <p>비주얼 아카데미는 일회성 교육으로 끝나는 곳이 아닙니다. 우리는 여러분의 평생 동반자가 되어, 미용 인생의 모든 순간을 함께하며 성장하고자 합니다. 처음 미용을 시작하는 날부터, 그리고 나아가 위기와 도전 속에서 여러분이 도움과 힘을 필요로 할 때마다 든든한 존재가 되어드리고 싶습니다.</p>
      </div>

      <div className="big-photo p1"><span>비주얼아카데미 강남 본원</span></div>

      <div className="section qa-block">
        <div className="qa-head">
          <span className="qtag">Q.</span>
          <h2>비주얼아카데미는 무엇이 다른가요?</h2>
        </div>
        <div className="trio-grid">
          <div><div className="trio-photo p3" /><p className="trio-cap"><b>현장에서 검증된 커리큘럼과 함께</b>감이 아닌 데이터로 설명하는 시술 기준을 가르쳐요</p></div>
          <div><div className="trio-photo p2" /><p className="trio-cap"><b>원장님들과 함께 고민해</b>매출로 이어지는 실전 경영 노하우를 담아내는 설계</p></div>
          <div><div className="trio-photo p6" /><p className="trio-cap"><b>각 분야의 숙련된 강사진과</b>다양한 케이스를 직접 실습하며 완성도를 확인</p></div>
        </div>
      </div>

      <div className="section qa-block">
        <div className="split-section">
          <div className="split-text">
            <p className="qtag">Q. 합리적인 수강료, 어떻게 가능한가요?</p>
            <h3>비주얼살롱 8개 지점을 직접<br />운영하기에 가능합니다.</h3>
            <p>현장에서 검증하지 않은 커리큘럼은 만들지 않아요. 매장을 직접 운영하며 얻은 데이터와 노하우로 군더더기 없는 교육을 설계해, 합리적인 수강료를 유지할 수 있습니다.</p>
          </div>
          <div className="split-photo p5" />
        </div>
      </div>

      <div className="section">
        <h2>시설 안내</h2>
        <div className="trio-grid facility-compact">
          {FACILITIES.map(([p, t, d]) => (
            <div key={t}><div className={`trio-photo ${p}`} /><p className="trio-cap"><b>{t}</b>{d}</p></div>
          ))}
        </div>
      </div>

      <div className="section qa-block">
        <div className="split-section light reverse">
          <div className="split-text">
            <p className="qtag">국제미용과학협회</p>
            <h3>International Society of<br />Beauty Sciences</h3>
            <p>IFBS 국제미용과학협회는 미용과학을 연구하고, 선진 미용문화를 선도하는 <b>국내 최고 수준의 종합 뷰티 과학 협회</b>입니다. 저희 협회는 최신 미용 과학 기술을 연구하며, 이를 바탕으로 미용 산업의 발전에 기여하고 있습니다.</p>
            <p>또한, 과학적 근거에 기반한 미용 기술을 지속적으로 개발하여 <b>미용인들의 역량을 강화하고 있습니다.</b> 더불어, 미용 산업의 혁신을 목표로 권위 있는 학회 및 단체들과의 제휴와 교류를 통해 <b>대한민국 뷰티 산업에 새로운 패러다임을 제시합니다.</b></p>
            <p><b>IFBS</b>는 최신 미용 과학 기술과 트렌드를 연구하고, 이를 교육하며, 국내외 미용 전문가들과 협력하여 <b>한국 미용 산업의 글로벌 리더십을 확립하고자 합니다.</b></p>
          </div>
          <div className="split-photo p3" />
        </div>
      </div>

      <div className="section qa-block">
        <div className="split-section light">
          <div className="split-text">
            <p className="qtag">글로벌 뷰티 산업의 미래</p>
            <h3>Welcome to IFBS</h3>
            <p>IFBS는 지속적이고 과학적인 연구개발을 통해 미래 지속성장형 뷰티 연구소의 기반을 구축하고 있습니다. 세계적인 모발 과학 기술 역량을 강화하며, 선진 미용인을 위한 투자를 확대하여 미래 경쟁력을 선도하는 데 주력하고 있습니다.</p>
            <p>비주얼 뷰티 아카데미를 중심으로 국제미용과학협회 및 해외 파트너사 연구소와의 글로벌 네트워크를 확장하여, 세계적인 연구개발과 미용 산업 혁신을 이끌어 가고 있습니다. IFBS의 끊임없는 도전과 혁신은 글로벌 뷰티 산업의 미래를 이끌어 나갈 것입니다.</p>
          </div>
          <div className="split-photo p5" />
        </div>
      </div>

      <div className="section dark-section">
        <div className="dark-inner">
          <div className="stats-dark">
            <h3>비주얼아카데미가 만들어온 시간</h3>
            <div className="stat-grid-dark">
              {[["4,200+", "누적 수강생"], ["180+", "배출 원장"], ["8개", "비주얼살롱 지점"], ["11년", "교육 운영 연차"]].map(([n, l]) => (
                <div key={l} className="stat-tile-dark"><p className="num">{n}</p><p className="label">{l}</p></div>
              ))}
            </div>
          </div>
          <div className="salon-banner">
            <h3>비주얼살롱 8개 지점과 함께합니다</h3>
            <div className="salon-chip-row">
              {SALONS.map((s) => <span key={s} className="salon-chip">{s}</span>)}
            </div>
          </div>
        </div>
      </div>

      <div className="section quote-section p6">
        <div className="qtext">
          <p>우리가 전하는 것은 단순한 기술이 아니라, 함께 걸어가는 여정입니다. 여러분이 걸어가는 길에 있어 <em>비주얼 뷰티</em>는 언제나 신뢰할 수 있는 동반자가 될 것을 약속드립니다. 여러분이 마주할 아름다움의 세계에서, <em>비주얼아카데미</em>는 변함없는 지원과 격려를 아끼지 않겠습니다.</p>
          <p>미용 인생의 매 순간, 우리는 여러분 곁에 있겠습니다.<br />여러분의 열정이 빛날 수 있도록, 함께 걸어가며 그 길을 더욱 아름답게 빚어내겠습니다.</p>
        </div>
      </div>

      <div className="section">
        <h2>연혁</h2>
        <div className="history">
          {HISTORY.map(([y, d]) => (
            <div key={y} className="history-row"><span className="history-year">{y}</span><span className="history-desc">{d}</span></div>
          ))}
        </div>
      </div>
    </>
  );
}

export default async function AboutPage({ searchParams }: PageProps<"/about">) {
  const tab = pickTab(TABS, (await searchParams).tab);

  return (
    <div className="site pg-about">
      <SiteHeader active="academy" />
      <div className="wrap narrow pagehead">
        <h1>아카데미 소개</h1>
        <p>모발 과학을 기반으로 헤어 전문가를 길러내는 비주얼아카데미를 소개합니다.</p>
      </div>

      <div className="wrap narrow">
        <TabBar basePath="/about" tabs={TABS} active={tab} />

        <div className="tab-panel">
          {tab === "intro" && <IntroPanel />}

          {tab === "inst" && (
            <div className="section">
              <h2>비주얼아카데미 강사진</h2>
              <div className="instructor-grid">
                {instructors.map((i) => (
                  <div key={i.id} className="inst-card">
                    <div className="inst-avatar">{i.initial}</div>
                    <div>
                      <p className="inst-name">{i.name}</p>
                      <p className="inst-role">{i.role}</p>
                      <p className="inst-desc">{i.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "gallery" && (
            <div className="section">
              <h2>아카데미 공간 &amp; 수업 현장</h2>
              <div className="gallery-grid">
                {GALLERY.map(([g, t]) => (
                  <div key={t} className={`gallery-tile ${g}`}><span>{t}</span></div>
                ))}
              </div>
            </div>
          )}

          {tab === "way" && (
            <div className="section">
              <h2>비주얼아카데미 강남 본원</h2>
              <div className="map-box">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 1 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                <p>지도 영역 (실제 서비스에서는 지도 API가 표시돼요)</p>
              </div>
              <div className="info-list">
                <div className="info-row"><span className="info-label">주소</span><span className="info-val"><b>서울 강남구 언주로 622</b> (논현동, 구암빌딩) 1층</span></div>
                <div className="info-row"><span className="info-label">전화</span><span className="info-val">{COMPANY.phone}</span></div>
                <div className="info-row"><span className="info-label">카카오톡</span><span className="info-val">채널 {COMPANY.kakao}</span></div>
                <div className="info-row"><span className="info-label">운영 시간</span><span className="info-val">{COMPANY.hours}</span></div>
              </div>
            </div>
          )}

          {tab === "partner" && (
            <div className="section">
              <h2>제휴 · 가맹 문의</h2>
              <p className="lead" style={{ marginBottom: 24 }}>매장 제휴, 가맹 개설, 교육 협업 등 궁금하신 점을 남겨주시면 담당자가 확인 후 연락드려요.</p>
              <PartnerForm />
            </div>
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
