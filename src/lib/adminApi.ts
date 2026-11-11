/* 관리자 API 공통 — proxy 가 이미 막지만 라우트에서도 한 번 더 확인한다 */
import { NextResponse } from "next/server";
import { getAdmin } from "./auth";
import { serviceRoleConfigured } from "./supabase/env";

export async function guardAdmin(): Promise<NextResponse | null> {
  if (!(await getAdmin())) return NextResponse.json({ error: "관리자 로그인이 필요해요" }, { status: 401 });
  if (!serviceRoleConfigured()) return NextResponse.json({ error: "DB 가 아직 연결되지 않았어요" }, { status: 503 });
  return null;
}

export const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
