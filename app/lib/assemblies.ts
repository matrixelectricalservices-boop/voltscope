// lib/assemblies.ts

export type MaterialSubset = "Quick Bids";

export const MATERIAL_SUBSETS: MaterialSubset[] = ["Quick Bids"];

// Keep categories, but since you're only using Quick Bids right now:
export type AssemblyCategory = "Quick Bids";

export type Assembly = {
  id: string;
  name: string;

  category: AssemblyCategory;
  subset: MaterialSubset;

  unit: "ea" | "ft" | "sq ft";
  materialCost: number;
  laborHours: number;

  description?: string;
};

export const ASSEMBLIES: Assembly[] = [
  {
    id: "res-new-construction-sqft",
    name: "Residential New Construction Electrical — per sq ft",
    category: "Quick Bids",
    subset: "Quick Bids",
    unit: "sq ft",
    materialCost: 10,
    laborHours: 0,
    description:
      "Per-square-foot pricing model for full residential rough and trim electrical installation. Includes branch circuits, devices, lighting rough-ins, panel terminations, grounding, and standard trim-out. Assumes typical single-family wood-frame construction.",
  },

  {
    id: "comm-new-construction-sqft",
    name: "Commercial New Construction Electrical — per sq ft",
    category: "Quick Bids",
    subset: "Quick Bids",
    unit: "sq ft",
    materialCost: 20,
    laborHours: 0,
    description:
      "Per-square-foot pricing model for commercial electrical scope.",
  },

  {
    id: "ev-charger-50a-lt50ft",
    name: "EV Charger — < 50 ft, 50A",
    category: "Quick Bids",
    subset: "Quick Bids",
    unit: "ea",
    materialCost: 1200,
    laborHours: 0,
    description: "Install EV charger circuit up to 50 ft run, 50A.",
  },

  {
    id: "generator-22kw-ts-loadshed",
    name: "22 kW Generator + Transfer Switch + Load Shed",
    category: "Quick Bids",
    subset: "Quick Bids",
    unit: "ea",
    materialCost: 12000,
    laborHours: 0,
    description:
      "Supply/install generator system with ATS and load management.",
  },

  {
    id: "service-changeout-200a",
    name: "Service Changeout — 200A",
    category: "Quick Bids",
    subset: "Quick Bids",
    unit: "ea",
    materialCost: 2000,
    laborHours: 0,
    description: "Service changeout to 200A (base quick bid).",
  },

  {
    id: "service-changeout-400a",
    name: "Service Changeout — 400A",
    category: "Quick Bids",
    subset: "Quick Bids",
    unit: "ea",
    materialCost: 3000,
    laborHours: 0,
    description: "Service changeout to 400A (base quick bid).",
  },

  {
    id: "rec-20a-resi",
    name: "Dedicated 15/20A Residential Circuit — up to 100 ft",
    category: "Quick Bids",
    subset: "Quick Bids",
    unit: "ea",
    materialCost: 165,
    laborHours: 3.5,
    description:
      "Install package: new 20A breaker + up to 100 ft 12/2 NM-B + device box + receptacle + staples/connectors + full make-up, labeling, and testing. Assumes attic or crawl access with standard conditions.",
  },

  {
    id: "rec-20a-comm",
    name: "Dedicated 20A Commercial Circuit — up to 100 ft",
    category: "Quick Bids",
    subset: "Quick Bids",
    unit: "ea",
    materialCost: 240,
    laborHours: 4.5,
    description:
      "Install package: new 20A breaker + up to 100 ft 12/2 MC + 4x4 box with mud ring + spec-grade receptacle + connectors/support hardware + full make-up, labeling, and testing. Assumes typical commercial wall with accessible ceiling space.",
  },
];