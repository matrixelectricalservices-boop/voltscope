import OpenAI from "openai";
import { PRICEBOOK } from "../../lib/pricing/pricebook";
import { priceEstimate } from "../../lib/pricing/priceEngine";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
};

type PricebookItem = {
  skuKey: string;
  name: string;
  unit: string;
  baseUnitCost: number;
};

// ---------------------------------------------------------------------------
// Pricebook setup
// ---------------------------------------------------------------------------

const PRICEBOOK_ITEMS: PricebookItem[] = Array.isArray(PRICEBOOK.items)
  ? [...PRICEBOOK.items]
  : [];

console.log("[pricebook] item count:", PRICEBOOK_ITEMS.length);

const PRICEBOOK_MAP = new Map(
  PRICEBOOK_ITEMS.map((item) => [item.skuKey, item] as const)
);

// ---------------------------------------------------------------------------
// Fallback prices — items commonly needed but not yet in the main pricebook
// ---------------------------------------------------------------------------

export const AI_FALLBACK_PRICE_MAP: Record<
  string,
  { name: string; unit: string; baseUnitCost: number }
> = {
  // Service / panel
  meter_socket_200a:                    { name: "Meter socket 200A",                  unit: "ea", baseUnitCost: 165  },
  service_lugs_or_main_200a_panel:      { name: "Main 200A panel / service lugs",     unit: "ea", baseUnitCost: 245  },
  service_conductor_2_0_cu_xhwt:        { name: "Service conductor 2/0 CU XHHW",     unit: "ft", baseUnitCost: 4.5  },
  grounding_conductor_4_0_cu:           { name: "Grounding conductor 4/0 CU",        unit: "ft", baseUnitCost: 1.6  },
  ground_rod_8ft:                       { name: "Ground rod 8ft",                     unit: "ea", baseUnitCost: 22   },
  meter_seal_and_locking_ring:          { name: "Meter seal / locking ring",          unit: "ea", baseUnitCost: 18   },
  service_disconnect_handle:            { name: "Service disconnect handle / cover",  unit: "ea", baseUnitCost: 35   },
  lug_kits_and_terminal_connectors:     { name: "Lug kits / terminal connectors",     unit: "ea", baseUnitCost: 18   },
  bonding_jumpers_and_straps:           { name: "Bonding jumpers / straps",           unit: "ea", baseUnitCost: 12   },
  labels_and_panel_directory:           { name: "Labels / panel directory",           unit: "ea", baseUnitCost: 4    },
  // Conduit
  conduit_emt_or_pvc:                   { name: "Conduit (EMT or PVC)",               unit: "ft", baseUnitCost: 1.25 },
  // Surge / protection
  surge_protector_wholehouse:           { name: "Whole-house surge protector",        unit: "ea", baseUnitCost: 85   },
  // Boxes
  junction_box_4sq:                     { name: "4-sq junction box",                  unit: "ea", baseUnitCost: 4.5  },
  weatherproof_box:                     { name: "Weatherproof box",                   unit: "ea", baseUnitCost: 8    },
  // Covers / plates
  weatherproof_cover:                   { name: "Weatherproof cover",                 unit: "ea", baseUnitCost: 9    },
  blank_cover_plate:                    { name: "Blank cover plate",                  unit: "ea", baseUnitCost: 2    },
  // Hardware / consumables
  fasteners_and_anchors:                { name: "Fasteners / anchors",                unit: "ea", baseUnitCost: 8    },
  insulation_tape:                      { name: "Electrical tape / heat shrink",      unit: "ea", baseUnitCost: 4    },
  anti_oxidant_compound:                { name: "Anti-oxidant compound",              unit: "ea", baseUnitCost: 9    },
  caulking_sealant:                     { name: "Caulking / sealant",                 unit: "ea", baseUnitCost: 7    },
  wire_staples_or_straps:               { name: "Wire staples / cable straps",        unit: "ea", baseUnitCost: 6    },
  misc_consumables:                     { name: "Misc fittings / consumables",        unit: "lot",baseUnitCost: 25   },
};

// ---------------------------------------------------------------------------
// Resolve a skuKey from the AI item string
// Strategy: exact → pricebook prefix → fallback prefix → keyword rules
// ---------------------------------------------------------------------------

function matchAiItemToSku(raw: string): string | null {
  const item = raw.trim();

  // 1. Exact match in pricebook
  if (PRICEBOOK_MAP.has(item)) return item;

  // 2. Exact match in fallback
  if (AI_FALLBACK_PRICE_MAP[item]) return item;

  // 3. Normalize and try again
  const t = item.toLowerCase().replace(/[-/\s]+/g, "_");
  if (PRICEBOOK_MAP.has(t)) return t;
  if (AI_FALLBACK_PRICE_MAP[t]) return t;

  // 4. Pricebook prefix match — if AI key starts with a known skuKey prefix
  for (const [skuKey] of PRICEBOOK_MAP) {
    if (t.startsWith(skuKey) || skuKey.startsWith(t)) return skuKey;
  }

  // 5. Fallback prefix match
  for (const key of Object.keys(AI_FALLBACK_PRICE_MAP)) {
    if (t.startsWith(key) || key.startsWith(t)) return key;
  }

  // 6. Keyword rules for vague / generic AI names
  const s = item.toLowerCase();

  // Surge protection
  if (s.includes("surge")) return "surge_protector_wholehouse";

  // Breakers
  if ((s.includes("breaker") || s.includes("2 pole") || s.includes("2p") || s.includes("double")) && s.includes("60")) return "brkr_2p_60";
  if ((s.includes("breaker") || s.includes("2 pole") || s.includes("2p") || s.includes("double")) && s.includes("50")) return "brkr_2p_50";
  if ((s.includes("breaker") || s.includes("2 pole") || s.includes("2p") || s.includes("double")) && s.includes("40")) return "brkr_2p_40";
  if ((s.includes("breaker") || s.includes("2 pole") || s.includes("2p") || s.includes("double")) && s.includes("30")) return "brkr_2p_30";
  if ((s.includes("breaker") || s.includes("1 pole") || s.includes("1p") || s.includes("single")) && s.includes("20")) return "brkr_1p_20";
  if ((s.includes("breaker") || s.includes("1 pole") || s.includes("1p") || s.includes("single")) && s.includes("15")) return "brkr_1p_15";
  if (s.includes("breaker") || s.includes("brkr") || s.includes("circuit") || s.includes("panel_work")) {
    // Generic breaker — default to 20A single pole
    return "brkr_1p_20";
  }

  // Receptacles
  if (s.includes("14-50") || s.includes("14_50") || s.includes("nema 14")) return "recept_14_50";
  if (s.includes("6-50")  || s.includes("6_50")  || s.includes("nema 6"))  return "recept_6_50";
  if (s.includes("gfci") && (s.includes("20") || s.includes("bath") || s.includes("kitchen") || s.includes("outdoor"))) return "recept_gfci_20a";
  if (s.includes("gfci")) return "recept_gfci_15a";
  if (s.includes("recept") || s.includes("outlet") || s.includes("receptacle")) {
    if (s.includes("20")) return "recept_tr_20a";
    return "recept_tr_15a";
  }

  // Switches
  if (s.includes("dimmer")) return "dimmer_led";
  if (s.includes("3 way") || s.includes("3-way") || s.includes("3way")) return "switch_3w";
  if (s.includes("switch")) return "switch_sp";

  // Wire / cable
  if (s.includes("10/3") || s.includes("10-3")) return PRICEBOOK_MAP.has("nmb_10_3") ? "nmb_10_3" : "nmb_10_2";
  if (s.includes("10/2") || s.includes("10-2")) return "nmb_10_2";
  if (s.includes("12/3") || s.includes("12-3")) return PRICEBOOK_MAP.has("nmb_12_3") ? "nmb_12_3" : "nmb_12_2";
  if (s.includes("12/2") || s.includes("12-2")) return "nmb_12_2";
  if (s.includes("mc") && (s.includes("12") || s.includes("cable"))) return "mc_12_2";
  if (s.includes("mc") && s.includes("10")) return "mc_10_2";
  if (s.includes("thhn") && s.includes("6"))  return "thhn_6_black";
  if (s.includes("thhn") && s.includes("8"))  return "thhn_8_black";
  if (s.includes("thhn") && s.includes("10")) return "thhn_10_black";
  if (s.includes("wire") || s.includes("cable") || s.includes("wiring") || s.includes("wiring_method")) return "nmb_12_2";

  // Conduit / EMT
  if (s.includes("3/4") && (s.includes("emt") || s.includes("conduit"))) return "emt_3_4";
  if (s.includes("1/2") && (s.includes("emt") || s.includes("conduit"))) return "emt_1_2";
  if (s.includes("emt") || s.includes("conduit")) return "emt_3_4";

  // EMT fittings
  if (s.includes("connector") && s.includes("3/4")) return "connector_emt_3_4";
  if (s.includes("connector") && s.includes("1/2")) return "connector_emt_1_2";
  if (s.includes("coupling")  && s.includes("3/4")) return "coupling_emt_3_4";
  if (s.includes("coupling")  && s.includes("1/2")) return "coupling_emt_1_2";
  if (s.includes("strap")     && s.includes("3/4")) return "strap_emt_3_4";
  if (s.includes("strap")     && s.includes("1/2")) return "strap_emt_1_2";
  if (s.includes("fittings") || s.includes("fitting") || s.includes("connector") || s.includes("coupling")) return "connector_emt_3_4";

  // Boxes
  if (s.includes("4 sq") || s.includes("4sq") || s.includes("4-sq") || s.includes("4_sq")) return "box_4sq_2_1_8";
  if (s.includes("octagon") || s.includes("oct")) return "box_oct_4in";
  if (s.includes("weatherproof") && s.includes("box")) return "weatherproof_box";
  if (s.includes("box")) return "box_4sq_2_1_8";

  // Mud rings
  if (s.includes("mud ring") || s.includes("mud_ring") || s.includes("mudring")) {
    return s.includes("2") ? "mudring_2g" : "mudring_1g";
  }

  // Covers / plates
  if (s.includes("weatherproof") || s.includes("wp_cover") || s.includes("in-use")) return "wp_cover_1g";
  if (s.includes("bubble"))   return "bubble_cover_1g";
  if (s.includes("decora") || s.includes("wall plate") || s.includes("plate")) return "plate_1g_decora";
  if (s.includes("cover"))    return "weatherproof_cover";

  // Straps / supports / staples
  if (s.includes("strap") || s.includes("support") || s.includes("staple") || s.includes("supports")) return "wire_staples_or_straps";

  // Consumables / misc
  if (s.includes("tape") || s.includes("heat shrink")) return "insulation_tape";
  if (s.includes("anti-ox") || s.includes("antioxidant") || s.includes("noalox")) return "anti_oxidant_compound";
  if (s.includes("caulk") || s.includes("sealant")) return "caulking_sealant";
  if (s.includes("label") || s.includes("directory")) return "labels_and_panel_directory";
  if (s.includes("fastener") || s.includes("anchor") || s.includes("screw") || s.includes("bolt")) return "fasteners_and_anchors";
  if (s.includes("lug") || s.includes("terminal")) return "lug_kits_and_terminal_connectors";
  if (s.includes("bond") || s.includes("jumper")) return "bonding_jumpers_and_straps";
  if (s.includes("wirenut") || s.includes("wire nut") || s.includes("wire_nut")) return PRICEBOOK_MAP.has("wirenut_red") ? "wirenut_red" : "misc_consumables";
  if (s.includes("misc") || s.includes("consumable") || s.includes("lot") || s.includes("hardware")) return "misc_consumables";

  // Ground / bonding
  if (s.includes("ground rod") || s.includes("grounding rod")) return "ground_rod_8ft";
  if (s.includes("ground") || s.includes("grounding")) return "grounding_conductor_4_0_cu";

  console.warn("[matchAiItemToSku] no match for:", raw);
  return null;
}

// ---------------------------------------------------------------------------
// Build priceable material list from AI takeoff
// ---------------------------------------------------------------------------

function clampQty(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(9999, Math.round(n * 100) / 100);
}

function buildMaterialsFromAiTakeoff(
  materialsFound: EstimateAIResult["materialsFound"]
): Array<{ skuKey: string; qty: number; unit?: string; name?: string }> {
  const merged = new Map<string, { skuKey: string; qty: number; unit: string; name: string }>();

  for (const m of materialsFound) {
    const skuKey = matchAiItemToSku(m.item);
    if (!skuKey) continue;

    const pricebookEntry = PRICEBOOK_MAP.get(skuKey);
    const fallbackEntry  = AI_FALLBACK_PRICE_MAP[skuKey];
    const unit = pricebookEntry?.unit ?? fallbackEntry?.unit ?? m.unit ?? "ea";
    const name = pricebookEntry?.name ?? fallbackEntry?.name ?? m.item;
    const qty  = clampQty(m.qty);

    const existing = merged.get(skuKey);
    if (existing) {
      existing.qty += qty;
    } else {
      merged.set(skuKey, { skuKey, qty, unit, name });
    }
  }

  return Array.from(merged.values());
}

// ---------------------------------------------------------------------------
// Labor hours from AI factors
// ---------------------------------------------------------------------------

function calculateLaborHours(factors: EstimateAIResult["laborFactors"]): number {
  const baseByJobType: Record<string, number> = {
    ev_charger:         2.5,
    receptacle_install: 1.0,
    lighting_upgrade:   1.5,
    switch_install:     0.75,
    panel_work:         2.0,
    troubleshooting:    2.0,
  };

  const base          = baseByJobType[factors.jobType] ?? 1.5;
  const deviceAdder   = Math.max(0, (factors.deviceCount ?? 1) - 1) * 0.35;
  const runAdder      = Math.max(0, factors.runLengthFt ?? 0) * 0.02;
  const accessAdder   = factors.access === "finished" ? 1.0 : (factors.access === "attic" || factors.access === "crawlspace") ? 0.75 : 0;
  const panelAdder    = factors.panelWork ? 0.75 : 0;
  const ampAdder      = (factors.amperage ?? 0) >= 100 ? 1.5 : (factors.amperage ?? 0) >= 60 ? 0.75 : (factors.amperage ?? 0) >= 50 ? 0.5 : 0;
  const wiringAdder   = factors.wiringMethod === "emt" ? 0.75 : factors.wiringMethod === "pvc" ? 0.85 : factors.wiringMethod === "mc" ? 0.35 : 0;
  const termAdder     = factors.terminationType === "hardwired" ? 0.35 : factors.terminationType === "light" ? 0.2 : 0;
  const wetAdder      = factors.wetLocation ? 0.35 : 0;
  const diffMult      = factors.difficulty === "easy" ? 0.9 : factors.difficulty === "hard" ? 1.25 : 1;

  const total = (base + deviceAdder + runAdder + accessAdder + panelAdder + ampAdder + wiringAdder + termAdder + wetAdder) * diffMult;
  return Math.max(0.5, Math.round(total * 100) / 100);
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

function buildSystemPrompt(catalogForPrompt: string): string {
  return `
You are an electrical estimating assistant.

Return ONLY a valid JSON object — no markdown, no explanation.

JSON shape:
{
  "summary": "string",
  "assumptions": ["string", ...],
  "materialsFound": [
    { "item": "EXACT_SKU_KEY", "qty": number, "unit": "ea|ft|lot", "notes": "optional" },
    ...
  ],
  "laborFactors": {
    "jobType": "ev_charger|receptacle_install|lighting_upgrade|switch_install|panel_work|troubleshooting",
    "deviceCount": number,
    "runLengthFt": number,
    "access": "open|attic|crawlspace|finished",
    "panelWork": true|false,
    "difficulty": "easy|standard|hard",
    "amperage": number,
    "voltage": number,
    "wiringMethod": "nm|mc|emt|pvc|unknown",
    "terminationType": "hardwired|receptacle|switch|light|unknown",
    "wetLocation": true|false
  }
}

CRITICAL RULES for materialsFound:
1. The "item" field MUST be one of the exact skuKey values from the catalog below.
2. Do NOT invent skuKeys. Do NOT use generic words like "box", "fittings", "supports", "panel_work", "wiring_method".
3. If a material is needed but has no catalog match, omit it — do NOT guess.
4. Include ALL materials for the job: equipment, wire/conduit, boxes, fittings, connectors, straps, covers, consumables.
5. qty must be realistic (e.g. wire = run length × 1.1 for waste).
6. Most real jobs need 8–14 items.

CATALOG — use ONLY these skuKey values in the "item" field:
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
      return Response.json({ error: "OPENAI_API_KEY is not set." }, { status: 500 });
    }

    const body = (await req.json()) as {
      description?: string;
      state?: string;
      laborRate?: number;
      markupPct?: number;
    };

    const description = (body.description ?? "").trim();
    if (!description) {
      return Response.json({ error: "Missing description" }, { status: 400 });
    }

    const state     = typeof body.state     === "string" ? body.state.toUpperCase() : "NC";
    const laborRate = typeof body.laborRate === "number" ? body.laborRate : 95;
    const markupPct = typeof body.markupPct === "number" ? body.markupPct : 20;
    const month     = new Date().toISOString().slice(0, 7);

    const client = new OpenAI({ apiKey });
    console.log("[/api/estimate] start — state:", state, "laborRate:", laborRate, "month:", month);

    // Build catalog string — include fallback items so AI knows those skuKeys too
    const fallbackLines = Object.entries(AI_FALLBACK_PRICE_MAP)
      .map(([key, v]) => `${key} | ${v.unit} | ${v.name}`)
      .join("\n");

    const pricebookLines = PRICEBOOK_ITEMS.map(
      (item) => `${item.skuKey} | ${item.unit} | ${item.name}`
    ).join("\n");

    const catalogForPrompt = `${pricebookLines}\n${fallbackLines}`;

    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 45_000);
    const t0         = Date.now();

    let res: Awaited<ReturnType<typeof client.chat.completions.create>>;
    try {
      res = await client.chat.completions.create(
        {
          model:           "gpt-4o-mini",
          max_tokens:      1600,
          temperature:     0.1,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: buildSystemPrompt(catalogForPrompt) },
            { role: "user",   content: description },
          ],
        },
        { signal: controller.signal }
      );
    } catch (err: unknown) {
      if (err instanceof Error && (err.name === "AbortError" || err.message.includes("abort"))) {
        throw new Error("OpenAI request timed out");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }

    console.log("[/api/estimate] openai done ms:", Date.now() - t0);

    const rawText = res.choices?.[0]?.message?.content ?? "";
    let parsed: EstimateAIResult | null = null;
    try {
      parsed = JSON.parse(rawText) as EstimateAIResult;
    } catch {
      console.error("[/api/estimate] JSON parse failed:", rawText);
      return Response.json({ error: "Model returned invalid JSON." }, { status: 502 });
    }

    if (!parsed) {
      return Response.json({ error: "No structured output returned." }, { status: 502 });
    }

    // Sanitize
    const assumptions = Array.isArray(parsed.assumptions)
      ? parsed.assumptions.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 3)
      : [];

    const materialsFound = Array.isArray(parsed.materialsFound)
      ? parsed.materialsFound
          .filter((x): x is { item: string; qty: number; unit: string; notes?: string } =>
            !!x && typeof x === "object" &&
            typeof (x as { item?: unknown }).item === "string" &&
            typeof (x as { unit?: unknown }).unit === "string"
          )
          .map((m) => ({
            item:  m.item.trim(),
            qty:   Number.isFinite(m.qty) ? Math.max(0, Number(m.qty)) : 1,
            unit:  m.unit.trim(),
            notes: typeof m.notes === "string" ? m.notes.trim() : undefined,
          }))
      : [];

    console.log("[/api/estimate] materialsFound raw:", materialsFound.map((m) => `${m.item} x${m.qty}`));

    const lf = parsed.laborFactors ?? {};
    const laborFactors: EstimateAIResult["laborFactors"] = {
      jobType:         typeof lf.jobType === "string" ? lf.jobType : "general",
      deviceCount:     Number.isFinite(lf.deviceCount)  ? Math.max(1, Number(lf.deviceCount))  : 1,
      runLengthFt:     Number.isFinite(lf.runLengthFt)  ? Math.max(0, Number(lf.runLengthFt))  : 0,
      access:          ["attic","crawlspace","finished"].includes(lf.access) ? lf.access as any : "open",
      panelWork:       Boolean(lf.panelWork),
      difficulty:      ["easy","hard"].includes(lf.difficulty) ? lf.difficulty as any : "standard",
      amperage:        Number.isFinite(lf.amperage) ? Math.max(0, Number(lf.amperage)) : 0,
      voltage:         Number.isFinite(lf.voltage)  ? Math.max(0, Number(lf.voltage))  : 0,
      wiringMethod:    ["nm","mc","emt","pvc"].includes(lf.wiringMethod)         ? lf.wiringMethod         as any : "unknown",
      terminationType: ["hardwired","receptacle","switch","light"].includes(lf.terminationType) ? lf.terminationType as any : "unknown",
      wetLocation:     Boolean(lf.wetLocation),
    };

    // Build + price
    const materials  = buildMaterialsFromAiTakeoff(materialsFound);
    const laborHours = calculateLaborHours(laborFactors);

    console.log("[/api/estimate] matched materials:", materials.length, "of", materialsFound.length);
    console.log("[/api/estimate] labor hours:", laborHours);

    const priced = priceEstimate({ month, state, laborRate, markupPct, laborHours, materials });

    console.log("[/api/estimate] materialTotal:", priced.materialTotal, "laborTotal:", priced.laborTotal, "finalTotal:", priced.finalTotal);

    return Response.json({
      summary: typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : "Electrical scope generated from job description.",
      assumptions,
      materialsFound,
      materials,
      laborFactors,
      laborHours,
      pricedMaterials: priced.pricedMaterials,
      materialTotal:   priced.materialTotal,
      laborTotal:      priced.laborTotal,
      subtotal:        priced.subtotal,
      profit:          priced.profit,
      finalTotal:      priced.finalTotal,
      applied:         priced.applied,
    });

  } catch (err: unknown) {
    console.error("[/api/estimate] error:", err);
    const msg    = err instanceof Error ? err.message : "Server error";
    const status = msg.includes("timed out") ? 504 : 500;
    return Response.json({ error: msg }, { status });
  }
}