import { NextResponse, type NextRequest } from "next/server";
import { bad, guardAdmin } from "@/lib/adminApi";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { parseVimeo } from "@/lib/vod";

type Body = { videos: { id?: string; title: string; url: string; ws?: string; wsPart?: string | number; wsLecture?: string | number }[] };

/** 붙일 워크시트 — 2000플랜은 파트(1~)·강(1~), 오토사장반은 파트(0~9) */
function parseWs(v: Body["videos"][number]): { ws_source: string | null; ws_part: number | null; ws_lecture: number | null } | string {
  if (!v.ws) return { ws_source: null, ws_part: null, ws_lecture: null };
  const part = Number(v.wsPart), lecture = Number(v.wsLecture);
  if (v.ws === "2000plan") {
    if (!(Number.isInteger(part) && part >= 1 && part <= 20) || !(Number.isInteger(lecture) && lecture >= 1 && lecture <= 30)) return "2000플랜 워크시트의 파트·강 번호를 확인해주세요";
    return { ws_source: "2000plan", ws_part: part, ws_lecture: lecture };
  }
  if (v.ws === "autoceo") {
    if (!(Number.isInteger(part) && part >= 0 && part <= 9) || String(v.wsPart ?? "") === "") return "오토사장반 워크시트의 파트 번호(0~9)를 확인해주세요";
    return { ws_source: "autoceo", ws_part: part, ws_lecture: null };
  }
  return "워크시트 종류를 확인해주세요";
}

/** PUT /api/admin/classes/:id/videos — 강의 영상 목록을 통째로 저장 (순서 = 배열 순서). 기존 id 는 유지해 진도가 끊기지 않게 한다 */
export async function PUT(request: NextRequest, { params }: RouteContext<"/api/admin/classes/[id]/videos">) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const classId = Number((await params).id);
  const b = (await request.json().catch(() => null)) as Body | null;
  if (!Array.isArray(b?.videos)) return bad("요청 형식이 올바르지 않아요");

  const rows = [];
  for (const [i, v] of b.videos.entries()) {
    const title = (v.title ?? "").trim();
    const parsed = parseVimeo(v.url ?? "");
    if (!title) return bad(`${i + 1}번째 강의 제목을 입력해주세요`);
    if (!parsed) return bad(`${i + 1}번째 강의의 Vimeo 주소를 확인해주세요`);
    // 새 줄도 id 를 여기서 정한다 (bulk upsert 는 빠진 열을 null 로 채운다)
    const id = v.id && /^[0-9a-f-]{36}$/i.test(v.id) ? v.id : crypto.randomUUID();
    const ws = parseWs(v);
    if (typeof ws === "string") return bad(`${i + 1}번째 강의: ${ws}`);
    rows.push({ id, class_id: classId, sort_order: i, title, vimeo_id: parsed.id, vimeo_hash: parsed.hash, ...ws });
  }

  const db = getAdminSupabase();
  const { data: cls } = await db.from("classes").select("type").eq("id", classId).maybeSingle();
  if (!cls) return bad("클래스를 찾을 수 없어요", 404);
  if (cls.type !== "online") return bad("온라인 클래스만 강의 영상을 등록할 수 있어요");

  const keep = rows.map((r) => r.id);
  const del = db.from("class_videos").delete().eq("class_id", classId);
  const { error: delErr } = keep.length ? await del.not("id", "in", `(${keep.join(",")})`) : await del;
  if (delErr) return bad(`저장하지 못했어요: ${delErr.message}`, 500);
  if (rows.length) {
    const { error } = await db.from("class_videos").upsert(rows);
    if (error) return bad(`저장하지 못했어요: ${error.message}`, 500);
  }
  return NextResponse.json({ ok: true });
}
