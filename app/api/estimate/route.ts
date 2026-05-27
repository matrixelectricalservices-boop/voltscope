import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MaterialLine = {
  item:      string;
  qty:       number;
  unit:      string;
  unitCost:  number;
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
Return ONLY valid JSON — no markdown, no explanation, no code fences.

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
Return ONLY valid JSON — no markdown, no explanation, no code fences.

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

JOB TYPE CONTEXT (from jobType field in input):
  Residential: use NM-B wire, residential panels, standard labor rates, typical home access
  Commercial:  use MC cable or EMT, commercial panels, higher labor rates (+15%), assume harder access
  Industrial:  use EMT or rigid conduit, industrial equipment, highest labor rates (+25%), heavy-duty materials

ZIP CODE CONTEXT (from zipCode field in input):
  - High cost areas (NYC, SF, Boston, Seattle, Chicago): add 15–25% to material costs
  - Mid cost areas (most major metros): use base pricing
  - Low cost areas (rural Southeast, Midwest small cities): subtract 5–10%
  - NC, SC, GA, TN, AL, MS, AR: use base pricing or slightly below
  Always note the zip code region in assumptions.

MATERIAL PRICING (contractor cost):
  2-pole 60A breaker:        $18–22
  2-pole 50A breaker:        $16–20
  2-pole 40A breaker:        $14–18
  2-pole 30A breaker:        $12–16
  1-pole 20A breaker:        $6–9
  200A load center (40-sp):  $220–280
  125A sub panel:            $95–130
  200A disconnect:           $85–120
  Meter base 200A:           $130–175
  Meter base 320A:           $180–240
  Meter base 400A:           $260–320
  400A main disconnect:      $180–260
  500 kcmil AL XHHW:         $4.50–6.00/ft
  350 kcmil AL XHHW:         $3.20–4.50/ft
  250 kcmil AL XHHW:         $2.40–3.20/ft
  XHHW 2/0 AL:               $1.60–2.20/ft
  SER 2/0 AL cable:          $2.80–3.50/ft
  SER 4/0 AL cable:          $4.20–5.50/ft
  NEMA 14-50 receptacle:     $72–80
  NEMA 6-50 receptacle:      $18–24
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
  NM-B 8/3:                  $3.50–4.50/ft
  NM-B 6/3:                  $8.50–9.50/ft
  NM-B 6/2:                  $7.00–8.50/ft
  #6 THHN:                   $0.80–1.00/ft
  #8 THHN:                   $0.50–0.65/ft
  #10 THHN:                  $0.28–0.38/ft
  MC cable 12/2:             $1.20–1.50/ft
  MC cable 6/2:              $5.50–7.50/ft
  3/4" EMT connector:        $0.50–0.70
  3/4" EMT coupling:         $0.35–0.50
  3/4" EMT strap:            $0.18–0.25
  1-gang new work box:       $0.90–1.20
  4-sq box 2-1/8":           $2.25–3.00
  Weatherproof box:          $7–10
  Weatherproof in-use cover: $10–14
  Ground rod 5/8"×8ft:       $18–26
  Surge protector (panel):   $95–130
  Misc consumables (lot):    $20–35

NEC WIRE SIZING:
  15-20A → #12 AWG | 30A → #10 | 40A → #8 | 50-60A → #6
  NM-B: indoor dry residential | MC: commercial/no NM | EMT: outdoor/exposed + THHN inside
  Wire qty = runLengthFt × 1.15

WIRING METHOD DECISION — follow this every time:
  Interior residential, dry, concealed wall/attic: NM-B
  Exterior, exposed, wet, or commercial: EMT + THHN
  For EMT runs ALWAYS include: connectors (2 per stick), couplings (1 per 10ft), straps (1 per 6ft)
  For NM-B runs ALWAYS include: staples/straps, wire nuts, electrical tape

SERVICE ENTRANCE WIRE SIZING:
  100A → 1/0 AWG AL XHHW or #4 AWG copper
  150A → 2/0 AWG AL XHHW or #1 AWG copper
  200A → 2/0 AWG AL XHHW or 2/0 AWG copper
  320A → 350 kcmil AL XHHW
  400A → 500 kcmil AL XHHW

DEFAULT RUN LENGTHS (when not specified):
  Meter base to main panel (typical):   6 ft
  Meter base to main panel (garage):    25 ft
  EV charger from panel (garage):       30 ft
  EV charger from panel (exterior):     50 ft
  Subpanel feed:                        40 ft
  Standard branch circuit:              35 ft
  Lighting circuit: 25 ft × number of fixtures (daisy-chained)
  Always note assumed length in item notes field.

RESIDENTIAL vs COMMERCIAL SERVICE UPGRADE:
  RESIDENTIAL 400A: SER cable, 2×200A panels common, 8–12 hrs labor, $2,500–4,000 total
  COMMERCIAL 400A:  500 kcmil AL XHHW in EMT, 12–20 hrs labor, $5,000–9,000 total

EV CHARGER RESIDENTIAL — EXACT PRICING (50A or 60A circuit):
  Required materials for standard garage install, 50ft run:
    - 2-pole 60A breaker:                 $18–22
    - NM-B 6/3 (runLengthFt × 1.15):     $9.00/ft
    - NEMA 14-50 receptacle:              $72–80
    - 1-gang weatherproof box:            $8–10
    - Weatherproof in-use cover:          $10–14
    - Wire staples/straps:                $6–8
    - Misc consumables:                   $20–25
  Labor: 4 hrs for runs under 50ft, 5 hrs for longer runs
  ALWAYS use NM-B 6/3 for interior residential runs, EMT + #6 THHN for exposed/exterior
  DO NOT add junction boxes, disconnects, or conduit bodies unless run is exposed

BREAKER SIZING:
  EV 32A EVSE → 40A 2-pole | EV 40A → 50A 2-pole | EV 48A → 60A 2-pole
  Dryer → 30A 2-pole | Range → 50A 2-pole | Standard outlet → 20A 1-pole

LABOR HOURS:
  EV charger residential short run (under 50ft):    4 hrs
  EV charger residential long run (over 50ft):      5–6 hrs
  EV charger commercial/outdoor:                    6–8 hrs
  Service upgrade 200A residential:                 8–12 hrs
  Service upgrade 400A residential:                 12–16 hrs
  Service upgrade 400A commercial:                  16–24 hrs
  Per recessed light (attic access):                1.0 hr
  Per recessed light (finished ceiling):            1.5 hrs
  Panel/breaker work only:                          2–4 hrs
  Meter base swap only:                             2–3 hrs
  Per 10ft EMT conduit run:                         0.5 hrs

KNOWN CORRECTIONS — apply these always:
  - NM-B 6/3 price: $9.00/ft minimum, never use $2/ft
  - NEMA 14-50: $76 minimum, never use retail $24 price
  - EV charger labor: 4 hrs minimum for residential, never 2–3 hrs
  - Recessed lights: always 25ft of NM-B 14/2 per fixture, never flat 35ft for whole circuit
  - Service upgrade: always include ground rods (2), GEC wire, meter base
`.trim();
}

// ---------------------------------------------------------------------------
// Step 2b: assembly pricing prompt
// ---------------------------------------------------------------------------

function buildAssemblyPrompt(): string {
  return `
You are a licensed electrical estimating assistant with 20 years of field experience.
You receive a structured job intent for a whole-building or large assembly job.
Return a complete material list and labor breakdown with CONTRACTOR PRICING.
Return ONLY valid JSON — no markdown, no explanation, no code fences.

{
  "materials": [
    {
      "item":      "descriptive name",
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

Use the same pricing rules as line-item. For assembly jobs:
- Calculate wire quantities from sqft and circuit counts
- Include ALL rough-in boxes, devices, panels, service entrance
- Labor bulk rate: 31+ devices = 0.10–0.18 hrs each
- Always include: service entrance, main panel, ground rods, GEC
`.trim();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round2(n: number): number { return Math.round(n * 100) / 100; }
function clampQty(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? round2(n) : 1;
}

function sanitizeMaterials(raw: any[], materialCostIndex: number): MaterialLine[] {
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

function parseJSON(text: string): any {
  // Strip markdown code fences if Claude wraps in them
  const clean = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
  return JSON.parse(clean);
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "ANTHROPIC_API_KEY is not set." }, { status: 500 });
    }

    const body = (await req.json()) as {
      description?:        string;
      jobType?:            string;
      zipCode?:            string;
      laborRate?:          number;
      markupPct?:          number;
      permitFee?:          number;
      materialCostIndex?:  number;
    };

    const description       = (body.description ?? "").trim();
    if (!description) return Response.json({ error: "Missing description" }, { status: 400 });

    const jobType           = (body.jobType ?? "Residential").trim();
    const zipCode           = (body.zipCode ?? "").trim();
    const laborRate         = typeof body.laborRate         === "number" ? body.laborRate         : 125;
    const markupPct         = typeof body.markupPct         === "number" ? body.markupPct         : 20;
    const permitFee         = typeof body.permitFee         === "number" ? body.permitFee         : 125;
    const materialCostIndex = typeof body.materialCostIndex === "number" ? body.materialCostIndex : 1.0;

    const enrichedDescription = `JOB TYPE: ${jobType}\nZIP CODE: ${zipCode}\nDESCRIPTION: ${description}`;

    const client = new Anthropic({ apiKey });
    console.log("[/api/estimate] start — jobType:", jobType, "zip:", zipCode, "laborRate:", laborRate);

    const t0 = Date.now();

    // ── Step 1: extract intent ──
    let intentText: string;
    try {
      const res = await client.messages.create({
        model:      "claude-sonnet-4-6",
        max_tokens: 1024,
        system:     buildIntentPrompt(),
        messages:   [{ role: "user", content: enrichedDescription }],
      });
      intentText = res.content[0].type === "text" ? res.content[0].text : "";
    } catch (err) {
      console.error("[/api/estimate] step1 error:", err);
      return Response.json({ error: "Step 1 failed — please try again." }, { status: 502 });
    }

    console.log("[/api/estimate] step1 ms:", Date.now() - t0);

    let intent: any = null;
    try { intent = parseJSON(intentText); }
    catch { return Response.json({ error: "Model returned invalid JSON (step 1)." }, { status: 502 }); }

    console.log("[/api/estimate] jobType:", intent?.jobType, "scopeType:", intent?.scopeType);

    // ── Step 2: price the job ──
    const isAssembly = intent?.scopeType === "assembly";
    const prompt2    = isAssembly ? buildAssemblyPrompt() : buildLineItemPrompt();

    let pricingText: string;
    try {
      const res = await client.messages.create({
        model:      "claude-sonnet-4-6",
        max_tokens: 2048,
        system:     prompt2,
        messages:   [{ role: "user", content: JSON.stringify({ ...intent, jobType, zipCode }) }],
      });
      pricingText = res.content[0].type === "text" ? res.content[0].text : "";
    } catch (err) {
      console.error("[/api/estimate] step2 error:", err);
      return Response.json({ error: "Step 2 failed — please try again." }, { status: 502 });
    }

    console.log("[/api/estimate] step2 ms:", Date.now() - t0);

    let priced: any = null;
    try { priced = parseJSON(pricingText); }
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

    const sqft         = Number(intent?.scope?.sqft ?? 0);
    const ratePerSqft  = sqft > 0 ? round2(finalTotal / sqft) : undefined;

    const assumptions = Array.isArray(intent?.assumptions)
      ? intent.assumptions.filter((x: unknown): x is string => typeof x === "string").slice(0, 4)
      : [];

    if (materialCostIndex !== 1.0) {
      assumptions.push(`Material cost index applied: ${materialCostIndex}×`);
    }
    if (sqft === 0 && isAssembly) {
      assumptions.push("Square footage not provided — used default for building type.");
    }
    if (ratePerSqft) {
      assumptions.push(`Effective rate: $${ratePerSqft.toFixed(2)}/sq ft all-in.`);
    }

    console.log("[/api/estimate] materialTotal:", materialTotal, "laborTotal:", laborTotal, "finalTotal:", finalTotal);

    const baseSummary   = typeof intent?.summary === "string" ? intent.summary.trim() : "Electrical scope estimate.";
    const summaryPrefix = `${jobType} · ${zipCode}`;
    const summary       = `${summaryPrefix} — ${baseSummary}`;

    const result: EstimateResult = {
      summary,
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