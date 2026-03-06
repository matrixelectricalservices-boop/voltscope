import OpenAI from "openai";
import { PRICEBOOK } from "../../lib/pricing/pricebook";

export const runtime = "nodejs";

type EstimateAIResult = {
  summary: string;
  assumptions: string[];
  laborHours: number;
  materials: Array<{
    skuKey: string;
    qty: number;
    unit?: string;
    name?: string;
  }>;
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
- laborHours
- materials

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
              required: ["summary", "assumptions", "laborHours", "materials"],
              properties: {
                summary: { type: "string" },
                assumptions: {
                  type: "array",
                  items: { type: "string" },
                },
                laborHours: { type: "number" },
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

    const laborHours = Number.isFinite(parsed.laborHours)
      ? Math.max(0, Number(parsed.laborHours))
      : 0;

    const assumptions = Array.isArray(parsed.assumptions)
      ? parsed.assumptions
          .filter((x: unknown): x is string => typeof x === "string" && x.trim().length > 0)
          .slice(0, 3)
      : [];

    const materials = normalizeMaterials(parsed.materials);

    console.log("[/api/estimate] material count after normalize:", materials.length);

    return Response.json({
      summary:
        typeof parsed.summary === "string" && parsed.summary.trim()
          ? parsed.summary.trim()
          : "Electrical scope generated from job description.",
      assumptions,
      laborHours,
      materials,
    });
  } catch (err: any) {
    console.error("[/api/estimate] error:", err);
    const msg = err?.message ?? "Server error";
    const status = String(msg).includes("timed out") ? 504 : 500;
    return Response.json({ error: msg }, { status });
  }
}