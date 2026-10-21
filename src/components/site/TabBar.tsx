import Link from "next/link";

/**
 * ?tab= 쿼리 기반 탭바 — 서버에서 선택된 탭을 렌더하므로 /about?tab=way 같은 딥링크가 그대로 동작한다.
 * 첫 번째 탭은 쿼리 없이 기본 경로로 연결된다.
 */
export default function TabBar<T extends string>({
  basePath,
  tabs,
  active,
}: {
  basePath: string;
  tabs: readonly { key: T; label: string }[];
  active: T;
}) {
  return (
    <nav className="tabbar" aria-label="탭">
      {tabs.map((t, i) => (
        <Link
          key={t.key}
          href={i === 0 ? basePath : `${basePath}?tab=${t.key}`}
          className={`tabbar-btn${t.key === active ? " active" : ""}`}
          aria-current={t.key === active ? "page" : undefined}
          replace
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function pickTab<T extends string>(tabs: readonly { key: T }[], raw: string | string[] | undefined): T {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return tabs.find((t) => t.key === v)?.key ?? tabs[0].key;
}
