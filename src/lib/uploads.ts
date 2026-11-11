/* 이미지 업로드 규칙 — 브라우저(미리 검사)와 서버(발급 시 검사)가 같이 쓴다 */
export const IMAGE_BUCKET = "class-images";
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
export type ImageSlot = "thumb" | "banner" | "detail";
