"use client";

import { useSyncExternalStore } from "react";

/*
 * 로그인 상태 (임시) — 카카오 로그인 연동 전까지 브라우저(localStorage)에 회원 이름만 저장한다.
 * 백엔드 연동 시: 세션/쿠키 기반 GET /api/me 로 바꾼다 (docs/backend-todo.md).
 */
const KEY = "va-login";
const EVT = "va-login-change";

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** 로그인한 회원 이름 (로그인 전이면 null). 서버 렌더 시에는 항상 null */
export function useLoginName(): string | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

export function login(name: string) {
  try {
    localStorage.setItem(KEY, name);
  } catch {}
  window.dispatchEvent(new Event(EVT));
}

export function logout() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(EVT));
}
