export type Assembly = {
  id: string;
  name: string;
  unit: "ea" | "ft";
  materialCost: number; // per unit
  laborHours: number;   // per unit
};

export const ASSEMBLIES: Assembly[] = [
  { id: "rec-20a-resi", name: "20A Receptacle (Residential)", unit: "ea", materialCost: 18, laborHours: 0.6 },
  { id: "rec-20a-comm", name: "20A Receptacle (Commercial)", unit: "ea", materialCost: 24, laborHours: 0.8 },
  { id: "sw-1p",        name: "Single Pole Switch",          unit: "ea", materialCost: 14, laborHours: 0.5 },
  { id: "sw-3w",        name: "3-Way Switch (pair)",         unit: "ea", materialCost: 38, laborHours: 1.2 },
  { id: "can-led",      name: "6\" LED Can Light",           unit: "ea", materialCost: 45, laborHours: 0.9 },
  { id: "smoke",        name: "Hardwired Smoke Detector",    unit: "ea", materialCost: 28, laborHours: 0.5 },
  { id: "mc-122",       name: "12/2 MC Cable",               unit: "ft", materialCost: 2.10, laborHours: 0.02 },
];