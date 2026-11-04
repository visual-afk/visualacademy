/** Supabase 키가 아직 없으면(로컬 첫 실행·dev 배포 초기) 목업 데이터로 동작한다 */
export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function serviceRoleConfigured(): boolean {
  return supabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
