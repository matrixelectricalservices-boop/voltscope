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

    const missingFromPricebook = !base;
    const baseUnitCost = safeNum(base?.baseUnitCost, 0);

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