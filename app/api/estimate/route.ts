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
    amperage: number;
    voltage: number;
    wiringMethod: "nm" | "mc" | "emt" | "pvc" | "unknown";
    terminationType: "hardwired" | "receptacle" | "switch" | "light" | "unknown";
    wetLocation: boolean;
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

console.log("[pricebook] item count:", PRICEBOOK_ITEMS.length);

const PRICEBOOK_MAP = new Map(
  PRICEBOOK_ITEMS.map((item) => [item.skuKey, item] as const)
);

const AI_FALLBACK_PRICE_MAP: Record<
  string,
  { name: string; unit: string; baseUnitCost: number }
> = {
  meter_socket_200a: {
    name: "Meter socket 200A",
    unit: "ea",
    baseUnitCost: 165,
  },
  service_lugs_or_main_200a_panel: {
    name: "Main 200A panel / service lugs",
    unit: "ea",
    baseUnitCost: 245,
  },
  service_conductor_2_0_cu_xhwt: {
    name: "Service conductor 2/0 CU",
    unit: "ft",
    baseUnitCost: 4.5,
  },
  grounding_conductor_4_0_cu_or_2_awg_cu: {
    name: "Grounding conductor",
    unit: "ft",
    baseUnitCost: 1.6,
  },
  ground_rod_8ft: {
    name: "Ground rod 8ft",
    unit: "ea",
    baseUnitCost: 22,
  },
  conduit_rigid_emt_or_pvc: {
    name: "Conduit",
    unit: "ft",
    baseUnitCost: 1.25,
  },
  meter_seal_and_locking_ring: {
    name: "Meter seal / locking ring",
    unit: "ea",
    baseUnitCost: 18,
  },
  service_disconnect_handles_or_cover: {
    name: "Service disconnect handle / cover",
    unit: "ea",
    baseUnitCost: 35,
  },
  lug_kits_and_terminal_connectors: {
    name: "Lug kits / terminal connectors",
    unit: "ea",
    baseUnitCost: 18,
  },
  bonding_jumpers_and_straps: {
    name: "Bonding jumpers / straps",
    unit: "ea",
    baseUnitCost: 12,
  },
  weatherproof_covers_and_box_supports: {
    name: "Weatherproof covers / box supports",
    unit: "ea",
    baseUnitCost: 10,
  },
  fasteners_anchor_bolts: {
    name: "Fasteners / anchor bolts",
    unit: "ea",
    baseUnitCost: 8,
  },
  insulation_tape_and_heat_shrink: {
    name: "Insulation tape / heat shrink",
    unit: "ea",
    baseUnitCost: 12,
  },
  anti_oxidant_compound: {
    name: "Anti-oxidant compound",
    unit: "ea",
    baseUnitCost: 9,
  },
  caulking_sealant: {
    name: "Caulking / sealant",
    unit: "ea",
    baseUnitCost: 7,
  },
  labels_and_panel_directory: {
    name: "Labels / panel directory",
    unit: "ea",
    baseUnitCost: 4,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    const pricebookMatch = PRICEBOOK_MAP.get(skuKey);
    const fallbackMatch = AI_FALLBACK_PRICE_MAP[skuKey];

    if (!pricebookMatch && !fallbackMatch) continue;

    const qty = clampQty(m.qty);
    const existing = merged.get(skuKey);

    if (existing) {
      existing.qty += qty;
    } else {
      merged.set(skuKey, {
        skuKey,
        qty,
        unit: pricebookMatch?.unit ?? fallbackMatch.unit,
        name: pricebookMatch?.name ?? fallbackMatch.name,
      });
    }
  }

  return Array.from(merged.values());
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/"/g, "in")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchAiItemToSku(itemName: string): string | null {
  const t = normalizeText(itemName);
  const rawKey = itemName.trim().toLowerCase().replace(/\//g, "_");
  if (AI_FALLBACK_PRICE_MAP[rawKey]) return rawKey;

  if (t.includes("nema 14 50") || t.includes("14 50 receptacle") || t.includes("14 50 outlet")) return "recept_14_50";
  if (t.includes("nema 6 50") || t.includes("6 50 receptacle") || t.includes("6 50 outlet")) return "recept_6_50";
  if (t.includes("2 pole") && t.includes("60") && t.includes("breaker")) return "brkr_2p_60";
  if (t.includes("2 pole") && t.includes("50") && t.includes("breaker")) return "brkr_2p_50";
  if (t.includes("2 pole") && t.includes("40") && t.includes("breaker")) return "brkr_2p_40";
  if (t.includes("2 pole") && t.includes("30") && t.includes("breaker")) return "brkr_2p_30";
  if (t.includes("1 pole") && t.includes("20") && t.includes("breaker")) return "brkr_1p_20";
  if (t.includes("1 pole") && t.includes("15") && t.includes("breaker")) return "brkr_1p_15";
  if (t.includes("4 square box") || t.includes("4sq box") || t.includes("4 in square box")) return "box_4sq_2_1_8";
  if (t.includes("octagon box") || t.includes("4 in octagon")) return "box_oct_4in";
  if (t.includes("round pan box") || t.includes("pan box")) return "box_round_pan";
  if (t.includes("mud ring 1 gang") || t.includes("1 gang mud ring")) return "mudring_1g";
  if (t.includes("mud ring 2 gang") || t.includes("2 gang mud ring")) return "mudring_2g";
  if (t.includes("3/4 emt") || t.includes("emt 3/4") || t.includes("3 4 emt")) return "emt_3_4";
  if (t.includes("1/2 emt") || t.includes("emt 1/2") || t.includes("1 2 emt")) return "emt_1_2";
  if (t.includes("emt connector 3/4") || t.includes("3/4 emt connector") || t.includes("3 4 emt connector")) return "connector_emt_3_4";
  if (t.includes("emt connector 1/2") || t.includes("1/2 emt connector") || t.includes("1 2 emt connector")) return "connector_emt_1_2";
  if (t.includes("emt coupling 3/4") || t.includes("3/4 emt coupling") || t.includes("3 4 emt coupling")) return "coupling_emt_3_4";
  if (t.includes("emt coupling 1/2") || t.includes("1/2 emt coupling") || t.includes("1 2 emt coupling")) return "coupling_emt_1_2";
  if (t.includes("emt strap 3/4") || t.includes("3/4 emt strap") || t.includes("3 4 emt strap")) return "strap_emt_3_4";
  if (t.includes("emt strap 1/2") || t.includes("1/2 emt strap") || t.includes("1 2 emt strap")) return "strap_emt_1_2";
  if (t.includes("nm b 10/2") || t.includes("nm 10/2") || t.includes("10/2 nm")) return "nmb_10_2";
  if (t.includes("nm b 10/3") || t.includes("nm 10/3") || t.includes("10/3 nm")) return "nmb_10_3";
  if (t.includes("nm b 12/2") || t.includes("nm 12/2") || t.includes("12/2 nm")) return "nmb_12_2";
  if (t.includes("nm b 12/3") || t.includes("nm 12/3") || t.includes("12/3 nm")) return "nmb_12_3";
  if (t.includes("mc 12/2") || t.includes("12/2 mc") || t.includes("mc cable 12/2")) return "mc_12_2";
  if (t.includes("mc 12/3") || t.includes("12/3 mc") || t.includes("mc cable 12/3")) return "mc_12_3";
  if (t.includes("mc 10/2") || t.includes("10/2 mc") || t.includes("mc cable 10/2")) return "mc_10_2";
  if (t.includes("mc 6/2") || t.includes("6/2 mc") || t.includes("mc cable 6/2")) return "mc_6_2";
  if (t.includes("thhn 10") || t.includes("#10 thhn") || t.includes("10 awg thhn")) return "thhn_10_black";
  if (t.includes("thhn 8") || t.includes("#8 thhn") || t.includes("8 awg thhn")) return "thhn_8_black";
  if (t.includes("thhn 6") || t.includes("#6 thhn") || t.includes("6 awg thhn")) return "thhn_6_black";
  if (t.includes("gfci") && t.includes("20")) return "recept_gfci_20a";
  if (t.includes("gfci") && t.includes("15")) return "recept_gfci_15a";
  if (t.includes("duplex receptacle") && t.includes("20")) return "recept_tr_20a";
  if (t.includes("duplex receptacle") && t.includes("15")) return "recept_tr_15a";
  if (t.includes("single pole switch") || t.includes("single-pole switch")) return "switch_sp";
  if (t.includes("3 way switch") || t.includes("3-way switch")) return "switch_3w";
  if (t.includes("led dimmer") || t.includes("dimmer switch")) return "dimmer_led";
  if (t.includes("weatherproof cover 1 gang") || t.includes("1 gang weatherproof cover")) return "wp_cover_1g";
  if (t.includes("bubble cover 1 gang") || t.includes("in use cover 1 gang")) return "bubble_cover_1g";
  if (t.includes("1 gang decora plate") || t.includes("decora wall plate")) return "plate_1g_decora";

  return null;
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
    amperage: Number(factors?.amperage ?? 0),
    voltage: Number(factors?.voltage ?? 0),
    wiringMethod: factors?.wiringMethod ?? "unknown",
    terminationType: factors?.terminationType ?? "unknown",
    wetLocation: Boolean(factors?.wetLocation),
  };

  const base = baseByJobType[safeFactors.jobType] ?? 1.5;
  const deviceAdder = Math.max(0, safeFactors.deviceCount - 1) * 0.35;
  const runAdder = Math.max(0, safeFactors.runLengthFt) * 0.02;
  const accessAdder =
    safeFactors.access === "attic" ? 0.75
    : safeFactors.access === "crawlspace" ? 0.75
    : safeFactors.access === "finished" ? 1.0
    : 0;
  const panelAdder = safeFactors.panelWork ? 0.75 : 0;
  const amperageAdder =
    safeFactors.amperage >= 100 ? 1.5
    : safeFactors.amperage >= 60 ? 0.75
    : safeFactors.amperage >= 50 ? 0.5
    : 0;
  const wiringAdder =
    safeFactors.wiringMethod === "emt" ? 0.75
    : safeFactors.wiringMethod === "pvc" ? 0.85
    : safeFactors.wiringMethod === "mc" ? 0.35
    : 0;
  const terminationAdder =
    safeFactors.terminationType === "hardwired" ? 0.35
    : safeFactors.terminationType === "light" ? 0.2
    : 0;
  const wetLocationAdder = safeFactors.wetLocation ? 0.35 : 0;
  const difficultyMultiplier =
    safeFactors.difficulty === "easy" ? 0.9
    : safeFactors.difficulty === "hard" ? 1.25
    : 1;

  const total =
    (base + deviceAdder + runAdder + accessAdder + panelAdder +
      amperageAdder + wiringAdder + terminationAdder + wetLocationAdder)
    * difficultyMultiplier;

  return Math.max(0.5, Math.round(total * 100) / 100);
}

function buildMaterialsFromFactors(
  factors: EstimateAIResult["materialFactors"]
): NormalizedMaterial[] {
  const items: NormalizedMaterial[] = [];

  const add = (skuKey: string, qty: number) => {
    const match = PRICEBOOK_MAP.get(skuKey);
    if (!match || qty <= 0) return;
    items.push({ skuKey: match.skuKey, qty: clampQty(qty), unit: match.unit, name: match.name });
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

    if (factors.wiringMethod === "nm" && factors.amperage < 50) {
      add("nmb_10_2", Math.ceil(factors.runLengthFt * 1.1));
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

    if (factors.wetLocation) add("wp_cover_1g", 1);
    add("wirenut_red", 4);
    add("tape_electrical", 1);
  }

  return normalizeMaterials(items);
}

function buildMaterialsFromAiTakeoff(
  materialsFound: Array<{ item: string; qty: number; unit: string; notes?: string }>
): NormalizedMaterial[] {
  const items: NormalizedMaterial[] = [];

  for (const m of materialsFound) {
    const skuKey = matchAiItemToSku(m.item);
    if (!skuKey) continue;

    if (PRICEBOOK_MAP.get(skuKey)) {
      items.push({ skuKey, qty: clampQty(m.qty) });
      continue;
    }

    if (AI_FALLBACK_PRICE_MAP[skuKey]) {
      items.push({
        skuKey,
        qty: clampQty(m.qty),
        unit: AI_FALLBACK_PRICE_MAP[skuKey].unit,
        name: AI_FALLBACK_PRICE_MAP[skuKey].name,
      });
    }
  }

  return normalizeMaterials(items);
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

function buildSystemPrompt(catalogForPrompt: string): string {
  return `
You are an electrical estimating assistant.

Convert the user's job description into a JSON object with these fields:
- summary: string
- assumptions: string[]
- materialsFound: array of { item, qty, unit, notes }
- laborFactors: object with labor-driving variables
- materialFactors: object with material-driving variables

Labor-driving variables (laborFactors):
- jobType (e.g. ev_charger, receptacle_install, lighting_upgrade, switch_install, panel_work, troubleshooting)
- deviceCount (number)
- runLengthFt (number)
- access: "open" | "attic" | "crawlspace" | "finished"
- panelWork: boolean
- difficulty: "easy" | "standard" | "hard"
- amperage: number
- voltage: number
- wiringMethod: "nm" | "mc" | "emt" | "pvc" | "unknown"
- terminationType: "hardwired" | "receptacle" | "switch" | "light" | "unknown"
- wetLocation: boolean

materialFactors has the same fields as laborFactors except no "difficulty".

Rules:
- Do NOT include pricing or labor hours.
- Use conservative assumptions.
- Return ONLY valid JSON — no markdown, no extra text.
- materialsFound should include primary equipment, wiring/raceway, boxes, fittings, connectors, supports, covers, termination hardware, and consumables.
- For most installations include at least 8 items in materialsFound.

Approved catalog (skuKey | unit | name):
${catalogForPrompt}
`.trim();
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

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

    const catalogForPrompt = PRICEBOOK_ITEMS.map(
      (item) => `${item.skuKey} | ${item.unit} | ${item.name}`
    ).join("\n");

    const OPENAI_TIMEOUT_MS = 45_000;
    const t0 = Date.now();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

    // -----------------------------------------------------------------------
    // Call OpenAI Chat Completions (standard, works with all SDK versions)
    // -----------------------------------------------------------------------
    let res: Awaited<ReturnType<typeof client.chat.completions.create>>;
    try {
      res = await client.chat.completions.create(
        {
          model: "gpt-4o-mini",
          max_tokens: 1200,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: buildSystemPrompt(catalogForPrompt) },
            { role: "user", content: description },
          ],
        },
        { signal: controller.signal }
      );
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        (err.name === "AbortError" || err.message.includes("abort"))
      ) {
        throw new Error("OpenAI request timed out");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }

    console.log("[/api/estimate] openai done ms:", Date.now() - t0);

    // -----------------------------------------------------------------------
    // Parse response
    // -----------------------------------------------------------------------
    const rawText = res.choices?.[0]?.message?.content ?? "";

    let parsed: EstimateAIResult | null = null;
    try {
      parsed = JSON.parse(rawText) as EstimateAIResult;
    } catch {
      console.error("[/api/estimate] failed to parse rawText:", rawText);
      return Response.json(
        { error: "Model returned invalid JSON." },
        { status: 502 }
      );
    }

    if (!parsed) {
      return Response.json({ error: "No structured output returned" }, { status: 502 });
    }

    // -----------------------------------------------------------------------
    // Sanitize assumptions
    // -----------------------------------------------------------------------
    const assumptions = Array.isArray(parsed.assumptions)
      ? parsed.assumptions
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
          .slice(0, 3)
      : [];

    // -----------------------------------------------------------------------
    // Sanitize materialsFound
    // -----------------------------------------------------------------------
    const materialsFound = Array.isArray(parsed.materialsFound)
      ? parsed.materialsFound
          .filter(
            (x): x is { item: string; qty: number; unit: string; notes?: string } =>
              !!x &&
              typeof x === "object" &&
              typeof (x as { item?: unknown }).item === "string" &&
              typeof (x as { unit?: unknown }).unit === "string"
          )
          .map((m) => ({
            item: m.item.trim(),
            qty: Number.isFinite(m.qty) ? Math.max(0, Number(m.qty)) : 0,
            unit: m.unit.trim(),
            notes: typeof m.notes === "string" ? m.notes.trim() : undefined,
          }))
      : [];

    console.log(
      "[/api/estimate] materialsFound items:",
      materialsFound.map((m) => m.item)
    );

    // -----------------------------------------------------------------------
    // Sanitize materialFactors
    // -----------------------------------------------------------------------
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

    // -----------------------------------------------------------------------
    // Sanitize laborFactors
    // -----------------------------------------------------------------------
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
      amperage: Number.isFinite(parsed.laborFactors?.amperage)
        ? Math.max(0, Number(parsed.laborFactors.amperage))
        : 0,
      voltage: Number.isFinite(parsed.laborFactors?.voltage)
        ? Math.max(0, Number(parsed.laborFactors.voltage))
        : 0,
      wiringMethod:
        parsed.laborFactors?.wiringMethod === "nm" ||
        parsed.laborFactors?.wiringMethod === "mc" ||
        parsed.laborFactors?.wiringMethod === "emt" ||
        parsed.laborFactors?.wiringMethod === "pvc"
          ? parsed.laborFactors.wiringMethod
          : "unknown",
      terminationType:
        parsed.laborFactors?.terminationType === "hardwired" ||
        parsed.laborFactors?.terminationType === "receptacle" ||
        parsed.laborFactors?.terminationType === "switch" ||
        parsed.laborFactors?.terminationType === "light"
          ? parsed.laborFactors.terminationType
          : "unknown",
      wetLocation: Boolean(parsed.laborFactors?.wetLocation),
    };

    // -----------------------------------------------------------------------
    // Build final materials list
    // -----------------------------------------------------------------------
    const factorMaterials = buildMaterialsFromFactors(materialFactors);
    const aiTakeoffMaterials = buildMaterialsFromAiTakeoff(materialsFound);

    console.log("[/api/estimate] aiTakeoffMaterials:", aiTakeoffMaterials);

    const materials = normalizeMaterials([...factorMaterials, ...aiTakeoffMaterials]);

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
  } catch (err: unknown) {
    console.error("[/api/estimate] error:", err);
    const msg = err instanceof Error ? err.message : "Server error";
    const status = String(msg).includes("timed out") ? 504 : 500;
    return Response.json({ error: msg }, { status });
  }
}