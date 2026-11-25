import { NextResponse, type NextRequest } from "next/server";
import { getProfile, getUser } from "@/lib/auth";
import { cleanEmail, validEmail } from "@/lib/twokplan";
import { getMyCourse, getWorksheetEmail, refreshWorksheets, setWorksheetEmail } from "@/lib/vod";

/**
 * POST /api/me/courses/:classId/worksheets — { email? }
 * 워크시트 위젯에서 제출했을 때(또는 채점 결과 받을 이메일을 정할 때) 2000플랜 DB 를 다시 확인해 잠금·진도를 돌려준다.
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/api/me/courses/[id]/worksheets">) {
  const user = await getUser();
  const profile = user ? await getProfile(user.id) : null;
  if (!profile) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });
  const b = (await request.json().catch(() => null)) as { email?: string } | null;

  let worksheetEmail = await getWorksheetEmail(profile.id);
  if (b?.email != null) {
    const email = cleanEmail(b.email);
    if (!validEmail(email)) return NextResponse.json({ error: "이메일 주소를 다시 확인해 주세요" }, { status: 400 });
    await setWorksheetEmail(profile.id, email);
    worksheetEmail = email;
  }

  const access = await getMyCourse(profile.id, Number((await params).id));
  if (!access.ok) return NextResponse.json({ error: access.reason === "expired" ? "수강 기간이 끝났어요" : "수강 권한이 없어요" }, { status: 403 });
  return NextResponse.json(await refreshWorksheets(access.course, { name: profile.name, email: profile.email, worksheetEmail }, request.nextUrl.origin));
}
