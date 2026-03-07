import OpenAI from "openai";
import { PRICEBOOK } from "../../lib/pricing/pricebook";

export const runtime = "nodejs";

type EstimateAIResult = {
  summary: string;
  assumptions: string[];
  materialsFound: Array<{
    item: string;
    qty: number;
    unit: string;
    notes?: string;
  }>;
  laborFactors: {
    jobType: string;
    deviceCount: number;
    runLengthFt: number;
    access: "open" | "attic" | "crawlspace" | "finished";
    panelWork: boolean;
    difficulty: "easy" | "standard" | "hard";
  };
  materialFactors: {
    jobType: string;
    deviceCount: number;
    runLengthFt: number;
    amperage: number;
    voltage: number;
    access: "open" | "attic" | "crawlspace" | "finished";
    panelWork: boolean;
    wiringMethod: "nm" | "mc" | "emt" | "pvc" | "unknown";
    terminationType: "hardwired" | "receptacle" | "switch" | "light" | "unknown";
    wetLocation: boolean;
  };
};

type PricebookItem = {
  skuKey: string;
  name: string;
  unit: string;
  baseUnitCost: number;
};

type NormalizedMaterial = {
  skuKey: string;
  qty: number;
  unit?: string;
  name?: string;
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

function normalizeMaterials(materials: NormalizedMaterial[]): NormalizedMaterial[] {
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

function calculateLaborHours(factors: EstimateAIResult["laborFactors"]): number {
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
  const deviceAdder = Math.max(0, safeFactors.deviceCount - 1) * 0.35;
  const runAdder = Math.max(0, safeFactors.runLengthFt) * 0.02;

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

function buildMaterialsFromFactors(
  factors: EstimateAIResult["materialFactors"]
): NormalizedMaterial[] {
  const items: NormalizedMaterial[] = [];

  const add = (skuKey: string, qty: number) => {
    const match = PRICEBOOK_MAP.get(skuKey);
    if (!match || qty <= 0) return;

    items.push({
      skuKey: match.skuKey,
      qty: clampQty(qty),
      unit: match.unit,
      name: match.name,
    });
  };

  if (factors.jobType === "ev_charger") {
    if (factors.panelWork) {
      if (factors.amperage >= 60) add("brkr_2p_60", 1);
      else if (factors.amperage >= 50) add("brkr_2p_50", 1);
      else if (factors.amperage >= 40) add("brkr_2p_40", 1);
      else add("brkr_2p_30", 1);
    }

    if (factors.terminationType === "receptacle") {
      if (factors.amperage >= 50) add("recept_14_50", 1);
      else add("recept_6_50", 1);

      add("box_4sq_2_1_8", 1);
      add("mudring_1g", 1);
    }

    if (factors.wiringMethod === "nm") {
      // Only add keys that actually exist in your pricebook
      if (factors.amperage >= 50) {
        // nmb_6_2 was not shown in your earlier pricebook, so skipped for now
      } else {
        add("nmb_10_2", Math.ceil(factors.runLengthFt * 1.1));
      }
    }

    if (factors.wiringMethod === "emt") {
      const run = Math.ceil(factors.runLengthFt * 1.1);

      add("emt_3_4", run);
      add("connector_emt_3_4", 2);
      add("coupling_emt_3_4", Math.max(1, Math.ceil(run / 10) - 1));
      add("strap_emt_3_4", Math.max(2, Math.ceil(run / 6)));

      if (factors.amperage >= 60) add("thhn_6_black", run * 2);
      else if (factors.amperage >= 50) add("thhn_8_black", run * 2);
      else add("thhn_10_black", run * 2);
    }

    if (factors.wetLocation) {
      add("wp_cover_1g", 1);
    }

    add("wirenut_red", 4);
    add("tape_electrical", 1);
  }

  return normalizeMaterials(items);
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
- materialsFound
- laborFactors
- materialFactors

Do NOT estimate final labor hours.

Instead extract the labor-driving variables:
- jobType (example: ev_charger, receptacle_install, lighting_upgrade)
- deviceCount (number of devices being installed or worked on)
- runLengthFt (approximate wire run length)
- access (open | attic | crawlspace | finished)
- panelWork (true if breaker/panel work required)
- difficulty (easy | standard | hard)

Also extract the material-driving variables:
- jobType
- deviceCount
- runLengthFt
- amperage
- voltage
- access (open | attic | crawlspace | finished)
- panelWork
- wiringMethod (nm | mc | emt | pvc | unknown)
- terminationType (hardwired | receptacle | switch | light | unknown)
- wetLocation (true | false)

Rules:
- Do NOT include pricing.
- Use conservative assumptions.
- Return ONLY valid JSON matching the schema.
- Build materialsFound as if checking these categories: primary equipment, wiring/raceway, boxes/support, fittings/connectors, termination hardware, covers/plates, consumables.- Include primary materials, boxes, fittings, connectors, supports, covers, termination hardware, and consumables likely needed to complete the scope.
- For installation scopes, materialsFound should usually contain at least 8 items unless the job is truly very small.
- Do NOT return only major items.
- If a typical support item would normally be needed to complete the installation, include it.
- Do NOT invent prices.

Approved catalog reference:
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
              required: [
                "summary",
                "assumptions",
                "materialsFound",
                "laborFactors",
                "materialFactors",
              ],
              properties: {
                summary: { type: "string" },
                assumptions: {
                  type: "array",
                  items: { type: "string" },
                },
                materialsFound: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
required: ["item", "qty", "unit", "notes"],                    properties: {
                      item: { type: "string" },
                      qty: { type: "number" },
                      unit: { type: "string" },
                      notes: { type: "string" },
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
                materialFactors: {
                  type: "object",
                  additionalProperties: false,
                  required: [
                    "jobType",
                    "deviceCount",
                    "runLengthFt",
                    "amperage",
                    "voltage",
                    "access",
                    "panelWork",
                    "wiringMethod",
                    "terminationType",
                    "wetLocation",
                  ],
                  properties: {
                    jobType: { type: "string" },
                    deviceCount: { type: "number" },
                    runLengthFt: { type: "number" },
                    amperage: { type: "number" },
                    voltage: { type: "number" },
                    access: {
                      type: "string",
                      enum: ["open", "attic", "crawlspace", "finished"],
                    },
                    panelWork: { type: "boolean" },
                    wiringMethod: {
                      type: "string",
                      enum: ["nm", "mc", "emt", "pvc", "unknown"],
                    },
                    terminationType: {
                      type: "string",
                      enum: ["hardwired", "receptacle", "switch", "light", "unknown"],
                    },
                    wetLocation: { type: "boolean" },
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

    const materialsFound = Array.isArray(parsed.materialsFound)
      ? parsed.materialsFound
          .filter(
            (
              x: unknown
            ): x is { item: string; qty: number; unit: string; notes?: string } =>
              !!x &&
              typeof x === "object" &&
              typeof (x as { item?: unknown }).item === "string" &&
              typeof (x as { unit?: unknown }).unit === "string"
          )
          .map((m: { item: string; qty: number; unit: string; notes?: string }) => ({
            item: m.item.trim(),
            qty: Number.isFinite(m.qty) ? Math.max(0, Number(m.qty)) : 0,
            unit: m.unit.trim(),
            notes: typeof m.notes === "string" ? m.notes.trim() : undefined,
          }))
      : [];
console.log("[/api/estimate] materialsFound sample:", materialsFound);

    const materialFactors: EstimateAIResult["materialFactors"] = {
      jobType:
        typeof parsed.materialFactors?.jobType === "string"
          ? parsed.materialFactors.jobType
          : "general",
      deviceCount: Number.isFinite(parsed.materialFactors?.deviceCount)
        ? Math.max(1, Number(parsed.materialFactors.deviceCount))
        : 1,
      runLengthFt: Number.isFinite(parsed.materialFactors?.runLengthFt)
        ? Math.max(0, Number(parsed.materialFactors.runLengthFt))
        : 0,
      amperage: Number.isFinite(parsed.materialFactors?.amperage)
        ? Math.max(0, Number(parsed.materialFactors.amperage))
        : 0,
      voltage: Number.isFinite(parsed.materialFactors?.voltage)
        ? Math.max(0, Number(parsed.materialFactors.voltage))
        : 0,
      access:
        parsed.materialFactors?.access === "attic" ||
        parsed.materialFactors?.access === "crawlspace" ||
        parsed.materialFactors?.access === "finished"
          ? parsed.materialFactors.access
          : "open",
      panelWork: Boolean(parsed.materialFactors?.panelWork),
      wiringMethod:
        parsed.materialFactors?.wiringMethod === "nm" ||
        parsed.materialFactors?.wiringMethod === "mc" ||
        parsed.materialFactors?.wiringMethod === "emt" ||
        parsed.materialFactors?.wiringMethod === "pvc"
          ? parsed.materialFactors.wiringMethod
          : "unknown",
      terminationType:
        parsed.materialFactors?.terminationType === "hardwired" ||
        parsed.materialFactors?.terminationType === "receptacle" ||
        parsed.materialFactors?.terminationType === "switch" ||
        parsed.materialFactors?.terminationType === "light"
          ? parsed.materialFactors.terminationType
          : "unknown",
      wetLocation: Boolean(parsed.materialFactors?.wetLocation),
    };

    const factorMaterials = buildMaterialsFromFactors(materialFactors);
    const materials = normalizeMaterials([...factorMaterials]);

    const laborFactors: EstimateAIResult["laborFactors"] = {
      jobType:
        typeof parsed.laborFactors?.jobType === "string"
          ? parsed.laborFactors.jobType
          : "general",
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

    console.log("[/api/estimate] materialsFound count:", materialsFound.length);
    console.log("[/api/estimate] material count after normalize:", materials.length);
    console.log("[/api/estimate] calculated labor hours:", laborHours);

    return Response.json({
      summary:
        typeof parsed.summary === "string" && parsed.summary.trim()
          ? parsed.summary.trim()
          : "Electrical scope generated from job description.",
      assumptions,
      materialsFound,
      materials,
      laborFactors,
      materialFactors,
      laborHours,
    });
  } catch (err: any) {
    console.error("[/api/estimate] error:", err);
    const msg = err?.message ?? "Server error";
    const status = String(msg).includes("timed out") ? 504 : 500;
    return Response.json({ error: msg }, { status });
  }
}