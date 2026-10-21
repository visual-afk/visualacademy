"use client";

import { useCallback, useRef, useState } from "react";

/** 하단 토스트 — const { toast, showToast } = useToast(); ... {toast} */
export function useToast(duration = 1800) {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (m: string) => {
      setMsg(m);
      setShow(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setShow(false), duration);
    },
    [duration],
  );

  const toast = (
    <div className={`toast${show ? " show" : ""}`} role="status">
      {msg}
    </div>
  );
  return { toast, showToast };
}
