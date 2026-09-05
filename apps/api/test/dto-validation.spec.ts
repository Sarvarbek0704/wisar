import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { getMetadataStorage } from "class-validator";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Global ValidationPipe `whitelist: true` bilan ishlaydi — bu VALIDATOR
 * DEKORATORI YO'Q maydonlarni jimgina o'chirib tashlaydi.
 *
 * Shu sababli uchta endpoint prod'da oylab ishlamadi:
 *   POST /flashcards/review  → har doim 400 (FlashcardReview jadvali bo'sh qoldi)
 *   PUT  /planner/:date      → Prisma 500
 *   PUT  /planner/habits     → standart qiymatlar yozildi, foydalanuvchi ma'lumoti yo'qoldi
 *
 * Servis darajasidagi testlar buni ushlay olmaydi — nosozlik HTTP qatlamida.
 * Quyidagi ikki test shu sinfni butunlay yopadi.
 */

const SRC = join(__dirname, "..", "src");

/** src ichidagi barcha .ts fayllarni rekursiv yig'adi. */
function collectSources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) collectSources(full, out);
    else if (name.endsWith(".ts") && !name.endsWith(".spec.ts")) out.push(full);
  }
  return out;
}

describe("DTO validatsiyasi", () => {
  it("har bir @Body() DTO klassining HAR maydonida validator dekoratori bor", () => {
    const files = collectSources(SRC);
    const storage = getMetadataStorage();
    const problems: string[] = [];

    for (const file of files) {
      const text = readFileSync(file, "utf8");
      // @Body() bilan ishlatiladigan DTO klass nomlarini topamiz.
      const usedAsBody = new Set(
        [...text.matchAll(/@Body\(\)\s*\w+\s*:\s*(\w+)/g)].map((m) => m[1]),
      );
      if (!usedAsBody.size) continue;

      // Shu fayldagi (yoki import qilingan) klass ta'riflarini maydonlari bilan olamiz.
      for (const cls of usedAsBody) {
        const declRe = new RegExp(`class\\s+${cls}\\s*\\{([\\s\\S]*?)\\n\\}`, "m");
        const decl = text.match(declRe);
        if (!decl) continue; // boshqa faylda e'lon qilingan — o'sha fayl tekshiriladi

        const body = decl[1];
        // "name!: type" yoki "name?: type" ko'rinishidagi maydonlar
        const fields = [...body.matchAll(/^\s*(?:@[\s\S]*?\n\s*)*(\w+)[!?]?\s*:/gm)].map(
          (m) => m[1],
        );
        for (const field of fields) {
          const hasDecorator = storage
            .getTargetValidationMetadatas(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              {} as any,
              cls,
              false,
              false,
            )
            .some((m) => m.propertyName === field);
          // Metadata reflection klassni import qilmasdan ishonchli emas —
          // shuning uchun matn darajasida ham tekshiramiz: maydon oldida @Is.../@Min... bo'lsinmi.
          const fieldRe = new RegExp(
            `((?:@\\w+\\([^)]*\\)\\s*)*)\\s*${field}[!?]?\\s*:`,
            "m",
          );
          const m = body.match(fieldRe);
          const decorators = m?.[1] ?? "";
          if (!hasDecorator && !/@(Is|Min|Max|Length|Matches|Type|Transform|Allow|ValidateNested|ArrayM)/.test(decorators)) {
            problems.push(`${cls}.${field} (${file.replace(SRC, "src")})`);
          }
        }
      }
    }

    expect(problems).toEqual([]);
  });

  it("dekoratorsiz maydon ValidationPipe tomonidan o'chiriladi (regressiya isboti)", async () => {
    class DecoratedDto {
      // eslint-disable-next-line @typescript-eslint/no-inferrable-types
      value!: string;
    }
    // Ataylab dekoratorsiz — pipe uni o'chirib tashlashi KERAK.
    const pipe = new ValidationPipe({ whitelist: true, transform: true });
    const result = await pipe.transform(
      { value: "salom" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { type: "body", metatype: DecoratedDto } as any,
    );
    // Bu xatti-harakat aynan yuqoridagi testni zarur qiladi.
    expect(result).toEqual({});
  });
});
