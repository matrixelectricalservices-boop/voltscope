import Anthropic from "@anthropic-ai/sdk";

export const runtime     = "nodejs";
export const maxDuration = 90;

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
You use NECA Manual of Labor Units as your standard for labor hours.
You receive a structured job intent. Return a precise material list and labor with CONTRACTOR PRICING.
Return ONLY valid JSON — no markdown, no explanation, no code fences.

NECA LABOR UNITS (use these — whole hours only, round up):
  Receptacle/outlet install:          1 hr each
  Switch install:                     1 hr each
  Dimmer install:                     1 hr each
  Recessed light (open ceiling):      2 hrs each
  Recessed light (finished ceiling):  3 hrs each
  Panel install 200A:                 8 hrs
  Panel install 400A:                 12 hrs
  Service entrance 200A:              6 hrs
  Service entrance 400A:              10 hrs
  Meter base swap:                    4 hrs
  EV charger circuit (under 50ft):    5 hrs
  EV charger circuit (over 50ft):     7 hrs
  Per 10ft EMT conduit:               1 hr
  Ground rod installation:            1 hr each
  Circuit breaker installation:       1 hr each

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

MATERIAL PRICING — use your knowledge of current contractor supply house prices adjusted for the zip code region:
  2-pole 60A breaker:        $20
  2-pole 50A breaker:        $18
  2-pole 40A breaker:        $16
  2-pole 30A breaker:        $14
  1-pole 20A breaker:        $8
  200A load center (40-sp):  $250
  125A sub panel:            $110
  200A disconnect:           $100
  Meter base 200A:           $150
  Meter base 320A:           $210
  Meter base 400A:           $290
  400A main disconnect:      $220
  500 kcmil AL XHHW:         $5.50/ft
  350 kcmil AL XHHW:         $3.80/ft
  250 kcmil AL XHHW:         $2.80/ft
  XHHW 2/0 AL:               $1.90/ft
  SER 2/0 AL cable:          $3.20/ft
  SER 4/0 AL cable:          $4.80/ft
  NEMA 14-50 receptacle:     $76
  NEMA 6-50 receptacle:      $21
  GFCI 20A receptacle:       $16
  TR 20A duplex outlet:      $4
  Single-pole switch:        $3
  LED dimmer:                $27
  6" canless wafer LED:      $19
  6" recessed can + trim:    $20
  3/4" EMT conduit:          $0.85/ft
  1/2" EMT conduit:          $0.55/ft
  NM-B 12/2:                 $0.80/ft
  NM-B 10/2:                 $1.25/ft
  NM-B 10/3:                 $2.00/ft
  NM-B 8/3:                  $4.00/ft
  NM-B 6/3:                  $9.00/ft
  NM-B 6/2:                  $7.75/ft
  #6 THHN:                   $0.90/ft
  #8 THHN:                   $0.58/ft
  #10 THHN:                  $0.33/ft
  MC cable 12/2:             $1.35/ft
  MC cable 6/2:              $6.50/ft
  3/4" EMT connector:        $0.60
  3/4" EMT coupling:         $0.43
  3/4" EMT strap:            $0.22
  1-gang new work box:       $1.05
  4-sq box 2-1/8":           $2.60
  Weatherproof box:          $8.50
  Weatherproof in-use cover: $12
  Ground rod 5/8"×8ft:       $22
  Surge protector (panel):   $110
  Misc consumables (lot):    $25

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

LABOR HOURS — TOTAL JOB BUDGET (mid to high end, whole hours only — NO partial hours):
  Use these as the TOTAL hours for the entire job. Split across tasks but do NOT exceed the total.
  ALL hours must be whole numbers — never use decimals like 1.5 or 15.99.

  EV charger residential short run (under 50ft):    TOTAL = 5 hrs
  EV charger residential long run (over 50ft):      TOTAL = 7 hrs
  EV charger commercial/outdoor:                    TOTAL = 9 hrs
  Service upgrade 200A residential:                 TOTAL = 12 hrs
  Service upgrade 400A residential:                 TOTAL = 16 hrs
  Service upgrade 400A commercial:                  TOTAL = 20 hrs
  Meter base swap only:                             TOTAL = 4 hrs
  Panel/breaker work only:                          TOTAL = 5 hrs
  Per recessed light (attic access):                2 hrs each
  Per recessed light (finished ceiling):            3 hrs each
  Outlet/switch install:                            1 hr each
  Commercial new construction per 1000 sqft:        40 hrs
  Warehouse new construction per 1000 sqft:         35 hrs
  Residential new construction per 1000 sqft:       30 hrs

  CRITICAL RULES:
  1. ALL individual task hours must be whole numbers (1, 2, 3 etc — never 1.5, 0.75, 15.99)
  2. Sum of all labor task hours must equal or be close to the total budget above
  3. DO NOT add extra tasks like cleanup, testing, or inspection prep

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
You use NECA Manual of Labor Units as your standard for labor hours.
You receive a structured job intent for a whole-building or large assembly job.
Return a complete material list and labor breakdown with CONTRACTOR PRICING.
Return ONLY valid JSON — no markdown, no explanation, no code fences. Keep the list concise — combine similar items, max 20 material line items.

NECA LABOR UNITS for large jobs (whole hours only):
  Per outlet/device rough-in:         1 hr each
  Per light fixture:                  2 hrs each
  Per 100 sqft commercial wiring:     4 hrs
  Per 100 sqft warehouse wiring:      3 hrs
  Per 100 sqft residential wiring:    2.5 hrs
  Panel install 200A:                 8 hrs
  Panel install 400A:                 12 hrs
  Service entrance complete:          16 hrs
  Per 10ft conduit run:               1 hr

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

RULES:
- Max 20 material line items total — combine similar items (e.g. all wire as one line, all boxes as one line)
- Max 4 labor line items total
- Use contractor supply house pricing
- For warehouse/commercial: use EMT conduit and THHN wire
- Labor bulk rate for large installs: 0.15 hrs per device/fixture
- Always include: main panel, service entrance, ground rods, branch circuits, lighting fixtures
- Calculate wire from sqft: 1 circuit per 400 sqft, 2.5 wire-ft per sqft of floor area
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
      const hours = Math.max(1, Math.round(Number(l.hours)));
      return {
        description: l.description.trim(),
        hours,
        rate:        laborRate,
        total:       round2(hours * laborRate),
      };
    });
}

function parseJSON(text: string): any {
  const clean = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
  return JSON.parse(clean);
}

// ---------------------------------------------------------------------------
// Zip code → regional labor rate (high end)
// ---------------------------------------------------------------------------

function getLaborRateForZip(zip: string, jobType: string): number {
  const prefix = parseInt(zip.substring(0, 3), 10);

  // Base rates by job type (high end national average)
  const base: Record<string, number> = {
    Residential: 145,
    Commercial:  185,
    Industrial:  225,
  };
  const baseRate = base[jobType] ?? 185;

  if (isNaN(prefix)) return baseRate; // unrecognized zip → national average

  // High cost metros
  if (prefix >= 100 && prefix <= 104) return Math.round(baseRate * 1.55); // NYC
  if (prefix >= 110 && prefix <= 119) return Math.round(baseRate * 1.45); // NYC suburbs
  if (prefix >= 200 && prefix <= 205) return Math.round(baseRate * 1.35); // DC/Northern VA
  if (prefix >= 206 && prefix <= 212) return Math.round(baseRate * 1.30); // Baltimore/MD
  if (prefix >= 600 && prefix <= 609) return Math.round(baseRate * 1.35); // Chicago
  if (prefix >= 900 && prefix <= 908) return Math.round(baseRate * 1.40); // LA
  if (prefix >= 940 && prefix <= 942) return Math.round(baseRate * 1.50); // SF Bay Area
  if (prefix >= 980 && prefix <= 982) return Math.round(baseRate * 1.40); // Seattle
  if (prefix >= 970 && prefix <= 972) return Math.round(baseRate * 1.25); // Portland
  if (prefix >= 800 && prefix <= 804) return Math.round(baseRate * 1.20); // Denver
  if (prefix >= 10  && prefix <= 29)  return Math.round(baseRate * 1.30); // NE corridor

  // Mid cost
  if (prefix >= 750 && prefix <= 752) return Math.round(baseRate * 1.10); // Dallas
  if (prefix >= 770 && prefix <= 772) return Math.round(baseRate * 1.10); // Houston
  if (prefix >= 850 && prefix <= 853) return Math.round(baseRate * 1.05); // Phoenix
  if (prefix >= 480 && prefix <= 482) return Math.round(baseRate * 1.15); // Detroit
  if (prefix >= 553 && prefix <= 554) return Math.round(baseRate * 1.15); // Minneapolis
  if (prefix >= 303 && prefix <= 305) return Math.round(baseRate * 1.05); // Atlanta
  if (prefix >= 331 && prefix <= 334) return Math.round(baseRate * 1.10); // Miami

  // Low cost (Southeast, rural)
  if (prefix >= 270 && prefix <= 289) return Math.round(baseRate * 0.90); // NC
  if (prefix >= 290 && prefix <= 299) return Math.round(baseRate * 0.90); // SC
  if (prefix >= 350 && prefix <= 369) return Math.round(baseRate * 0.85); // AL
  if (prefix >= 380 && prefix <= 399) return Math.round(baseRate * 0.85); // MS/TN
  if (prefix >= 370 && prefix <= 379) return Math.round(baseRate * 0.88); // TN
  if (prefix >= 300 && prefix <= 319) return Math.round(baseRate * 0.92); // GA
  if (prefix >= 700 && prefix <= 729) return Math.round(baseRate * 0.88); // Louisiana/AR

  // National average high end (unrecognized zip)
  return baseRate;
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
    const laborRate         = zipCode.length === 5
      ? getLaborRateForZip(zipCode, jobType)
      : (typeof body.laborRate === "number" ? body.laborRate : 145);
    const markupPct         = typeof body.markupPct         === "number" ? body.markupPct         : 20;
    const permitFee         = typeof body.permitFee         === "number" ? body.permitFee         : 125;
    const materialCostIndex = typeof body.materialCostIndex === "number" ? body.materialCostIndex : 1.0;

    const enrichedDescription = `JOB TYPE: ${jobType}\nZIP CODE: ${zipCode}\nDESCRIPTION: ${description}`;

    const client = new Anthropic({ apiKey });
    console.log("[/api/estimate] start — jobType:", jobType, "zip:", zipCode, "laborRate:", laborRate);

    const t0 = Date.now();

    // ── Run step 1 and pricebook load in parallel ──
    const [intentResult, pricebookResult] = await Promise.allSettled([

      // Step 1: extract intent
      client.messages.create({
        model:       "claude-sonnet-4-6",
        max_tokens:  1024,
        temperature: 0,
        system:      buildIntentPrompt(),
        messages:    [{ role: "user", content: enrichedDescription }],
      }),

      // Pricebook: load from Supabase with timeout
      Promise.race([
        (async () => {
          const { createClient } = await import("@supabase/supabase-js");
          const db = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          const { data } = await db.from("pricebook").select("item_name, unit_cost, unit");
          return data ?? [];
        })(),
        new Promise<[]>(r => setTimeout(() => r([]), 5000)), // 5s timeout
      ]),
    ]);

    // Extract intent
    if (intentResult.status === "rejected") {
      console.error("[/api/estimate] step1 error:", intentResult.reason);
      return Response.json({ error: "Step 1 failed — please try again." }, { status: 502 });
    }
    const intentText = intentResult.value.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");

    // Build pricebook context
    let pricebookContext = "";
    if (pricebookResult.status === "fulfilled" && pricebookResult.value.length > 0) {
      const prices = pricebookResult.value as Array<{ item_name: string; unit_cost: number; unit: string }>;
      const priceList = prices.map(p => `  ${p.item_name}: $${p.unit_cost}/${p.unit}`).join("\n");
      pricebookContext = `\n\nCURRENT PRICEBOOK (use these exact prices — do not override):\n${priceList}`;
      console.log("[/api/estimate] loaded", prices.length, "pricebook items");
    } else {
      console.warn("[/api/estimate] pricebook not loaded, using defaults");
    }

    console.log("[/api/estimate] step1 + pricebook ms:", Date.now() - t0);

    let intent: any = null;
    try { intent = parseJSON(intentText); }
    catch { return Response.json({ error: "Model returned invalid JSON (step 1)." }, { status: 502 }); }

    console.log("[/api/estimate] jobType:", intent?.jobType, "scopeType:", intent?.scopeType);

    // ── Step 2: price the job ──
    const isAssembly = intent?.scopeType === "assembly";
    const prompt2    = isAssembly ? buildAssemblyPrompt() : buildLineItemPrompt();
    const priceContext = pricebookContext;

    let pricingText: string;
    try {
      const res = await client.messages.create({
        model:       "claude-sonnet-4-6",
        max_tokens:  4096,
        temperature: 0,
        system:      prompt2,
        messages:    [{ role: "user", content: JSON.stringify({ ...intent, jobType, zipCode }) + priceContext }],
      });
      pricingText = res.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    } catch (err) {
      console.error("[/api/estimate] step2 error:", err);
      return Response.json({ error: "Step 2 failed — please try again." }, { status: 502 });
    }

    console.log("[/api/estimate] step2 ms:", Date.now() - t0);

    let priced: any = null;
    try { priced = parseJSON(pricingText); }
    catch {
      console.error("[/api/estimate] step2 raw response:", pricingText.substring(0, 500));
      return Response.json({ error: "Model returned invalid JSON (step 2)." }, { status: 502 });
    }

    // ── Sanitize & calculate ──
    // Strip permit fee from materials — we handle it separately
    const permitFromMaterials = priced?.materials?.find((m: any) =>
      typeof m.item === "string" && m.item.toLowerCase().includes("permit")
    );
    const suggestedPermitFee = permitFromMaterials
      ? Math.round(Number(permitFromMaterials.unitCost ?? permitFromMaterials.lineTotal ?? permitFee))
      : permitFee;

    const rawMaterials = (priced?.materials ?? []).filter((m: any) =>
      typeof m.item === "string" && !m.item.toLowerCase().includes("permit")
    );

    const materials    = sanitizeMaterials(rawMaterials, materialCostIndex);
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

    return Response.json({ ...result, laborHours, laborRate, suggestedPermitFee });

  } catch (err: unknown) {
    console.error("[/api/estimate] error:", err);
    const msg    = err instanceof Error ? err.message : "Server error";
    const status = msg.includes("timed out") ? 504 : 500;
    return Response.json({ error: msg }, { status });
  }
}