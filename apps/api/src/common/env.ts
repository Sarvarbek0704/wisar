/**
 * Muhit o'zgaruvchilari validatsiyasi — production'da kritik sirlar bo'lmasa ilova
 * ISHGA TUSHMAYDI (fail-fast). Dev'da faqat ogohlantiradi.
 * main.ts da NestFactory.create dan OLDIN chaqiriladi.
 */
export function validateEnv(): void {
  const isProd = process.env.NODE_ENV === "production";

  // Production'da majburiy sirlar
  const required = ["DATABASE_URL", "JWT_SECRET"];
  const missing = required.filter((k) => !process.env[k]?.trim());

  // Zaif/standart qiymatlarni rad etamiz (prod'da)
  const weak: string[] = [];
  const secret = process.env.JWT_SECRET?.trim() ?? "";
  if (secret && (secret === "wisar-dev-secret" || secret.length < 32)) {
    weak.push("JWT_SECRET juda qisqa/zaif (kamida 32 belgi tasodifiy satr bo'lsin)");
  }

  const problems = [
    ...missing.map((k) => `${k} sozlanmagan`),
    ...weak,
  ];

  if (problems.length === 0) return;

  const msg = "Muhit sozlamalari muammosi:\n  - " + problems.join("\n  - ");
  if (isProd) {
    // Fail-fast — prod'da zaif/yetishmayotgan sir bilan ishga tushirmaymiz
    // eslint-disable-next-line no-console
    console.error("[ENV] " + msg);
    process.exit(1);
  } else {
    // eslint-disable-next-line no-console
    console.warn("[ENV] DIQQAT (dev):\n" + msg + "\n  (production'da bu ishga tushirishni to'xtatadi)");
  }
}
