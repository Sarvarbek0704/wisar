/**
 * AI matn javobidan JSON ajratib olish (sof funksiya — testlanadigan).
 * Model ba'zan ```json ... ``` fence yoki qo'shimcha matn bilan qaytaradi —
 * shu sababli fence va birinchi `{` ... oxirgi `}` orasidagi qismni olamiz.
 */
export function parseJson<T>(text: string): T {
  let s = (text ?? "").trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  const arrStart = s.indexOf("[");
  const arrEnd = s.lastIndexOf("]");
  // JSON massiv bo'lsa ham qo'llab-quvvatlaymiz
  if (arrStart !== -1 && (start === -1 || arrStart < start)) {
    if (arrEnd !== -1) s = s.slice(arrStart, arrEnd + 1);
  } else if (start !== -1 && end !== -1) {
    s = s.slice(start, end + 1);
  }
  return JSON.parse(s) as T;
}
