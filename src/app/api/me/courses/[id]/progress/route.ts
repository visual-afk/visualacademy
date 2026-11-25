import { NextResponse, type NextRequest } from "next/server";
import { getProfile, getUser } from "@/lib/auth";
import { getMyCourse, saveProgress } from "@/lib/vod";

/** POST /api/me/courses/:classId/progress — { videoId, sec, dur } 시청 위치 저장 */
export async function POST(request: NextRequest, { params }: RouteContext<"/api/me/courses/[id]/progress">) {
  const user = await getUser();
  const profile = user ? await getProfile(user.id) : null;
  if (!profile) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });
  const b = (await request.json().catch(() => null)) as { videoId?: string; sec?: number; dur?: number } | null;
  const sec = Number(b?.sec), dur = Number(b?.dur);
  if (!b?.videoId || !(sec >= 0) || !(dur >= 0)) return NextResponse.json({ error: "요청 형식이 올바르지 않아요" }, { status: 400 });

  const access = await getMyCourse(profile.id, Number((await params).id));
  if (!access.ok) return NextResponse.json({ error: access.reason === "expired" ? "수강 기간이 끝났어요" : "수강 권한이 없어요" }, { status: 403 });
  const r = await saveProgress(access.course, b.videoId, sec, dur);
  if (!r) return NextResponse.json({ error: "강의를 찾을 수 없어요" }, { status: 404 });
  if (r.locked) return NextResponse.json({ error: "앞 강의를 먼저 끝까지 들어주세요" }, { status: 403 });
  return NextResponse.json(r);
}
