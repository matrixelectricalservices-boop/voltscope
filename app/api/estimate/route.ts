import OpenAI from "openai";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MaterialLine = {
  item:      string;
  qty:       number;
  unit:      string;
  unitCost:  number;  // contractor cost from AI — what YOU pay at the supply house
  lineTotal: number;
  notes?:    string;
  category:  "equipment" | "wire" | "conduit" | "devices" | "boxes" | "fittings" | "consumables" | "labor";
};

type LaborLine = {
  description: string;
  hours:       number;
  rate:        number;
  total:       number;
};

type EstimateResult = {
  summary:       string;
  assumptions:   string[];
  scopeType:     "line_item" | "assembly";
  materials:     MaterialLine[];
  labor:         LaborLine[];
  materialTotal: number;
  laborTotal:    number;
  subtotal:      number;
  markup:        number;
  finalTotal:    number;
  // New construction only
  isNewConstruction?: boolean;
  sqft?:            number;
  ratePerSqft?:     number;
};

// ---------------------------------------------------------------------------
// Step 1: extract intent
// ---------------------------------------------------------------------------

function buildIntentPrompt(): string {
  return `
You are an electrical estimating assistant. Read the job description and extract structured intent ONLY.
Return ONLY valid JSON — no markdown, no explanation.

{
  "summary": "one sentence describing the job",
  "assumptions": ["string"],
  "jobType": "ev_charger|receptacle_install|lighting_upgrade|switch_install|panel_work|service_upgrade|new_construction|warehouse|commercial|troubleshooting",
  "scopeType": "line_item|assembly",
  "scope": {
    "sqft":            number,
    "buildingType":    "residential|warehouse|commercial|office",
    "homeTier":        "standard|custom",
    "meterBase":       "none|200a|400a",
    "panels":          [{ "amperage": number, "type": "main|sub" }],
    "disconnects":     [{ "amperage": number }],
    "circuits":        [{ "amperage": number, "voltage": number, "qty": number, "terminationType": "hardwired|receptacle|switch|light" }],
    "lights":          { "qty": number, "type": "canless_wafer|recessed_can|strip|highbay|wallpack|unknown", "hasDimmer": boolean },
    "wiringMethod":    "nm|mc|emt|pvc|unknown",
    "runLengthFt":     number,
    "access":          "open|attic|crawlspace|finished",
    "wetLocation":     boolean,
    "surgeProtection": boolean,
    "groundRods":      number
  },
  "laborFactors": {
    "difficulty":   "easy|standard|hard",
    "access":       "open|attic|crawlspace|finished",
    "panelWork":    boolean,
    "wetLocation":  boolean,
    "wiringMethod": "nm|mc|emt|pvc|unknown"
  }
}

RULES:
- scopeType "assembly": use for whole-building jobs — new construction, warehouse, full house wiring, commercial buildout.
- scopeType "line_item": use for specific scopes — EV charger, lights, outlets, panel upgrade, service work.
- jobType "new_construction": new home build, new house, residential rough-in.
- jobType "warehouse": warehouse, industrial building, shop, garage (large).
- sqft: extract if mentioned, else 0.
- runLengthFt: extract if mentioned, else 0.
- groundRods: 2 for any service/panel/new construction, else 0.
- Be LITERAL — only extract what is mentioned.
`.trim();
}

// ---------------------------------------------------------------------------
// Step 2a: line-item pricing prompt
// ---------------------------------------------------------------------------

function buildLineItemPrompt(): string {
  return `
You are a licensed electrical estimating assistant with 20 years of field experience.
You receive a structured job intent. Return a precise material list and labor with CONTRACTOR PRICING.

Return ONLY valid JSON — no markdown, no explanation.

{
  "materials": [
    {
      "item":      "descriptive name (e.g. '2-pole 60A breaker', '3/4 EMT conduit', '#6 THHN black')",
      "qty":       number,
      "unit":      "ea|ft|lot",
      "unitCost":  number,
      "category":  "equipment|wire|conduit|devices|boxes|fittings|consumables",
      "notes":     "optional"
    }
  ],
  "labor": [
    {
      "description": "task description",
      "hours":       number
    }
  ]
}

PRICING RULES — use contractor (supply house) pricing, NOT retail:
  2-pole 60A breaker:        $18–22
  2-pole 50A breaker:        $16–20
  2-pole 40A breaker:        $14–18
  2-pole 30A breaker:        $12–16
  1-pole 20A breaker:        $6–9
  200A load center (40-sp):  $220–280
  125A sub panel:            $95–130
  200A disconnect:           $85–120
  Meter base 200A:           $130–175
  Meter base 400A:           $260–320
  NEMA 14-50 receptacle:     $20–28
  GFCI 20A receptacle:       $14–18
  TR 20A duplex outlet:      $3–5
  Single-pole switch:        $2–4
  LED dimmer:                $22–32
  6" canless wafer LED:      $16–22
  6" recessed can + trim:    $16–24
  3/4" EMT conduit:          $0.70–0.95/ft
  1/2" EMT conduit:          $0.45–0.65/ft
  NM-B 12/2:                 $0.70–0.90/ft
  NM-B 10/2:                 $1.10–1.40/ft
  NM-B 10/3:                 $1.80–2.20/ft
  #6 THHN:                   $0.80–1.00/ft
  #8 THHN:                   $0.50–0.65/ft
  #10 THHN:                  $0.28–0.38/ft
  MC cable 12/2:             $1.20–1.50/ft
  MC cable 6/2:              $5.50–7.50/ft
  XHHW 2/0 AL:               $1.60–2.20/ft
  3/4" EMT connector:        $0.50–0.70
  3/4" EMT coupling:         $0.35–0.50
  3/4" EMT strap:            $0.18–0.25
  1-gang new work box:       $0.90–1.20
  4-sq box 2-1/8":           $2.25–3.00
  Weatherproof box:          $7–10
  Ground rod 5/8"×8ft:       $18–26
  Surge protector (panel):   $95–130
  Misc consumables (lot):    $20–35

NEC WIRE SIZING:
  15-20A → #12 AWG | 30A → #10 | 40A → #8 | 50-60A → #6
  NM-B: indoor dry residential | MC: commercial/no NM | EMT: outdoor/exposed + THHN inside
  Wire qty = runLengthFt × 1.15

BREAKER SIZING:
  EV 32A EVSE → 40A 2-pole | EV 40A → 50A 2-pole | EV 48A → 60A 2-pole
  Dryer → 30A 2-pole | Range → 50A 2-pole | Standard outlet → 20A 1-pole

BOXES:
  Wall outlet/switch → 1-gang new work box + decora plate per device
  Outdoor device → weatherproof box + cover
  Canless LED wafer → NO box (self-mounting)
  Dimmer → dimmer_led only, NOT also a switch

EMT RUNS:
  conduit (run ft) + connectors ×2 min + couplings (ceil(run/10)-1) + straps (ceil(run/6)) + THHN per conductor

LABOR HOURS (baseline, adjust for difficulty/access):
  EV charger install (standard):    3.5–5 hrs
  Service upgrade 200A:             6–10 hrs
  Panel/breaker work:               2–4 hrs
  Per 10ft conduit run:             0.5 hrs

  DEVICE INSTALL — tiered bulk rates (includes box, wire termination, device, plate):
    1–5 devices:    0.50–0.75 hrs each
    6–15 devices:   0.25–0.40 hrs each
    16–30 devices:  0.15–0.25 hrs each
    31+ devices:    0.10–0.18 hrs each
  Use the MIDPOINT of the bracket. Apply to ALL devices when qty hits that tier.
  Example: 50 receptacles = 50 × 0.14 = 7 hrs
  Example: 20 switches    = 20 × 0.20 = 4 hrs
  Example: 50 receptacles + 20 switches = 7 + 4 = 11 hrs total — NOT 96, NOT 50+

  LIGHTING fixtures:
    1–10 fixtures:  0.40–0.60 hrs each
    11–30 fixtures: 0.25–0.35 hrs each
    31+ fixtures:   0.15–0.22 hrs each

  ACCESS MULTIPLIER (apply to total):
    Open/new construction: ×1.0
    Attic or crawlspace:   ×1.2
    Finished walls:        ×1.35

ALWAYS INCLUDE:
  misc consumables (lot, $20–35) — every job
  labels/directory — panel/service jobs only
  Do NOT include surge protector unless requested

STRICT RULES:
  1. Use midpoint of ranges for unit costs — do not use minimum.
  2. qty must use real math: wire = runLengthFt × 1.15, conduit fittings by formula above.
  3. Return 6–14 material items and 1–4 labor tasks for any real job.
  4. Do NOT pad with items not needed for this scope.
`.trim();
}

// ---------------------------------------------------------------------------
// Step 2b: assembly pricing prompt (whole-building)
// ---------------------------------------------------------------------------

function buildAssemblyPrompt(): string {
  return `
You are a licensed electrical estimating assistant with 20 years of field experience.
You receive a whole-building job intent. Return a REAL material list with actual items and quantities — NOT per-sqft categories.

Return ONLY valid JSON — no markdown, no explanation.

{
  "materials": [
    {
      "item":      "real item name (e.g. '200A main load center 40-space', 'NM-B 12/2 wire', '6\" canless wafer LED')",
      "qty":       number,
      "unit":      "ea|ft|lot",
      "unitCost":  number,
      "category":  "equipment|wire|conduit|devices|boxes|fittings|consumables",
      "notes":     "optional"
    }
  ],
  "labor": [
    {
      "description": "phase (e.g. 'Rough-in wiring', 'Trim-out & devices', 'Panel hookup & testing')",
      "hours":       number
    }
  ]
}

HOW TO CALCULATE QUANTITIES FROM SQFT:

RESIDENTIAL (per 1000 sqft, scale proportionally):
  Outlets:         1 per 150 sqft → qty = round(sqft / 150)
  Switches:        1 per 300 sqft → qty = round(sqft / 300)
  GFCI outlets:    round(sqft / 600) + 4 (bathrooms + kitchen)
  Recessed lights: 1 per 50 sqft of living area → qty = round(sqft / 50)
  Light switches/dimmers: 1 per 200 sqft → qty = round(sqft / 200)
  NM-B 12/2 wire: sqft × 2.5 ft (accounts for all branch circuits)
  NM-B 14/2 wire: sqft × 0.8 ft (lighting circuits)
  Breakers 20A 1-pole: round(sqft / 200) (general circuits)
  Breakers 15A 1-pole: round(sqft / 300) (lighting circuits)
  1-gang boxes:    outlets + switches
  Main panel (200A 40-space): 1
  Ground rods: 2
  Misc consumables: 1 lot

WAREHOUSE (per 1000 sqft):
  LED high bay fixtures: 1 per 200 sqft → qty = round(sqft / 200)
  20A duplex outlets: 1 per 500 sqft + perimeter outlets
  EMT 3/4" conduit: sqft × 1.8 ft
  THHN #12 wire: sqft × 4 ft (accounts for all circuits)
  Breakers 20A 1-pole: round(sqft / 400)
  2-pole 60A breakers (equipment): round(sqft / 2000)
  400A main panel (if >5000 sqft) or 200A panel: 1
  Meter base: 1
  Ground rods: 2
  EMT connectors: round(conduit_ft / 10) × 2
  EMT straps: round(conduit_ft / 6)
  Misc consumables: 1 lot

COMMERCIAL / OFFICE (per 1000 sqft):
  Duplex outlets: 1 per 60 sqft → qty = round(sqft / 60)
  GFCI outlets: round(sqft / 400) + 6
  Single-pole switches: round(sqft / 200)
  LED panel lights or recessed: 1 per 80 sqft
  MC cable 12/2: sqft × 3 ft
  Breakers 20A 1-pole: round(sqft / 150)
  200A panel or larger: 1
  Meter base: 1
  Ground rods: 2
  Misc consumables: 1 lot

PRICING — contractor (supply house) cost, NOT retail:
  200A load center (40-sp):  $220–280 ea
  TR 20A duplex outlet:      $3–5 ea
  GFCI 20A receptacle:       $14–18 ea
  Single-pole switch:        $2–4 ea
  LED dimmer:                $22–32 ea
  6" canless wafer LED:      $16–22 ea
  LED high bay fixture:      $120–180 ea
  LED 2x4 troffer:           $55–85 ea
  NM-B 12/2:                 $0.75–0.90/ft
  NM-B 14/2:                 $0.55–0.70/ft
  MC cable 12/2:             $1.20–1.50/ft
  3/4" EMT conduit:          $0.70–0.95/ft
  THHN #12:                  $0.18/ft
  1-gang new work box:       $0.90–1.20 ea
  Meter base 200A:           $130–175 ea
  Ground rod 5/8"×8ft:       $18–26 ea
  Misc consumables (lot):    $150–300 lot

LABOR HOURS:
  Residential rough-in:  sqft × 0.014 hrs
  Residential trim-out:  sqft × 0.010 hrs
  Warehouse rough-in:    sqft × 0.022 hrs
  Warehouse trim-out:    sqft × 0.010 hrs
  Commercial rough-in:   sqft × 0.030 hrs
  Commercial trim-out:   sqft × 0.015 hrs

RULES:
  1. Use REAL item names a customer can understand — not category labels like "Branch circuit wiring".
  2. Use midpoint of price ranges.
  3. Calculate actual quantities using the formulas above scaled to the actual sqft.
  4. If sqft = 0, use 2000 for residential, 4000 for warehouse, 3000 for commercial.
  5. Return 10–18 real material items and 2–4 labor phases.
  6. Do NOT use "sqft" as a unit — use ea, ft, or lot only.
`.trim();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clampQty(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(99999, Math.round(n * 100) / 100);
}

function sanitizeMaterials(
  raw: any[],
  materialCostIndex: number
): MaterialLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && typeof m.item === "string" && typeof m.unitCost === "number")
    .map((m) => {
      const qty      = clampQty(m.qty);
      const unitCost = round2(Math.max(0, Number(m.unitCost)) * materialCostIndex);
      return {
        item:      m.item.trim(),
        qty,
        unit:      typeof m.unit === "string" ? m.unit.trim() : "ea",
        unitCost,
        lineTotal: round2(qty * unitCost),
        notes:     typeof m.notes === "string" ? m.notes.trim() : undefined,
        category:  (["equipment","wire","conduit","devices","boxes","fittings","consumables","labor"] as const)
          .includes(m.category) ? m.category : "consumables",
      } as MaterialLine;
    });
}

function sanitizeLabor(raw: any[], laborRate: number): LaborLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((l) => l && typeof l.description === "string" && typeof l.hours === "number")
    .map((l) => {
      const hours = Math.max(0.25, Math.round(Number(l.hours) * 100) / 100);
      return {
        description: l.description.trim(),
        hours,
        rate:        laborRate,
        total:       round2(hours * laborRate),
      };
    });
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
      description?:        string;
      laborRate?:          number;
      markupPct?:          number;
      permitFee?:          number;
      materialCostIndex?:  number; // 1.0 = normal, 1.15 = materials running high
    };

    const description       = (body.description ?? "").trim();
    if (!description) return Response.json({ error: "Missing description" }, { status: 400 });

    const laborRate         = typeof body.laborRate         === "number" ? body.laborRate         : 150;
    const markupPct         = typeof body.markupPct         === "number" ? body.markupPct         : 20;
    const permitFee         = typeof body.permitFee         === "number" ? body.permitFee         : 0;
    const materialCostIndex = typeof body.materialCostIndex === "number" ? body.materialCostIndex : 1.0;

    const client = new OpenAI({ apiKey });
    console.log("[/api/estimate] start — laborRate:", laborRate, "markupPct:", markupPct, "materialCostIndex:", materialCostIndex);

    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 50_000);
    const t0         = Date.now();

    // ── Step 1: extract intent ──
    let intentRes: Awaited<ReturnType<typeof client.chat.completions.create>>;
    try {
      intentRes = await client.chat.completions.create(
        {
          model:           "gpt-4o",
          max_tokens:      600,
          temperature:     0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: buildIntentPrompt() },
            { role: "user",   content: description },
          ],
        },
        { signal: controller.signal }
      );
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof Error && (err.name === "AbortError" || err.message.includes("abort"))) throw new Error("OpenAI request timed out");
      throw err;
    }

    console.log("[/api/estimate] step1 ms:", Date.now() - t0);

    let intent: any = null;
    try { intent = JSON.parse(intentRes.choices?.[0]?.message?.content ?? ""); }
    catch { return Response.json({ error: "Model returned invalid JSON (step 1)." }, { status: 502 }); }

    console.log("[/api/estimate] jobType:", intent?.jobType, "scopeType:", intent?.scopeType, "sqft:", intent?.scope?.sqft);

    // ── Step 2: price the job ──
    const isAssembly = intent?.scopeType === "assembly";
    const prompt2    = isAssembly ? buildAssemblyPrompt() : buildLineItemPrompt();

    let pricingRes: Awaited<ReturnType<typeof client.chat.completions.create>>;
    try {
      pricingRes = await client.chat.completions.create(
        {
          model:           "gpt-4o",
          max_tokens:      1400,
          temperature:     0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: prompt2 },
            { role: "user",   content: JSON.stringify(intent) },
          ],
        },
        { signal: controller.signal }
      );
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof Error && (err.name === "AbortError" || err.message.includes("abort"))) throw new Error("OpenAI request timed out");
      throw err;
    } finally {
      clearTimeout(timeout);
    }

    console.log("[/api/estimate] step2 ms:", Date.now() - t0);

    let priced: any = null;
    try { priced = JSON.parse(pricingRes.choices?.[0]?.message?.content ?? ""); }
    catch { return Response.json({ error: "Model returned invalid JSON (step 2)." }, { status: 502 }); }

    // ── Sanitize & calculate ──
    const materials    = sanitizeMaterials(priced?.materials ?? [], materialCostIndex);
    const labor        = sanitizeLabor(priced?.labor ?? [], laborRate);

    const materialTotal = round2(materials.reduce((s, m) => s + m.lineTotal, 0));
    const laborTotal    = round2(labor.reduce((s, l) => s + l.total, 0));
    const laborHours    = round2(labor.reduce((s, l) => s + l.hours, 0));
    const subtotal      = round2(materialTotal + laborTotal + permitFee);
    const markup        = round2(subtotal * (markupPct / 100));
    const finalTotal    = round2(subtotal + markup);

    const sqft          = Number(intent?.scope?.sqft ?? 0);
    const ratePerSqft   = sqft > 0 ? round2(finalTotal / sqft) : undefined;

    const assumptions = Array.isArray(intent?.assumptions)
      ? intent.assumptions.filter((x: unknown): x is string => typeof x === "string").slice(0, 4)
      : [];

    if (materialCostIndex !== 1.0) {
      assumptions.push(`Material cost index applied: ${materialCostIndex}× (${materialCostIndex > 1 ? "prices running above" : "below"} baseline).`);
    }
    if (sqft === 0 && isAssembly) {
      assumptions.push("Square footage not provided — used default for building type.");
    }
    if (ratePerSqft) {
      assumptions.push(`Effective rate: $${ratePerSqft.toFixed(2)}/sq ft all-in.`);
    }

    console.log("[/api/estimate] materialTotal:", materialTotal, "laborTotal:", laborTotal, "finalTotal:", finalTotal, "laborHours:", laborHours);

    const result: EstimateResult = {
      summary:       typeof intent?.summary === "string" ? intent.summary.trim() : "Electrical scope estimate.",
      assumptions,
      scopeType:     isAssembly ? "assembly" : "line_item",
      materials,
      labor,
      materialTotal,
      laborTotal,
      subtotal,
      markup,
      finalTotal,
      ...(isAssembly && {
        isNewConstruction: intent?.jobType === "new_construction",
        sqft:              sqft > 0 ? sqft : undefined,
        ratePerSqft,
      }),
    };

    return Response.json({ ...result, laborHours });

  } catch (err: unknown) {
    console.error("[/api/estimate] error:", err);
    const msg    = err instanceof Error ? err.message : "Server error";
    const status = msg.includes("timed out") ? 504 : 500;
    return Response.json({ error: msg }, { status });
  }
}