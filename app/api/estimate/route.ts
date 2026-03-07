import OpenAI from "openai";
import { PRICEBOOK } from "../../lib/pricing/pricebook";

export const runtime = "nodejs";

type EstimateAIResult = {
  summary: string;
  assumptions: string[];
  materials: Array<{
    skuKey: string;
    qty: number;
    unit?: string;
    name?: string;
  }>;
  laborFactors: {
    jobType: string;
    deviceCount: number;
    runLengthFt: number;
    access: "open" | "attic" | "crawlspace" | "finished";
    panelWork: boolean;
    difficulty: "easy" | "standard" | "hard";
  };
};

type PricebookItem = {
  skuKey: string;
  name: string;
  unit: string;
  baseUnitCost: number;
};

const PRICEBOOK_ITEMS: PricebookItem[] = Array.isArray(PRICEBOOK.items)
  ? [...PRICEBOOK.items]
  : [];

const PRICEBOOK_MAP = new Map(
  PRICEBOOK_ITEMS.map((item) => [item.skuKey, item] as const)
);

function clampQty(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(9999, Math.round(n * 100) / 100);
}

function normalizeMaterials(
  materials: EstimateAIResult["materials"]
): EstimateAIResult["materials"] {
  if (!Array.isArray(materials)) return [];

  const merged = new Map<
    string,
    { skuKey: string; qty: number; unit: string; name: string }
  >();

  for (const m of materials) {
    if (!m || typeof m.skuKey !== "string") continue;

    const skuKey = m.skuKey.trim();
    const match = PRICEBOOK_MAP.get(skuKey);
    if (!match) continue;

    const qty = clampQty(m.qty);
    const existing = merged.get(skuKey);

    if (existing) {
      existing.qty += qty;
    } else {
      merged.set(skuKey, {
        skuKey: match.skuKey,
        qty,
        unit: match.unit,
        name: match.name,
      });
    }
  }

  return Array.from(merged.values());
}

function calculateLaborHours(
  factors: EstimateAIResult["laborFactors"]
): number {
  const baseByJobType: Record<string, number> = {
    ev_charger: 2.5,
    receptacle_install: 1.0,
    lighting_upgrade: 1.5,
    switch_install: 0.75,
    panel_work: 2.0,
    troubleshooting: 2.0,
  };

  const safeFactors = {
    jobType: factors?.jobType ?? "",
    deviceCount: Number(factors?.deviceCount ?? 1),
    runLengthFt: Number(factors?.runLengthFt ?? 0),
    access: factors?.access ?? "open",
    panelWork: Boolean(factors?.panelWork),
    difficulty: factors?.difficulty ?? "standard",
  };

  const base = baseByJobType[safeFactors.jobType] ?? 1.5;

  const deviceAdder =
    Math.max(0, safeFactors.deviceCount - 1) * 0.35;

  const runAdder =
    Math.max(0, safeFactors.runLengthFt) * 0.02;

  const accessAdder =
    safeFactors.access === "attic"
      ? 0.75
      : safeFactors.access === "crawlspace"
      ? 0.75
      : safeFactors.access === "finished"
      ? 1.0
      : 0;

  const panelAdder = safeFactors.panelWork ? 0.75 : 0;

  const difficultyMultiplier =
    safeFactors.difficulty === "easy"
      ? 0.9
      : safeFactors.difficulty === "hard"
      ? 1.25
      : 1;

  const total =
    (base + deviceAdder + runAdder + accessAdder + panelAdder) *
    difficultyMultiplier;

  return Math.max(0.5, Math.round(total * 100) / 100);
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "OPENAI_API_KEY is not set in environment variables." },
        { status: 500 }
      );
    }

    const body = (await req.json()) as { description?: string };
    const description = (body.description ?? "").trim();

    if (!description) {
      return Response.json({ error: "Missing description" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey });

    console.log("[/api/estimate] start");
    console.log("[/api/estimate] description chars:", description.length);

    const t0 = Date.now();
    const OPENAI_TIMEOUT_MS = 25_000;

    const catalogForPrompt = PRICEBOOK_ITEMS.map(
      (item) => `${item.skuKey} | ${item.unit} | ${item.name}`
    ).join("\n");

    const res = (await Promise.race([
      client.responses.create({
        model: "gpt-5-mini",
        reasoning: { effort: "minimal" },
        max_output_tokens: 1800,
        instructions: `
You are an electrical estimating assistant.

Convert the user's job description into:
- summary
- assumptions
- materials
- laborFactors

Do NOT estimate final labor hours.

Instead extract the labor-driving variables:
- jobType (example: ev_charger, receptacle_install, lighting_upgrade)
- deviceCount (number of devices being installed or worked on)
- runLengthFt (approximate wire run length)
- access (open | attic | crawlspace | finished)
- panelWork (true if breaker/panel work required)
- difficulty (easy | standard | hard)

Rules:
- Do NOT include pricing.
- Use conservative assumptions.
- Return ONLY valid JSON matching the schema.
- Each material MUST include skuKey, qty, unit, and name.
- You MUST choose skuKey values ONLY from the approved catalog below.
- Do NOT invent skuKeys.
- If no exact match exists, leave that material out.

Approved catalog:
${catalogForPrompt}
        `.trim(),
        input: [
          {
            role: "user",
            content: [{ type: "input_text", text: description }],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "estimate_result",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["summary", "assumptions", "materials", "laborFactors"],
              properties: {
                summary: { type: "string" },
                assumptions: {
                  type: "array",
                  items: { type: "string" },
                },
                materials: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["skuKey", "qty", "unit", "name"],
                    properties: {
                      skuKey: { type: "string" },
                      qty: { type: "number" },
                      unit: { type: "string" },
                      name: { type: "string" },
                    },
                  },
                },
                laborFactors: {
                  type: "object",
                  additionalProperties: false,
                  required: [
                    "jobType",
                    "deviceCount",
                    "runLengthFt",
                    "access",
                    "panelWork",
                    "difficulty",
                  ],
                  properties: {
                    jobType: { type: "string" },
                    deviceCount: { type: "number" },
                    runLengthFt: { type: "number" },
                    access: {
                      type: "string",
                      enum: ["open", "attic", "crawlspace", "finished"],
                    },
                    panelWork: { type: "boolean" },
                    difficulty: {
                      type: "string",
                      enum: ["easy", "standard", "hard"],
                    },
                  },
                },
              },
            },
          },
        },
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("OpenAI request timed out")), OPENAI_TIMEOUT_MS)
      ),
    ])) as any;

    console.log("[/api/estimate] openai done ms:", Date.now() - t0);

    const rawText = res?.output_text as string | undefined;
    const parsed =
      res?.output_parsed ??
      (rawText ? (JSON.parse(rawText) as EstimateAIResult) : null);

    if (!parsed) {
      return Response.json(
        { error: "No structured output returned" },
        { status: 502 }
      );
    }

    const assumptions = Array.isArray(parsed.assumptions)
      ? parsed.assumptions
          .filter((x: unknown): x is string => typeof x === "string" && x.trim().length > 0)
          .slice(0, 3)
      : [];

    const materials = normalizeMaterials(parsed.materials);

    const laborFactors: EstimateAIResult["laborFactors"] = {
      jobType: typeof parsed.laborFactors?.jobType === "string" ? parsed.laborFactors.jobType : "general",
      deviceCount: Number.isFinite(parsed.laborFactors?.deviceCount)
        ? Math.max(1, Number(parsed.laborFactors.deviceCount))
        : 1,
      runLengthFt: Number.isFinite(parsed.laborFactors?.runLengthFt)
        ? Math.max(0, Number(parsed.laborFactors.runLengthFt))
        : 0,
      access:
        parsed.laborFactors?.access === "attic" ||
        parsed.laborFactors?.access === "crawlspace" ||
        parsed.laborFactors?.access === "finished"
          ? parsed.laborFactors.access
          : "open",
      panelWork: Boolean(parsed.laborFactors?.panelWork),
      difficulty:
        parsed.laborFactors?.difficulty === "easy" ||
        parsed.laborFactors?.difficulty === "hard"
          ? parsed.laborFactors.difficulty
          : "standard",
    };

    const laborHours = calculateLaborHours(laborFactors);

    console.log("[/api/estimate] material count after normalize:", materials.length);
    console.log("[/api/estimate] calculated labor hours:", laborHours);

    return Response.json({
      summary:
        typeof parsed.summary === "string" && parsed.summary.trim()
          ? parsed.summary.trim()
          : "Electrical scope generated from job description.",
      assumptions,
      materials,
      laborFactors,
      laborHours,
    });
  } catch (err: any) {
    console.error("[/api/estimate] error:", err);
    const msg = err?.message ?? "Server error";
    const status = String(msg).includes("timed out") ? 504 : 500;
    return Response.json({ error: msg }, { status });
  }
}