/**
 * 모델 출력에서 펜스 제거
 */
export function stripLeadingFence(text) {
  const s = text.trim();
  const m = s.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/);
  if (m) return m[1].trimEnd();
  return s;
}
