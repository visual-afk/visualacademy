/** 정사각형(1:1) 썸네일 자리 — 실제 이미지가 등록되면 src 로 노출 */
export default function ClassThumb({ src, alt = "" }: { src?: string; alt?: string }) {
  return (
    <div className="thumb" aria-hidden={!src}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} />
      ) : (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <circle cx="9" cy="9" r="1.6" />
          <path d="M21 16l-5-5L5 21" />
        </svg>
      )}
    </div>
  );
}
