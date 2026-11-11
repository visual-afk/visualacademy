"use client";

import { useSyncExternalStore } from "react";
import { getBrowserSupabase } from "./supabase/client";
import { supabaseConfigured } from "./supabase/env";

/*
 * 화면 표시용 로그인 상태 (헤더 로그인/마이페이지 버튼, 신청 화면 로그인 안내)
 * - Supabase 키가 있으면: 카카오 로그인 세션 (onAuthStateChange)
 * - 없으면(목업): 브라우저(localStorage)에 회원 이름만 저장
 * 권한 확인은 서버(lib/auth.ts)가 한다 — 여기 값은 버튼 모양에만 쓴다.
 */
const KEY = "va-login";
const EVT = "va-login-change";
const REAL = supabaseConfigured();

let realName: string | null = null;
let started = false;
const listeners = new Set<() => void>();

function startReal() {
  if (started) return;
  started = true;
  getBrowserSupabase().auth.onAuthStateChange((_event, session) => {
    const meta = session?.user.user_metadata ?? {};
    realName = session ? (meta.name ?? meta.full_name ?? meta.nickname ?? "회원") : null;
    listeners.forEach((l) => l());
  });
}

function read(): string | null {
  if (REAL) return realName;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function subscribe(cb: () => void) {
  if (REAL) {
    startReal();
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** 로그인한 회원 이름 (로그인 전·확인 전이면 null). 서버 렌더 시에는 항상 null */
export function useLoginName(): string | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

/** 목업 로그인 — 실제 로그인은 LoginFlow(real) → /auth/callback */
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
