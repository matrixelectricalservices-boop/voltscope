

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

  // Job category (existing)
  category: AssemblyCategory;

  // NEW: Material subset (the filter tabs/dropdown you requested)
  subset: MaterialSubset;

  unit: "ea" | "ft";
  materialCost: number; // per unit
  laborHours: number; // per unit
};

export const ASSEMBLIES: Assembly[] = [
  // Devices
  {
    id: "rec-20a-resi",
    name: "20A Receptacle (Residential)",
    category: "Devices",
    subset: "Devices",
    unit: "ea",
    materialCost: 18,
    laborHours: 0.6,
  },
  {
    id: "rec-20a-comm",
    name: "20A Receptacle (Commercial)",
    category: "Devices",
    subset: "Devices",
    unit: "ea",
    materialCost: 24,
    laborHours: 0.8,
  },
  {
    id: "gfi-resi",
    name: "GFCI Receptacle (Residential)",
    category: "Devices",
    subset: "Devices",
    unit: "ea",
    materialCost: 28,
    laborHours: 0.7,
  },
  {
    id: "wp-gfi",
    name: "WP GFCI (Exterior, In-Use Cover)",
    category: "Exterior",
    subset: "Devices",
    unit: "ea",
    materialCost: 58,
    laborHours: 1.0,
  },
  {
    id: "rec-240v",
    name: "240V Receptacle (Range/Dryer Style)",
    category: "Devices",
    subset: "Devices",
    unit: "ea",
    materialCost: 42,
    laborHours: 1.0,
  },

  // Switching -> Devices subset
  {
    id: "sw-1p",
    name: "Single Pole Switch",
    category: "Switching",
    subset: "Devices",
    unit: "ea",
    materialCost: 14,
    laborHours: 0.5,
  },
  {
    id: "sw-3w",
    name: "3-Way Switch (pair)",
    category: "Switching",
    subset: "Devices",
    unit: "ea",
    materialCost: 38,
    laborHours: 1.2,
  },
  {
    id: "dim-resi",
    name: "Dimmer (Residential)",
    category: "Switching",
    subset: "Devices",
    unit: "ea",
    materialCost: 32,
    laborHours: 0.7,
  },
  {
    id: "occ-sensor",
    name: "Occupancy Sensor (Wall)",
    category: "Switching",
    subset: "Devices",
    unit: "ea",
    materialCost: 45,
    laborHours: 0.9,
  },

  // Lighting
  {
    id: "can-led",
    name: '6" LED Can Light',
    category: "Lighting",
    subset: "Lighting",
    unit: "ea",
    materialCost: 45,
    laborHours: 0.9,
  },
  {
    id: "wafer-led",
    name: '6" Wafer LED',
    category: "Lighting",
    subset: "Lighting",
    unit: "ea",
    materialCost: 28,
    laborHours: 0.7,
  },
  {
    id: "fixture-swap",
    name: "Fixture Swap (Existing Box)",
    category: "Lighting",
    subset: "Lighting",
    unit: "ea",
    materialCost: 0,
    laborHours: 0.6,
  },
  {
    id: "vanity-led",
    name: "Vanity Light (Wall Mount)",
    category: "Lighting",
    subset: "Lighting",
    unit: "ea",
    materialCost: 85,
    laborHours: 0.9,
  },

  // Life Safety -> Devices subset
  {
    id: "smoke",
    name: "Hardwired Smoke Detector",
    category: "Life Safety",
    subset: "Devices",
    unit: "ea",
    materialCost: 28,
    laborHours: 0.5,
  },
  {
    id: "smoke-co",
    name: "Hardwired Smoke/CO Combo",
    category: "Life Safety",
    subset: "Devices",
    unit: "ea",
    materialCost: 48,
    laborHours: 0.6,
  },

  // Panels
  {
    id: "panel-200-upgrade",
    name: "200A Panel Upgrade (Base)",
    category: "Panels",
    subset: "Panels",
    unit: "ea",
    materialCost: 950,
    laborHours: 10,
  },
  {
    id: "subpanel-100",
    name: "100A Subpanel (Base)",
    category: "Panels",
    subset: "Panels",
    unit: "ea",
    materialCost: 380,
    laborHours: 5.5,
  },

  // Breakers (these were previously under Panels category)
  {
    id: "breaker-1p",
    name: "Breaker (1-Pole)",
    category: "Panels",
    subset: "Breakers",
    unit: "ea",
    materialCost: 18,
    laborHours: 0.2,
  },
  {
    id: "breaker-2p",
    name: "Breaker (2-Pole)",
    category: "Panels",
    subset: "Breakers",
    unit: "ea",
    materialCost: 38,
    laborHours: 0.25,
  },

  // EV Charging -> Wiring subset (it’s fundamentally a circuit/install package)
  {
    id: "ev-50a-circuit",
    name: "EV Circuit (50A) (Base)",
    category: "EV Charging",
    subset: "Wiring",
    unit: "ea",
    materialCost: 280,
    laborHours: 3.5,
  },
  {
    id: "ev-install-basic",
    name: "EV Charger Install (Customer-Supplied) (Basic)",
    category: "EV Charging",
    subset: "Devices",
    unit: "ea",
    materialCost: 60,
    laborHours: 2.5,
  },

  // Exterior (mixed)
  {
    id: "ext-light-wall",
    name: "Exterior Wall Light (New)",
    category: "Exterior",
    subset: "Lighting",
    unit: "ea",
    materialCost: 90,
    laborHours: 1.5,
  },
  {
    id: "photo-cell",
    name: "Photocell Control (Add-On)",
    category: "Exterior",
    subset: "Devices",
    unit: "ea",
    materialCost: 35,
    laborHours: 0.6,
  },

  // Wiring Methods (per-foot) -> split into Wiring vs Conduit
  {
    id: "mc-122",
    name: "12/2 MC Cable",
    category: "Wiring Methods",
    subset: "Wiring",
    unit: "ft",
    materialCost: 2.1,
    laborHours: 0.02,
  },
  {
    id: "mc-123",
    name: "12/3 MC Cable",
    category: "Wiring Methods",
    subset: "Wiring",
    unit: "ft",
    materialCost: 3.2,
    laborHours: 0.025,
  },
  {
    id: "emtl-1-2",
    name: 'EMT 1/2" (Installed)',
    category: "Wiring Methods",
    subset: "Conduit",
    unit: "ft",
    materialCost: 0.55,
    laborHours: 0.03,
  },
  {
    id: "emtl-3-4",
    name: 'EMT 3/4" (Installed)',
    category: "Wiring Methods",
    subset: "Conduit",
    unit: "ft",
    materialCost: 0.85,
    laborHours: 0.035,
  },

  // Low Voltage -> mix Wiring vs Lighting
  {
    id: "cat6-drop",
    name: "CAT6 Drop (1 location)",
    category: "Low Voltage",
    subset: "Wiring",
    unit: "ea",
    materialCost: 35,
    laborHours: 1.0,
  },
  {
    id: "cam-drop",
    name: "Camera Drop (Cable + Termination)",
    category: "Low Voltage",
    subset: "Wiring",
    unit: "ea",
    materialCost: 55,
    laborHours: 1.2,
  },

  // Residential NM (Romex) -> Wiring
  {
    id: "nm-142",
    name: "14/2 NM-B (Romex)",
    category: "Wiring Methods",
    subset: "Wiring",
    unit: "ft",
    materialCost: 0.55,
    laborHours: 0.015,
  },
  {
    id: "nm-122",
    name: "12/2 NM-B (Romex)",
    category: "Wiring Methods",
    subset: "Wiring",
    unit: "ft",
    materialCost: 0.75,
    laborHours: 0.016,
  },
  {
    id: "nm-103",
    name: "10/3 NM-B (Romex)",
    category: "Wiring Methods",
    subset: "Wiring",
    unit: "ft",
    materialCost: 2.1,
    laborHours: 0.02,
  },
  {
    id: "nm-63",
    name: "6/3 NM-B (Romex)",
    category: "Wiring Methods",
    subset: "Wiring",
    unit: "ft",
    materialCost: 6.5,
    laborHours: 0.03,
  },

  // THHN -> Wiring
  {
    id: "thhn-63",
    name: "THHN #6 (per ft, one conductor)",
    category: "Wiring Methods",
    subset: "Wiring",
    unit: "ft",
    materialCost: 0.95,
    laborHours: 0.01,
  },
  {
    id: "thhn-122",
    name: "THHN #12 (per ft, one conductor)",
    category: "Wiring Methods",
    subset: "Wiring",
    unit: "ft",
    materialCost: 0.18,
    laborHours: 0.006,
  },

  // Service / troubleshooting adders -> Devices
  {
    id: "service-call-trip",
    name: "Service Call / Trip Charge",
    category: "Devices",
    subset: "Devices",
    unit: "ea",
    materialCost: 0,
    laborHours: 0.0,
  },
  {
    id: "troubleshoot-hr",
    name: "Troubleshooting (per hour)",
    category: "Devices",
    subset: "Devices",
    unit: "ea",
    materialCost: 0,
    laborHours: 1.0,
  },

  // Panels / protection (mix Panels vs Breakers)
  {
    id: "gfci-breaker-1p",
    name: "GFCI Breaker (1-Pole)",
    category: "Panels",
    subset: "Breakers",
    unit: "ea",
    materialCost: 65,
    laborHours: 0.25,
  },
  {
    id: "gfci-breaker-2p",
    name: "GFCI Breaker (2-Pole)",
    category: "Panels",
    subset: "Breakers",
    unit: "ea",
    materialCost: 130,
    laborHours: 0.3,
  },
  {
    id: "surge-protector-wholehome",
    name: "Whole-Home Surge Protector (Add-On)",
    category: "Panels",
    subset: "Panels",
    unit: "ea",
    materialCost: 180,
    laborHours: 1.0,
  },
  {
    id: "ground-rod-set",
    name: "Ground Rod Set (2 rods + clamps)",
    category: "Panels",
    subset: "Panels",
    unit: "ea",
    materialCost: 55,
    laborHours: 1.2,
  },

  // Disconnects / outdoor gear -> Panels (you explicitly wanted disconnects under Panels)
  {
    id: "disconnect-60a",
    name: "Disconnect Switch (60A)",
    category: "Exterior",
    subset: "Panels",
    unit: "ea",
    materialCost: 65,
    laborHours: 1.0,
  },
  {
    id: "disconnect-nema3r",
    name: "Disconnect Enclosure (NEMA 3R) (Add-On)",
    category: "Exterior",
    subset: "Panels",
    unit: "ea",
    materialCost: 35,
    laborHours: 0.2,
  },

  // Pool / hot tub bonding -> Wiring
  {
    id: "bonding-grid-setup",
    name: "Bonding Grid Setup (Pool/Hot Tub) (Base)",
    category: "Exterior",
    subset: "Wiring",
    unit: "ea",
    materialCost: 75,
    laborHours: 2.0,
  },
  {
    id: "bonding-lug",
    name: "Bonding Lug / Clamp (each)",
    category: "Exterior",
    subset: "Wiring",
    unit: "ea",
    materialCost: 6,
    laborHours: 0.05,
  },

  // Pool / hot tub circuits -> Wiring
  {
    id: "hot-tub-circuit-50a",
    name: "Hot Tub Circuit (50A) (Base)",
    category: "Exterior",
    subset: "Wiring",
    unit: "ea",
    materialCost: 320,
    laborHours: 4.0,
  },
  {
    id: "pool-pump-circuit-20a",
    name: "Pool Pump Circuit (20A) (Base)",
    category: "Exterior",
    subset: "Wiring",
    unit: "ea",
    materialCost: 180,
    laborHours: 2.8,
  },

  // Generator -> Panels
  {
    id: "gen-inlet-30a",
    name: "Generator Inlet (30A) (Base)",
    category: "Exterior",
    subset: "Panels",
    unit: "ea",
    materialCost: 160,
    laborHours: 2.5,
  },
  {
    id: "gen-inlet-50a",
    name: "Generator Inlet (50A) (Base)",
    category: "Exterior",
    subset: "Panels",
    unit: "ea",
    materialCost: 220,
    laborHours: 3.0,
  },
  {
    id: "interlock-kit",
    name: "Panel Interlock Kit (Add-On)",
    category: "Panels",
    subset: "Panels",
    unit: "ea",
    materialCost: 85,
    laborHours: 1.2,
  },
  {
    id: "manual-transfer-switch",
    name: "Manual Transfer Switch (Base)",
    category: "Panels",
    subset: "Panels",
    unit: "ea",
    materialCost: 420,
    laborHours: 5.0,
  },

  // Landscape lighting (low voltage) -> mix Lighting vs Wiring
  {
    id: "landscape-xfmr-300w",
    name: "Landscape Transformer (300W)",
    category: "Low Voltage",
    subset: "Lighting",
    unit: "ea",
    materialCost: 140,
    laborHours: 1.2,
  },
  {
    id: "landscape-fixture",
    name: "Landscape Light Fixture (each)",
    category: "Low Voltage",
    subset: "Lighting",
    unit: "ea",
    materialCost: 38,
    laborHours: 0.4,
  },
  {
    id: "landscape-wire-12-2",
    name: "Landscape Wire 12/2 (per ft)",
    category: "Low Voltage",
    subset: "Wiring",
    unit: "ft",
    materialCost: 0.55,
    laborHours: 0.01,
  },
  {
    id: "landscape-connector",
    name: "Landscape Connector / Splice (each)",
    category: "Low Voltage",
    subset: "Wiring",
    unit: "ea",
    materialCost: 3.5,
    laborHours: 0.05,
  },
  {
    id: "landscape-timer-photocell",
    name: "Landscape Timer/Photocell (Add-On)",
    category: "Low Voltage",
    subset: "Lighting",
    unit: "ea",
    materialCost: 28,
    laborHours: 0.4,
  },
];