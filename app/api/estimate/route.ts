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
// Fallback prices — ONLY for items genuinely not in national.materials.json
// Keep this as small as possible; prefer adding items to the JSON instead.
// ---------------------------------------------------------------------------

export const AI_FALLBACK_PRICE_MAP: Record<
  string,
  { name: string; unit: string; baseUnitCost: number }
> = {
  // Service conductors not yet in pricebook
  service_conductor_2_0_cu: { name: "XHHW-2 2/0 CU service conductor", unit: "ft", baseUnitCost: 4.5 },
  // Alias keys the AI sometimes returns
  surge_protector_wholehouse: { name: "Whole-home surge protector",      unit: "ea", baseUnitCost: 120.0 },
  weatherproof_box:           { name: "Weatherproof box, surface mount", unit: "ea", baseUnitCost: 8.5   },
  wire_staples_or_straps:     { name: "Wire staples / cable straps",     unit: "ea", baseUnitCost: 6.0   },
  fasteners_and_anchors:      { name: "Fasteners / anchors",             unit: "ea", baseUnitCost: 8.0   },
  insulation_tape:            { name: "Electrical tape / heat shrink",   unit: "ea", baseUnitCost: 4.0   },
  caulking_sealant:           { name: "Caulking / sealant",              unit: "ea", baseUnitCost: 6.5   },
  labels_and_panel_directory: { name: "Panel directory / circuit labels", unit: "ea", baseUnitCost: 4.0  },
  lug_kits_and_terminal_connectors: { name: "Lug kits / terminal connectors", unit: "ea", baseUnitCost: 18.0 },
  bonding_jumpers_and_straps: { name: "Bonding jumpers / straps",        unit: "ea", baseUnitCost: 12.0  },
};

// ---------------------------------------------------------------------------
// Map any AI item string → a real skuKey
// Priority: exact pricebook → exact fallback → normalize → keyword rules
// ---------------------------------------------------------------------------

function matchAiItemToSku(raw: string): string | null {
  const item = raw.trim();

  // 1. Exact pricebook match
  if (PRICEBOOK_MAP.has(item)) return item;

  // 2. Exact fallback match
  if (AI_FALLBACK_PRICE_MAP[item]) return item;

  // 3. Normalize underscores/slashes/spaces and try again
  const normalized = item.toLowerCase().replace(/[\s/\\-]+/g, "_");
  if (PRICEBOOK_MAP.has(normalized)) return normalized;
  if (AI_FALLBACK_PRICE_MAP[normalized]) return normalized;

  // 4. Pricebook prefix/suffix match
  for (const [skuKey] of PRICEBOOK_MAP) {
    if (normalized.startsWith(skuKey) || skuKey.startsWith(normalized)) return skuKey;
  }

  // 5. Keyword rules — map vague/alias AI names to real pricebook skuKeys
  const s = item.toLowerCase();

  // ── Surge ──
  if (s.includes("surge")) return "surge_wholehome";

  // ── Breakers ──
  if (s.includes("60") && (s.includes("2p") || s.includes("2-p") || s.includes("double") || s.includes("2 pole") || s.includes("breaker"))) return "brkr_2p_60";
  if (s.includes("50") && (s.includes("2p") || s.includes("2-p") || s.includes("double") || s.includes("2 pole") || s.includes("breaker"))) return "brkr_2p_50";
  if (s.includes("40") && (s.includes("2p") || s.includes("2-p") || s.includes("double") || s.includes("2 pole") || s.includes("breaker"))) return "brkr_2p_40";
  if (s.includes("30") && (s.includes("2p") || s.includes("2-p") || s.includes("double") || s.includes("2 pole") || s.includes("breaker"))) return "brkr_2p_30";
  if (s.includes("20") && (s.includes("1p") || s.includes("1-p") || s.includes("single") || s.includes("1 pole") || s.includes("breaker"))) return "brkr_1p_20";
  if (s.includes("15") && (s.includes("1p") || s.includes("1-p") || s.includes("single") || s.includes("1 pole") || s.includes("breaker"))) return "brkr_1p_15";
  if (s.includes("afci") && s.includes("20")) return "brkr_afci_1p_20";
  if (s.includes("afci") && s.includes("15")) return "brkr_afci_1p_15";
  if (s.includes("gfci") && s.includes("breaker") && s.includes("30")) return "brkr_gfci_2p_30";
  if (s.includes("gfci") && s.includes("breaker")) return "brkr_gfci_1p_20";
  if (s.includes("breaker") || s.includes("brkr") || s.includes("circuit") || s.includes("panel_work")) return "brkr_1p_20";

  // ── Receptacles ──
  if (s.includes("14-50") || s.includes("14_50") || s.includes("nema 14")) return "recept_14_50";
  if (s.includes("6-50")  || s.includes("6_50")  || s.includes("nema 6"))  return "recept_6_50";
  if (s.includes("gfci") && (s.includes("20") || s.includes("bath") || s.includes("kitchen") || s.includes("outdoor"))) return "recept_gfci_20a";
  if (s.includes("gfci")) return "recept_gfci_15a";
  if ((s.includes("recept") || s.includes("outlet") || s.includes("receptacle")) && s.includes("20")) return "recept_tr_20a";
  if (s.includes("recept") || s.includes("outlet") || s.includes("receptacle")) return "recept_tr_15a";

  // ── Switches ──
  if (s.includes("dimmer") && s.includes("smart")) return "dimmer_smart";
  if (s.includes("dimmer")) return "dimmer_led";
  if (s.includes("3 way") || s.includes("3-way") || s.includes("3way")) return "switch_3w";
  if (s.includes("4 way") || s.includes("4-way") || s.includes("4way")) return "switch_4w";
  if (s.includes("timer") && s.includes("switch")) return "switch_timer_bath";
  if (s.includes("smart") && s.includes("switch")) return "switch_smart";
  if (s.includes("switch")) return "switch_sp";

  // ── Wire — NM-B ──
  if (s.includes("10/3") || s.includes("10-3")) return "nmb_10_3";
  if (s.includes("10/2") || s.includes("10-2")) return "nmb_10_2";
  if (s.includes("12/3") || s.includes("12-3")) return "nmb_12_3";
  if (s.includes("12/2") || s.includes("12-2")) return "nmb_12_2";
  if (s.includes("14/2") || s.includes("14-2")) return "nmb_14_2";

  // ── Wire — MC ──
  if ((s.includes("mc") || s.includes("mc cable")) && s.includes("6"))  return "mc_6_2";
  if ((s.includes("mc") || s.includes("mc cable")) && s.includes("8"))  return "mc_8_3";
  if ((s.includes("mc") || s.includes("mc cable")) && s.includes("10")) return "mc_10_2";
  if ((s.includes("mc") || s.includes("mc cable")) && s.includes("12")) return "mc_12_2";
  if ((s.includes("mc") || s.includes("mc cable")) && s.includes("14")) return "mc_14_2";

  // ── Wire — THHN ──
  if (s.includes("thhn") || s.includes("thwn")) {
    if (s.includes("2/0") || s.includes("2_0")) return "thhn_2_0_black";
    if (s.includes("1/0") || s.includes("1_0")) return "thhn_1_0_black";
    if (s.includes(" 1 ") || s.includes("_1_") || s.includes("#1")) return "thhn_1_black";
    if (s.includes("2"))  return "thhn_2_black";
    if (s.includes("4"))  return "thhn_4_black";
    if (s.includes("6"))  return "thhn_6_black";
    if (s.includes("8"))  return "thhn_8_black";
    if (s.includes("10")) return "thhn_10_black";
    if (s.includes("12")) return "thhn_12_black";
    if (s.includes("14")) return "thhn_14_black";
    if (s.includes("white") || s.includes("neutral")) return "thhn_white";
    if (s.includes("green") || s.includes("ground")) return "thhn_green";
  }

  // ── Generic wire/cable fallback ──
  if (s.includes("wire") || s.includes("cable") || s.includes("wiring") || s.includes("wiring_method")) return "nmb_12_2";

  // ── Service conductors ──
  if (s.includes("2/0") || s.includes("xhhw") || s.includes("service conductor")) return "xhhw_2_0_al";
  if (s.includes("4/0")) return "xhhw_4_0_al";
  if (s.includes("ser cable") || s.includes("ser_")) return "ser_2_2_2_4";

  // ── EMT conduit ──
  if ((s.includes("emt") || s.includes("conduit")) && (s.includes("1\"") || s.includes('1"') || s.includes("_1"))) return "emt_1";
  if ((s.includes("emt") || s.includes("conduit")) && (s.includes("3/4") || s.includes("3_4"))) return "emt_3_4";
  if ((s.includes("emt") || s.includes("conduit")) && (s.includes("1/2") || s.includes("1_2"))) return "emt_1_2";
  if (s.includes("emt") || s.includes("conduit")) return "emt_3_4";

  // ── PVC conduit ──
  if (s.includes("pvc") && (s.includes("1\"") || s.includes("_1"))) return "pvc_sch40_1";
  if (s.includes("pvc") && (s.includes("3/4") || s.includes("3_4"))) return "pvc_sch40_3_4";
  if (s.includes("pvc") && (s.includes("1/2") || s.includes("1_2"))) return "pvc_sch40_1_2";

  // ── EMT fittings ──
  if (s.includes("connector") && (s.includes("1\"") || s.includes("_1"))) return "connector_emt_1";
  if (s.includes("connector") && (s.includes("3/4") || s.includes("3_4"))) return "connector_emt_3_4";
  if (s.includes("connector") && (s.includes("1/2") || s.includes("1_2"))) return "connector_emt_1_2";
  if (s.includes("coupling")  && (s.includes("3/4") || s.includes("3_4"))) return "coupling_emt_3_4";
  if (s.includes("coupling")  && (s.includes("1/2") || s.includes("1_2"))) return "coupling_emt_1_2";
  if (s.includes("strap") && (s.includes("3/4") || s.includes("3_4"))) return "strap_emt_3_4";
  if (s.includes("strap") && (s.includes("1/2") || s.includes("1_2"))) return "strap_emt_1_2";
  if (s.includes("strap") || s.includes("support") || s.includes("staple") || s.includes("supports")) return "wire_staples";
  if (s.includes("connector") || s.includes("coupling") || s.includes("fittings") || s.includes("fitting")) return "connector_emt_3_4";

  // ── Boxes ──
  if (s.includes("old work") || s.includes("oldwork")) return "box_plastic_oldwork_1g";
  if (s.includes("new work") || s.includes("newwork")) return "box_metal_newwork_1g";
  if (s.includes("weatherproof") && s.includes("box")) return "box_weatherproof";
  if (s.includes("4 sq") || s.includes("4sq") || s.includes("4-sq") || s.includes("4_sq")) return "box_4sq_2_1_8";
  if (s.includes("octagon") || s.includes("oct")) return "box_oct_4in";
  if (s.includes("junction") && s.includes("metal")) return "jb_metal_6x6";
  if (s.includes("junction")) return "jb_pvc_6x6";
  if (s.includes("box")) return "box_4sq_2_1_8";

  // ── Mud rings ──
  if (s.includes("mud ring") || s.includes("mud_ring") || s.includes("mudring")) {
    return s.includes("2") ? "mudring_2g" : "mudring_1g";
  }

  // ── Covers / plates ──
  if (s.includes("weatherproof") || s.includes("wp_cover")) return "wp_cover_1g";
  if (s.includes("bubble") || s.includes("in-use") || s.includes("in use")) return "bubble_cover_1g";
  if (s.includes("decora") || s.includes("wall plate")) return "plate_1g_decora";
  if (s.includes("blank") && s.includes("plate")) return "plate_blank_1g";
  if (s.includes("cover") || s.includes("plate")) return "plate_1g_decora";

  // ── Ground ──
  if (s.includes("ground rod")) return "ground_rod_8ft";
  if (s.includes("ground rod clamp") || s.includes("grounding clamp")) return "ground_rod_clamp";
  if (s.includes("bare copper") && s.includes("6")) return "ground_6_bare";
  if (s.includes("bare copper") && s.includes("4")) return "ground_4_bare";
  if (s.includes("ground") || s.includes("grounding")) return "ground_6_bare";

  // ── Panel / service equipment ──
  if (s.includes("meter") && s.includes("socket")) return "meter_socket_200a";
  if (s.includes("meter") && s.includes("base")) return "meter_base_200a";
  if (s.includes("200a") && s.includes("panel")) return "loadcenter_200a_40_80";
  if (s.includes("150a") && s.includes("panel")) return "loadcenter_150a_30_60";
  if (s.includes("100a") && s.includes("panel")) return "loadcenter_100a_20_40";
  if (s.includes("subpanel")) return "subpanel_125a_24_48";
  if (s.includes("disconnect") && s.includes("200")) return "disconnect_200a_nonfus";
  if (s.includes("disconnect") && s.includes("100")) return "disconnect_100a_nonfus";
  if (s.includes("disconnect")) return "disconnect_60a_nonfus";

  // ── Lugs / bonding ──
  if (s.includes("lug") || s.includes("terminal")) return "lug_kit";
  if (s.includes("bond") || s.includes("jumper")) return "bonding_jumper";

  // ── Lights ──
  if (s.includes("wafer") && s.includes("6")) return "wafer_6in_led";
  if (s.includes("wafer") || s.includes("canless")) return "wafer_4in_led";
  if (s.includes("high bay") || s.includes("highbay")) return "highbay_led";
  if (s.includes("wall pack") || s.includes("wallpack")) return "wallpack_led";
  if (s.includes("wraparound") || s.includes("wrap around")) return "wraparound_4ft";

  // ── Consumables ──
  if (s.includes("anti-ox") || s.includes("antioxidant") || s.includes("noalox") || s.includes("anti_oxidant")) return "anti_oxidant";
  if (s.includes("caulk") || s.includes("sealant") || s.includes("firestop")) return "caulk_firestop";
  if (s.includes("silicone")) return "caulk_silicone";
  if (s.includes("putty")) return "putty_pads";
  if (s.includes("lube") || s.includes("pulling")) return "wire_lube";
  if (s.includes("label") || s.includes("directory") || s.includes("labels_and_panel") || s.includes("labels_panel")) return "labels_panel";
  if (s.includes("tape") && s.includes("friction")) return "tape_friction";
  if (s.includes("tape")) return "tape_electrical";
  if (s.includes("wirenut") || s.includes("wire nut") || s.includes("wire_nut") || s.includes("connector") && s.includes("wire")) return "wirenut_red";
  if (s.includes("zip tie") || s.includes("zip_tie")) return "zip_ties_11in";
  if (s.includes("fastener") || s.includes("anchor") || s.includes("screw") || s.includes("bolt")) return "fasteners_screws";
  if (s.includes("misc") || s.includes("consumable") || s.includes("lot") || s.includes("hardware")) return "misc_consumables";

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

  const base        = baseByJobType[factors.jobType] ?? 1.5;
  const deviceAdder = Math.max(0, (factors.deviceCount ?? 1) - 1) * 0.35;
  const runAdder    = Math.max(0, factors.runLengthFt ?? 0) * 0.02;
  const accessAdder = factors.access === "finished" ? 1.0 : (factors.access === "attic" || factors.access === "crawlspace") ? 0.75 : 0;
  const panelAdder  = factors.panelWork ? 0.75 : 0;
  const ampAdder    = (factors.amperage ?? 0) >= 100 ? 1.5 : (factors.amperage ?? 0) >= 60 ? 0.75 : (factors.amperage ?? 0) >= 50 ? 0.5 : 0;
  const wiringAdder = factors.wiringMethod === "emt" ? 0.75 : factors.wiringMethod === "pvc" ? 0.85 : factors.wiringMethod === "mc" ? 0.35 : 0;
  const termAdder   = factors.terminationType === "hardwired" ? 0.35 : factors.terminationType === "light" ? 0.2 : 0;
  const wetAdder    = factors.wetLocation ? 0.35 : 0;
  const diffMult    = factors.difficulty === "easy" ? 0.9 : factors.difficulty === "hard" ? 1.25 : 1;

  const total = (base + deviceAdder + runAdder + accessAdder + panelAdder + ampAdder + wiringAdder + termAdder + wetAdder) * diffMult;
  return Math.max(0.5, Math.round(total * 100) / 100);
}

// ---------------------------------------------------------------------------
// System prompt with full NEC rules
// ---------------------------------------------------------------------------

function buildSystemPrompt(catalogForPrompt: string): string {
  return `
You are a licensed electrical estimating assistant with deep NEC code knowledge.

Return ONLY a valid JSON object — no markdown, no explanation, no code fences.

JSON shape:
{
  "summary": "string",
  "assumptions": ["string", ...],
  "materialsFound": [
    { "item": "EXACT_SKU_KEY", "qty": number, "unit": "ea|ft|lot", "notes": "optional string" },
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

═══════════════════════════════════════════
NEC WIRE SIZING RULES — apply these exactly
═══════════════════════════════════════════
Select wire gauge based on circuit amperage:

  15A  → #14 AWG — but use nmb_12_2 minimum for new residential work
  20A  → #12 AWG → nmb_12_2 (NM) | mc_12_2 (MC) | thhn_12_black (EMT)
  30A  → #10 AWG → nmb_10_2 (NM) | mc_10_2 (MC) | thhn_10_black (EMT)
  40A  → #8 AWG  → mc_8_3 (MC)   | thhn_8_black (EMT)
  50A  → #6 AWG  → mc_6_2 (MC)   | thhn_6_black (EMT)
  60A  → #6 AWG  → mc_6_2 (MC)   | thhn_6_black (EMT)
  100A → #2 AWG  → thhn_2_black
  200A → 2/0 AL  → xhhw_2_0_al

Wiring method:
  NM-B (Romex): indoor dry residential → nmb_* keys
  MC cable: commercial/where NM not allowed → mc_* keys
  EMT: outdoor/exposed/commercial/wet → emt_* pipe + thhn_* conductors

EMT runs always need: conduit + connectors (2 min) + couplings (ceil(run/10)-1) + straps (ceil(run/6)) + THHN wire × conductors needed
Wire qty = run length × 1.15 for waste factor

═══════════════════════════════════════════
BREAKER SIZING RULES
═══════════════════════════════════════════
  EV charger 32A EVSE  → brkr_2p_40
  EV charger 40A EVSE  → brkr_2p_50
  EV charger 48A EVSE  → brkr_2p_60
  Dryer                → brkr_2p_30
  Range/oven           → brkr_2p_50
  20A receptacle       → brkr_1p_20
  15A lighting         → brkr_1p_15
  GFCI/bath/kitchen    → brkr_1p_20

═══════════════════════════════════════════
RECEPTACLE RULES
═══════════════════════════════════════════
  EV charger hardwired     → no receptacle
  EV plug-in 50A 240V      → recept_14_50
  EV plug-in 30A 240V      → recept_6_50
  Kitchen/bath/outdoor     → recept_gfci_20a
  Standard 20A             → recept_tr_20a
  Standard 15A             → recept_tr_15a
  Outdoor wet location     → recept_gfci_wr_20a

═══════════════════════════════════════════
BOX & FITTING RULES
═══════════════════════════════════════════
  Every in-wall device  → box_4sq_2_1_8 + mudring_1g
  Outdoor/wet device    → box_weatherproof + wp_cover_1g
  EMT connectors        → connector_emt_3_4 (qty 2 minimum per run)
  EMT couplings         → coupling_emt_3_4 (qty = ceil(run/10) - 1)
  EMT straps            → strap_emt_3_4 (qty = ceil(run/6))

═══════════════════════════════════════════
ALWAYS INCLUDE
═══════════════════════════════════════════
  misc_consumables (qty 1, lot) — wire nuts, tape, staples
  labels_panel for any panel work

═══════════════════════════════════════════
STRICT CATALOG RULES
═══════════════════════════════════════════
1. "item" MUST be an exact skuKey from the CATALOG below.
2. NEVER invent skuKeys. NEVER use generic words like "box", "wire", "cable", "fittings", "supports", "panel_work", "wiring_method".
3. Apply NEC rules above to choose the correct gauge and size.
4. qty must use real math: wire = run × 1.15, devices = count, fittings = formula above.
5. Return 8–14 line items for any real installation. Never fewer than 8.

CATALOG:
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

    // Build catalog: pricebook first, then any fallback-only keys
    const pricebookLines = PRICEBOOK_ITEMS.map((i) => `${i.skuKey} | ${i.unit} | ${i.name}`).join("\n");
    const fallbackLines  = Object.entries(AI_FALLBACK_PRICE_MAP)
      .filter(([key]) => !PRICEBOOK_MAP.has(key))
      .map(([key, v]) => `${key} | ${v.unit} | ${v.name}`)
      .join("\n");
    const catalogForPrompt = fallbackLines ? `${pricebookLines}\n${fallbackLines}` : pricebookLines;

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

    console.log("[/api/estimate] materialsFound raw:", materialsFound.map((m) => `${m.item} ×${m.qty}`));

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

    const materials  = buildMaterialsFromAiTakeoff(materialsFound);
    const laborHours = calculateLaborHours(laborFactors);

    console.log("[/api/estimate] matched:", materials.length, "of", materialsFound.length, "items");
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