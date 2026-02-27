export type EstimateType =
  | "Residential"
  | "Light Commercial"
  | "Service"
  | "Panel Upgrade"
  | "EV Charger"
  | "Pool/Hot Tub"
  | "Lighting Upgrade"
  | "Landscape Lighting"
  | "Generator";

export const ESTIMATE_TYPES: { id: EstimateType; label: string }[] = [
  { id: "Residential", label: "Residential" },
  { id: "Light Commercial", label: "Light Commercial" },
  { id: "Service", label: "Service Call" },
  { id: "Panel Upgrade", label: "Panel Upgrade" },
  { id: "EV Charger", label: "EV Charger" },
  { id: "Pool/Hot Tub", label: "Pool / Hot Tub" },
  { id: "Lighting Upgrade", label: "Lighting Upgrade" },
  { id: "Landscape Lighting", label: "Landscape Lighting" },
  { id: "Generator", label: "Generator" },
];

// Which assembly IDs show up for each estimate type.
// Overlap is expected and fine.
export const ALLOWED_ASSEMBLY_IDS: Record<EstimateType, string[]> = {
  Residential: [
    // Devices / switching / lighting
    "rec-20a-resi",
    "gfi-resi",
    "wp-gfi",
    "sw-1p",
    "sw-3w",
    "dim-resi",
    "occ-sensor",
    "wafer-led",
    "can-led",
    "fixture-swap",
    "vanity-led",
    "smoke",
    "smoke-co",
    // Residential wiring methods
    "nm-142",
    "nm-122",
    "nm-103",
  ],

  "Light Commercial": [
    "rec-20a-comm",
    "occ-sensor",
    "sw-1p",
    "dim-resi",
    "wafer-led",
    "can-led",
    "fixture-swap",
    "vanity-led",
    "smoke",
    "smoke-co",
    // Commercial wiring methods
    "mc-122",
    "mc-123",
    "emtl-1-2",
    "emtl-3-4",
    // Panels/breakers
    "breaker-1p",
    "breaker-2p",
    "subpanel-100",
  ],

  Service: [
    "rec-20a-resi",
    "gfi-resi",
    "wp-gfi",
    "sw-1p",
    "dim-resi",
    "fixture-swap",
    "smoke",
    "smoke-co",
    // Common “service” adders
    "troubleshoot-hr",
    "service-call-trip",
  ],

  "Panel Upgrade": [
    "panel-200-upgrade",
    "subpanel-100",
    "breaker-1p",
    "breaker-2p",
    "ground-rod-set",
    "surge-protector-wholehome",
  ],

  "EV Charger": [
    "ev-install-basic",
    "ev-50a-circuit",
    "breaker-2p",
    "emtl-3-4",
    "nm-63",
    "thhn-63",
    "disconnect-60a",
    "surge-protector-wholehome",
  ],

  "Pool/Hot Tub": [
    // Core power + protection items
    "hot-tub-circuit-50a",
    "pool-pump-circuit-20a",
    "gfci-breaker-2p",
    "gfci-breaker-1p",
    "disconnect-60a",
    "disconnect-nema3r",
    "bonding-grid-setup",
    "bonding-lug",
    // Wiring methods likely used
    "emtl-3-4",
    "emtl-1-2",
    "thhn-63",
    "thhn-122",
  ],

  "Lighting Upgrade": [
    // Swaps/upgrades + controls
    "fixture-swap",
    "wafer-led",
    "can-led",
    "vanity-led",
    "ext-light-wall",
    "photo-cell",
    "dim-resi",
    "occ-sensor",
    // Common wiring
    "nm-142",
    "nm-122",
    "mc-122",
  ],

  "Landscape Lighting": [
    // Low voltage landscape ecosystem
    "landscape-xfmr-300w",
    "landscape-fixture",
    "landscape-wire-12-2",
    "landscape-connector",
    "landscape-timer-photocell",
    // Sometimes you need power to a transformer
    "wp-gfi",
    "emtl-1-2",
    "nm-122",
  ],

  Generator: [
    // Inlet + interlock / transfer
    "gen-inlet-50a",
    "gen-inlet-30a",
    "interlock-kit",
    "manual-transfer-switch",
    "breaker-2p",
    "disconnect-60a",
    // Common wiring methods
    "nm-103",
    "thhn-63",
    "emtl-3-4",
    // Often sold together
    "surge-protector-wholehome",
  ],
};