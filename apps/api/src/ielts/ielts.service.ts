import { Injectable, BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import { LlmService } from "../llm/llm.service";
import { PrismaService } from "../prisma.service";

type UploadedAudio = { buffer: Buffer; mimetype?: string; originalname?: string };
export type Skill = "writing" | "speaking" | "reading" | "listening";

/**
 * AI IELTS Coach — markazlashtirilgan LlmService orqali IELTS band baholash (17-vazifa DRY).
 * Yozma (Writing Task 1/2) va og'zaki (Speaking Part 1-3) javoblarni
 * rasmiy 4 mezon bo'yicha baholaydi: band + izoh + tuzatish + namuna.
 *
 * Provayder: BEPUL OpenAI-mos (LLM_*) yoki ANTHROPIC_API_KEY (LlmService boshqaradi).
 */

export type Criterion = { name: string; band: number; comment: string };
export type Correction = { original: string; better: string; why: string };

export type WritingScore = {
  overallBand: number;
  criteria: Criterion[];
  strengths: string[];
  improvements: string[];
  corrections: Correction[];
  modelAnswer: string;
  wordCount: number;
};

export type SpeakingScore = {
  overallBand: number;
  criteria: Criterion[];
  strengths: string[];
  improvements: string[];
  corrections: Correction[];
  modelAnswer: string;
};

export type PracticeQuestion = {
  type: string; // "TFNG" | "MCQ" | "completion" | "heading"
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
};
export type ReadingTest = { title: string; passage: string; questions: PracticeQuestion[] };
export type ListeningTest = { title: string; script: string; questions: PracticeQuestion[] };

@Injectable()
export class IeltsService {
  constructor(
    private readonly llm: LlmService,
    private readonly prisma: PrismaService,
  ) {}

  private ask(system: string, user: string, maxTokens = 3000, jsonMode = false): Promise<string> {
    return this.llm.ask(system, user, maxTokens, jsonMode);
  }

  private parseJson<T>(text: string): T {
    return this.llm.parseJson<T>(text);
  }

  // ─── Audio → transcript (20-vazifa, Whisper OpenAI-mos) ──────────────────────
  async transcribe(file: UploadedAudio): Promise<{ text: string }> {
    const base = process.env.WHISPER_BASE_URL?.trim();
    const key = process.env.WHISPER_API_KEY?.trim();
    const model = process.env.WHISPER_MODEL?.trim() || "whisper-large-v3";
    if (!base || !key) {
      throw new ServiceUnavailableException(
        "Whisper sozlanmagan (WHISPER_* env). Transkripsiyani qo'lda kiriting.",
      );
    }
    if (!file?.buffer?.length) throw new BadRequestException("Audio fayl yo'q.");

    const form = new FormData();
    form.append(
      "file",
      new Blob([file.buffer], { type: file.mimetype || "audio/webm" }),
      file.originalname || "audio.webm",
    );
    form.append("model", model);
    form.append("language", "en");

    let res: Response;
    try {
      res = await fetch(base.replace(/\/+$/, "") + "/audio/transcriptions", {
        method: "POST",
        headers: { authorization: `Bearer ${key}` },
        body: form,
      });
    } catch (e) {
      throw new ServiceUnavailableException("Whisper xizmatiga ulanib bo'lmadi: " + (e as Error).message);
    }
    if (!res.ok) {
      throw new ServiceUnavailableException(`Whisper xatosi (${res.status}): ${(await res.text()).slice(0, 200)}`);
    }
    const data = (await res.json()) as { text?: string };
    return { text: data.text ?? "" };
  }

  // ─── IELTS urinishlarini serverda saqlash (20,30-vazifa) ─────────────────────
  async saveAttempt(
    userId: string,
    skill: Skill,
    band: number,
    detail: unknown,
    part?: string,
  ) {
    return this.prisma.ieltsAttempt.create({
      data: { userId, skill, part: part ?? null, band, detail: JSON.stringify(detail) },
    });
  }

  async attempts(userId: string) {
    const rows = await this.prisma.ieltsAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, skill: true, part: true, band: true, createdAt: true },
    });
    return rows;
  }

  // ── IELTS band deskriptorlari (baholash mezoni) ───────────────────────
  private readonly WRITING_RUBRIC = `IELTS Writing 9-band deskriptorlari (4 mezon, har biri 0-9, 0.5 qadam):
1. Task Achievement (Task 1) / Task Response (Task 2): savolga to'liq javob, aniq pozitsiya, to'liq rivojlangan g'oyalar, (Task1) overview/key features.
2. Coherence & Cohesion: mantiqiy oqim, paragraflar, kogeziya "attracts no attention" (band 9), connective over-use jazolanadi.
3. Lexical Resource: kam uchraydigan/aniq lug'at, tabiiy kollokatsiya, xatosiz, register.
4. Grammatical Range & Accuracy: to'liq tuzilma range, deyarli xatosiz.
Band 9 = "expert user" (native-daraja). Halol, qattiq, lekin adolatli baho ber — IELTS imtihonchisi kabi.`;

  private readonly SPEAKING_RUBRIC = `IELTS Speaking 9-band deskriptorlari (4 mezon, har biri 0-9, 0.5 qadam):
1. Fluency & Coherence: ravonlik, pauza/tuzatishsiz, mantiqiy, diskurs markerlari.
2. Lexical Resource: aniq, idiomatik, kam uchraydigan lug'at, paraphrase.
3. Grammatical Range & Accuracy: to'liq range, murakkab tuzilmalar, aniqlik.
4. Pronunciation: tushunarlilik, urg'u/ritm/intonatsiya (aksent o'zi muammo emas).
Eslatma: matn (transcript) bo'yicha baholaganda, Pronunciation'ni faqat taxminiy baho (matnda ko'rinmaydi) — buni izohda ayt.
Band 9 = native-daraja. Halol baho ber.`;

  private readonly OUTPUT_FORMAT = `JAVOBNI FAQAT shu JSON formatda qaytar (boshqa matn YO'Q):
{
  "overallBand": <umumiy band, 4 mezon o'rtachasi 0.5 ga yaxlitlangan>,
  "criteria": [{"name": "<mezon nomi>", "band": <0-9>, "comment": "<o'zbekcha qisqa izoh>"}],
  "strengths": ["<kuchli tomon (o'zbekcha)>", ...],
  "improvements": ["<yaxshilash kerak (o'zbekcha, aniq maslahat)>", ...],
  "corrections": [{"original": "<asl ingliz iborasi>", "better": "<yaxshiroq ingliz>", "why": "<o'zbekcha sabab>"}],
  "modelAnswer": "<band 9 namuna javob (inglizcha) — qisqa, o'rnak>"
}
Izohlar O'ZBEKCHA, misollar/tuzatishlar INGLIZCHA. corrections: 3-6 ta eng muhim. modelAnswer: foydalanuvchi savoliga band-9 namuna.`;

  /** Writing (Task 1 yoki 2) javobini baholaydi. */
  async scoreWriting(task: 1 | 2, prompt: string, essay: string, userId?: string): Promise<WritingScore> {
    const trimmed = (essay || "").trim();
    if (trimmed.length < 40) throw new BadRequestException("Esse juda qisqa (kamida 40 belgi).");
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

    const system = `Sen tajribali IELTS imtihonchisisan (examiner). ${this.WRITING_RUBRIC}\n${this.OUTPUT_FORMAT}`;
    const user = `IELTS Academic Writing TASK ${task}.
SAVOL/TOPSHIRIQ:
${prompt || "(topshiriq berilmadi — esse mazmunidan aniqla)"}

FOYDALANUVCHI ESSESI (${wordCount} so'z):
${trimmed}

Yuqoridagi essega 4 mezon bo'yicha IELTS band ber va JSON formatda javob qaytar.`;

    const raw = await this.ask(system, user, 3500, true);
    const parsed = this.parseJson<Omit<WritingScore, "wordCount">>(raw);
    const result = { ...parsed, wordCount };
    if (userId) await this.saveAttempt(userId, "writing", result.overallBand, result, String(task));
    return result;
  }

  /** Speaking javobini (transcript) baholaydi. */
  async scoreSpeaking(
    part: 1 | 2 | 3,
    question: string,
    transcript: string,
    userId?: string,
  ): Promise<SpeakingScore> {
    const trimmed = (transcript || "").trim();
    if (trimmed.length < 20) throw new BadRequestException("Javob juda qisqa (kamida 20 belgi).");

    const system = `Sen tajribali IELTS Speaking imtihonchisisan. ${this.SPEAKING_RUBRIC}\n${this.OUTPUT_FORMAT}`;
    const user = `IELTS Speaking PART ${part}.
SAVOL:
${question || "(savol berilmadi)"}

FOYDALANUVCHI JAVOBI (transcript):
${trimmed}

Bu javobga 4 mezon bo'yicha IELTS Speaking band ber va JSON formatda javob qaytar.`;

    const raw = await this.ask(system, user, 3000, true);
    const result = this.parseJson<SpeakingScore>(raw);
    if (userId) await this.saveAttempt(userId, "speaking", result.overallBand, result, String(part));
    return result;
  }

  /** Writing mashqi uchun topshiriq (prompt) generatsiya qiladi. */
  async generateWritingPrompt(task: 1 | 2, topic?: string): Promise<{ prompt: string }> {
    const system = `You are an IELTS Academic Writing test author. Return ONLY the task prompt itself, in ENGLISH (no explanation, title, numbering or translation).
Task 1: an academic data-description task ("The chart/graph/table below shows... Summarise the information by selecting and reporting the main features, and make comparisons where relevant.").
Task 2: a discursive essay question (one of: opinion / discussion / problem-solution / advantages-disadvantages) ending with the standard instruction such as "Discuss both views and give your own opinion." The whole prompt MUST be in English.`;
    const user = `IELTS Academic Writing Task ${task} uchun ${topic ? `"${topic}" mavzusida ` : ""}bitta real imtihon darajasidagi topshiriq yarat.`;
    const prompt = (await this.ask(system, user, 400)).trim();
    return { prompt };
  }

  /** Speaking mashqi uchun savol/cue card generatsiya qiladi. */
  async generateSpeakingPrompt(part: 1 | 2 | 3, topic?: string): Promise<{ question: string }> {
    const system = `Sen IELTS Speaking imtihonchisisan. Faqat bitta savol/topshiriq qaytar (qo'shimcha matnsiz).
Part 1: tanish mavzuda oddiy savol. Part 2: cue card ("Describe..." + 3-4 bullet + "You should say:"). Part 3: abstrakt/munozarali savol.`;
    const user = `IELTS Speaking Part ${part} uchun ${topic ? `"${topic}" mavzusida ` : ""}bitta savol/cue card yarat.`;
    const question = (await this.ask(system, user, 400)).trim();
    return { question };
  }

  private readonly QUESTION_FORMAT = `Har savol JSON obyekti:
{"type": "TFNG"|"MCQ"|"completion", "question": "<savol (inglizcha)>", "options": ["<A>","<B>","<C>","<D>"] (faqat MCQ uchun), "answer": "<to'g'ri javob>", "explanation": "<o'zbekcha qisqa izoh: nega shu javob>"}
- TFNG: answer = "TRUE" | "FALSE" | "NOT GIVEN" (IELTS qoidasi: FALSE=matnga ZID, NOT GIVEN=matnda YO'Q).
- MCQ: options 4 ta, answer = to'g'ri variant matni.
- completion: bo'sh joyni to'ldirish, answer = 1-3 so'z (matndan).`;

  /** IELTS Academic Reading mashq testi generatsiya qiladi (passage + savollar). */
  async generateReading(topic?: string): Promise<ReadingTest> {
    const system = `Sen IELTS Academic Reading test muallifisan. Bitta akademik matn (~600-750 so'z, B2-C1 darajada, qiziqarli, faktik) va 10 ta savol yarat (turlar aralash: bir nechta TFNG, MCQ, completion).
${this.QUESTION_FORMAT}
JAVOBNI FAQAT shu JSON formatda qaytar:
{"title": "<sarlavha>", "passage": "<to'liq matn (inglizcha, paragraflar \\n\\n bilan)>", "questions": [ ... ]}`;
    const user = `IELTS Academic Reading mashq testi yarat${topic ? ` "${topic}" mavzusida` : ""}. 10 savol.`;
    const raw = await this.ask(system, user, 4000, true);
    return this.parseJson<ReadingTest>(raw);
  }

  /** IELTS Listening mashqi generatsiya qiladi (skript TTS uchun + savollar). */
  async generateListening(topic?: string): Promise<ListeningTest> {
    const system = `Sen IELTS Listening test muallifisan. Bitta tabiiy gaplashuv yoki monolog SKRIPTI (~250-350 so'z, og'zaki uslub, ismlar/raqamlar bilan) va 8 ta savol yarat (turlar aralash: completion ko'p, MCQ).
${this.QUESTION_FORMAT}
ESLATMA: bu brauzer TTS (sun'iy ovoz) bilan o'qiladi — real imtihon audiosi emas (real audio uchun Cambridge IELTS).
JAVOBNI FAQAT shu JSON formatda qaytar:
{"title": "<sarlavha>", "script": "<to'liq og'zaki skript (inglizcha)>", "questions": [ ... ]}`;
    const user = `IELTS Listening mashqi yarat${topic ? ` "${topic}" mavzusida` : ""}. 8 savol.`;
    const raw = await this.ask(system, user, 3500, true);
    return this.parseJson<ListeningTest>(raw);
  }
}
