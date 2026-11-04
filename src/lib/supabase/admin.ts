import { createClient } from "@supabase/supabase-js";

/** 서비스 롤 클라이언트 (RLS 우회) — 서버 전용. 브라우저 코드에서 import 하지 말 것 */
export function getAdminSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
