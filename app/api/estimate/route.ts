import OpenAI from "openai";

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

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "OPENAI_API_KEY is not set in environment variables." },
        { status: 500 }
      );
    }

    const client = new OpenAI({ apiKey });

    const body = (await req.json()) as { description?: string };
    const description = (body.description ?? "").trim();

    if (!description) {
      return Response.json({ error: "Missing description" }, { status: 400 });
    }

    // ── DEBUG LOGS ─────────────────────────────────────────────
    console.log("[/api/estimate] start");
    console.log("[/api/estimate] description chars:", description.length);
    const t0 = Date.now();
    // ───────────────────────────────────────────────────────────

   const OPENAI_TIMEOUT_MS = 25_000;

const res = await Promise.race([
  client.responses.create({
    model: "gpt-5-mini",
    reasoning: { effort: "minimal" },
max_output_tokens: 1200,
    instructions:
      "You are an electrical estimating assistant. Convert the job description into a materials list and a labor-hours estimate. Do NOT include pricing. Use conservative assumptions and list them. Each material MUST include: skuKey (snake_case string), qty (number), unit (string), and name (string). Return ONLY valid JSON that matches the schema exactly.",
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
            assumptions: { type: "array", items: { type: "string" } },
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
]) as any;

    console.log("[/api/estimate] openai done ms:", Date.now() - t0);

    // Parse JSON output
    const rawText = (res as any).output_text as string | undefined;
    const parsed =
      (res as any).output_parsed ??
      (rawText ? (JSON.parse(rawText) as EstimateAIResult) : null);

    if (!parsed) {
      return Response.json(
        { error: "No structured output returned" },
        { status: 502 }
      );
    }

    // clamps
    parsed.laborHours = Number.isFinite(parsed.laborHours)
      ? Math.max(0, parsed.laborHours)
      : 0;

    parsed.materials = Array.isArray(parsed.materials)
      ? parsed.materials.map((m: { qty: unknown } & Record<string, any>) => ({
          ...m,
          qty: Number.isFinite(m.qty) ? Math.max(0, Number(m.qty)) : 0,
        }))
      : [];

    console.log("[/api/estimate] returning ok");
    return Response.json(parsed);
  } catch (err: any) {
    console.error("[/api/estimate] error:", err);
const msg = err?.message ?? "Server error";
const status = msg.includes("timed out") ? 504 : 500;
return Response.json({ error: msg }, { status });  }
}