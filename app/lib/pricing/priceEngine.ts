import materialsJson from "../pricebook/national.materials.json";
import multipliersJson from "../pricebook/location.multipliers.json";
import monthlyJson from "../pricebook/monthly.index.json";

export type MaterialLine = {
  skuKey: string;
  name?: string; // optional fallback if not in pricebook yet
  qty: number;
  unit?: string; // optional fallback
};

export type PricedMaterialLine = {
  skuKey: string;
  name: string;
  qty: number;
  unit: string;
  baseUnitCost: number;
  adjUnitCost: number;
  lineTotal: number;
  missingFromPricebook: boolean;
};

export type PriceInputs = {
  month: string;      // "2026-03"
  state?: string;     // "NC"
  laborRate: number;  // $/hr (user adjustable later)
  markupPct: number;  // default 20 (user adjustable later)
  laborHours: number;
  materials: MaterialLine[];
};

export type PriceOutputs = {
  pricedMaterials: PricedMaterialLine[];
  materialTotal: number;
  laborTotal: number;
  subtotal: number;
  profit: number;
  finalTotal: number;
  applied: {
    state: string;
    materialMultiplier: number;
    laborMultiplier: number;
    materialMonthlyIndex: number;
    laborMonthlyIndex: number;
  };
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function safeNum(n: unknown, fallback: number) {
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

function getBaseItem(skuKey: string) {
  const items = (materialsJson as any).items as Array<any>;
  return items?.find((x) => x?.skuKey === skuKey);
}
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

function getStateMultipliers(state?: string) {
  const m = multipliersJson as any;
  const defaultState = (m?.defaultState as string) || "NC";
  const byState = (m?.byState as Record<string, any>) || {};

  const resolvedState = (state && byState[state]) ? state : defaultState;
  const entry = byState[resolvedState] || { material: 1, labor: 1 };

  return {
    state: resolvedState,
    material: safeNum(entry.material, 1),
    labor: safeNum(entry.labor, 1),
  };
}

function getMonthIndexes(month: string) {
  const mi = (monthlyJson as any)?.materialIndexByMonth || {};
  const li = (monthlyJson as any)?.laborIndexByMonth || {};
  return {
    material: safeNum(mi[month], 1),
    labor: safeNum(li[month], 1),
  };
}

export function priceEstimate(input: PriceInputs): PriceOutputs {
  const stateMult = getStateMultipliers(input.state);
  const monthIdx = getMonthIndexes(input.month);

  const pricedMaterials: PricedMaterialLine[] = (input.materials || []).map((m) => {
    const base = getBaseItem(m.skuKey);
const fallback = AI_FALLBACK_PRICE_MAP[m.skuKey];

const missingFromPricebook = !base && !fallback;
const baseUnitCost = safeNum(base?.baseUnitCost ?? fallback?.baseUnitCost, 0);

    const adjUnitCost = baseUnitCost * stateMult.material * monthIdx.material;
    const qty = safeNum(m.qty, 0);
    const lineTotal = qty * adjUnitCost;

    return {
      skuKey: m.skuKey,
      name: (base?.name as string) || m.name || m.skuKey,
      unit: (base?.unit as string) || m.unit || "ea",
      qty,
      baseUnitCost: round2(baseUnitCost),
      adjUnitCost: round2(adjUnitCost),
      lineTotal: round2(lineTotal),
      missingFromPricebook,
    };
  });

  const materialTotal = round2(pricedMaterials.reduce((sum, x) => sum + safeNum(x.lineTotal, 0), 0));

  const laborRate = safeNum(input.laborRate, 0);
  const laborHours = safeNum(input.laborHours, 0);
  const laborTotal = round2(laborHours * laborRate * stateMult.labor * monthIdx.labor);

  const subtotal = round2(materialTotal + laborTotal);

  const markupPct = safeNum(input.markupPct, 0);
  const profit = round2(subtotal * (markupPct / 100));

  const finalTotal = round2(subtotal + profit);

  return {
    pricedMaterials,
    materialTotal,
    laborTotal,
    subtotal,
    profit,
    finalTotal,
    applied: {
      state: stateMult.state,
      materialMultiplier: stateMult.material,
      laborMultiplier: stateMult.labor,
      materialMonthlyIndex: monthIdx.material,
      laborMonthlyIndex: monthIdx.labor,
    },
  };
}