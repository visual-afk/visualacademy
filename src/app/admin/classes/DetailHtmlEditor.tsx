"use client";

import { useEffect, useRef } from "react";

/**
 * 상세 본문(글·사진) 편집기 — 보이는 그대로 고치는 칸.
 * 글은 바로 눌러서 고치고, 사진은 눌러서 고른 뒤 지우기, 새 사진은 커서 자리에 넣는다.
 * 저장할 때 서버(lib/detailHtml)가 허용한 태그·속성만 남긴다.
 */
export default function DetailHtmlEditor({
  initial,
  onChange,
  onPickImage,
}: {
  initial: string;
  onChange: (html: string) => void;
  /** 사진 1장을 골라 저장소에 올리고 주소를 돌려준다 (취소하면 null) */
  onPickImage: () => Promise<string | null>;
}) {
  const box = useRef<HTMLDivElement>(null);
  const selected = useRef<HTMLImageElement | null>(null);
  const range = useRef<Range | null>(null);

  // 처음 한 번만 채운다 — 이후에는 편집기(브라우저)가 내용을 가진다
  useEffect(() => {
    if (box.current) box.current.innerHTML = initial;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => onChange(box.current?.innerHTML ?? "");

  const remember = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && box.current?.contains(sel.anchorNode)) range.current = sel.getRangeAt(0).cloneRange();
  };

  const select = (img: HTMLImageElement | null) => {
    selected.current?.classList.remove("de-selected");
    selected.current = img;
    img?.classList.add("de-selected");
  };

  const addImage = async () => {
    const url = await onPickImage();
    if (!url || !box.current) return;
    const img = document.createElement("img");
    img.src = url;
    img.alt = "";
    const p = document.createElement("p");
    p.appendChild(img);
    const r = range.current;
    if (r && box.current.contains(r.startContainer)) {
      // 커서가 있던 문단 뒤에 넣는다
      let node: Node | null = r.startContainer;
      while (node && node.parentNode !== box.current) node = node.parentNode;
      if (node) box.current.insertBefore(p, node.nextSibling);
      else box.current.appendChild(p);
    } else {
      box.current.appendChild(p);
    }
    emit();
  };

  const removeImage = () => {
    const img = selected.current;
    if (!img) return;
    const parent = img.parentElement;
    img.remove();
    if (parent && parent !== box.current && !parent.textContent?.trim() && !parent.querySelector("img,iframe")) parent.remove();
    select(null);
    emit();
  };

  const clearAll = () => {
    if (!box.current || !confirm("상세 본문을 모두 지울까요? 저장하기 전까지는 되돌릴 수 있어요(새로고침).")) return;
    box.current.innerHTML = "";
    select(null);
    emit();
  };

  return (
    <div className="detail-editor">
      <div className="de-toolbar">
        <button type="button" className="preset-btn" onClick={addImage}>＋ 사진 넣기</button>
        <button type="button" className="preset-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => { document.execCommand("bold"); emit(); }}>굵게</button>
        <button type="button" className="preset-btn" onClick={removeImage}>고른 사진 지우기</button>
        <button type="button" className="preset-btn de-danger" onClick={clearAll}>본문 전체 지우기</button>
      </div>
      <p className="desc de-help">글은 바로 눌러서 고치세요. 사진은 한 번 눌러 고른 뒤 &lsquo;고른 사진 지우기&rsquo;, 새 사진은 넣고 싶은 문단을 누른 뒤 &lsquo;사진 넣기&rsquo;.</p>
      <div
        ref={box}
        className="de-body"
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onKeyUp={remember}
        onMouseUp={remember}
        onBlur={remember}
        onClick={(e) => select(e.target instanceof HTMLImageElement ? e.target : null)}
      />
    </div>
  );
}
