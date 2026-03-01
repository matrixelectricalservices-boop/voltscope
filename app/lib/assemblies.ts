

export type MaterialSubset =
  | "Panels"
  | "Devices"
  | "Wiring"
  | "Lighting"
  | "Conduit"
  | "Breakers"
  | "Boxes";

export const MATERIAL_SUBSETS: MaterialSubset[] = [
  "Panels",
  "Devices",
  "Wiring",
  "Lighting",
  "Conduit",
  "Breakers",
  "Boxes",
];

// Keep your existing categories as “job categories”
export type AssemblyCategory =
  | "Devices"
  | "Switching"
  | "Lighting"
  | "Life Safety"
  | "Panels"
  | "EV Charging"
  | "Exterior"
  | "Wiring Methods"
  | "Low Voltage";

export type Assembly = {
  id: string;
  name: string;

  category: AssemblyCategory;
  subset: MaterialSubset;

  unit: "ea" | "ft" | "sq ft";
  materialCost: number;
  laborHours: number;

  description?: string; // NEW
};

export const ASSEMBLIES: Assembly[] = [
  // Devices
  
{
  id: "rec-20a-resi",
  name: "Dedicated 15/20A Residential Circuit — up to 100 ft",
  category: "Wiring Methods",
  subset: "Wiring",
  unit: "ea",
  materialCost: 165,
  laborHours: 3.5,
  description:
    "Install package: new 20A breaker + up to 100 ft 12/2 NM-B + device box + receptacle + staples/connectors + full make-up, labeling, and testing. Assumes attic or crawl access with standard conditions.",
},
{
  id: "rec-20a-comm",
  name: "Dedicated 20A Commercial Circuit — up to 100 ft",
  category: "Wiring Methods",
  subset: "Wiring",
  unit: "ea",
  materialCost: 240,
  laborHours: 4.5,
  description:
    "Install package: new 20A breaker + up to 100 ft 12/2 MC + 4x4 box with mud ring + spec-grade receptacle + connectors/support hardware + full make-up, labeling, and testing. Assumes typical commercial wall with accessible ceiling space.",
},
{
  id: "res-new-construction-sqft",
  name: "Residential New Construction Electrical (Per Sq Ft)",
  category: "Wiring Methods",
  subset: "Wiring",
  unit: "sq ft",
  materialCost: 10,
  laborHours: 0,
  description:
    "Per-square-foot pricing model for full residential rough and trim electrical installation. Includes branch circuits, devices, lighting rough-ins, panel terminations, grounding, and standard trim-out. Assumes typical single-family wood-frame construction.",
}
];