import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

export const runtime     = "nodejs";
export const maxDuration = 300;

const ITEMS_TO_PRICE = [
  // Breakers
  { key: "breaker_1p_15a",    name: "1-pole 15A breaker",               unit: "ea",  category: "equipment" },
  { key: "breaker_1p_20a",    name: "1-pole 20A breaker",               unit: "ea",  category: "equipment" },
  { key: "breaker_1p_afci",   name: "1-pole 20A AFCI breaker",          unit: "ea",  category: "equipment" },
  { key: "breaker_1p_gfci",   name: "1-pole 20A GFCI breaker",          unit: "ea",  category: "equipment" },
  { key: "breaker_2p_20a",    name: "2-pole 20A breaker",               unit: "ea",  category: "equipment" },
  { key: "breaker_2p_30a",    name: "2-pole 30A breaker",               unit: "ea",  category: "equipment" },
  { key: "breaker_2p_40a",    name: "2-pole 40A breaker",               unit: "ea",  category: "equipment" },
  { key: "breaker_2p_50a",    name: "2-pole 50A breaker",               unit: "ea",  category: "equipment" },
  { key: "breaker_2p_60a",    name: "2-pole 60A breaker",               unit: "ea",  category: "equipment" },
  { key: "breaker_2p_100a",   name: "2-pole 100A breaker",              unit: "ea",  category: "equipment" },
  // Panels & Service
  { key: "panel_100a_20sp",   name: "100A 20-space load center",        unit: "ea",  category: "equipment" },
  { key: "panel_200a_40sp",   name: "200A 40-space load center",        unit: "ea",  category: "equipment" },
  { key: "panel_125a_sub",    name: "125A sub panel 24-space",          unit: "ea",  category: "equipment" },
  { key: "panel_60a_sub",     name: "60A sub panel",                    unit: "ea",  category: "equipment" },
  { key: "disconnect_60a",    name: "60A fusible disconnect",           unit: "ea",  category: "equipment" },
  { key: "disconnect_100a",   name: "100A disconnect",                  unit: "ea",  category: "equipment" },
  { key: "disconnect_200a",   name: "200A disconnect",                  unit: "ea",  category: "equipment" },
  { key: "disconnect_400a",   name: "400A main disconnect",             unit: "ea",  category: "equipment" },
  { key: "meter_base_100a",   name: "100A meter base",                  unit: "ea",  category: "equipment" },
  { key: "meter_base_200a",   name: "200A meter base",                  unit: "ea",  category: "equipment" },
  { key: "meter_base_320a",   name: "320A meter base",                  unit: "ea",  category: "equipment" },
  { key: "meter_base_400a",   name: "400A meter base",                  unit: "ea",  category: "equipment" },
  { key: "surge_panel",       name: "whole home panel surge protector", unit: "ea",  category: "equipment" },
  { key: "transfer_switch",   name: "30A manual transfer switch",       unit: "ea",  category: "equipment" },
  // NM-B Wire
  { key: "nmb_142",           name: "NM-B 14/2 wire",                   unit: "ft",  category: "wire" },
  { key: "nmb_143",           name: "NM-B 14/3 wire",                   unit: "ft",  category: "wire" },
  { key: "nmb_122",           name: "NM-B 12/2 wire",                   unit: "ft",  category: "wire" },
  { key: "nmb_123",           name: "NM-B 12/3 wire",                   unit: "ft",  category: "wire" },
  { key: "nmb_102",           name: "NM-B 10/2 wire",                   unit: "ft",  category: "wire" },
  { key: "nmb_103",           name: "NM-B 10/3 wire",                   unit: "ft",  category: "wire" },
  { key: "nmb_83",            name: "NM-B 8/3 wire",                    unit: "ft",  category: "wire" },
  { key: "nmb_63",            name: "NM-B 6/3 wire",                    unit: "ft",  category: "wire" },
  // THHN Wire
  { key: "thhn_14",           name: "#14 THHN wire",                    unit: "ft",  category: "wire" },
  { key: "thhn_12",           name: "#12 THHN wire",                    unit: "ft",  category: "wire" },
  { key: "thhn_10",           name: "#10 THHN wire",                    unit: "ft",  category: "wire" },
  { key: "thhn_8",            name: "#8 THHN wire",                     unit: "ft",  category: "wire" },
  { key: "thhn_6",            name: "#6 THHN wire",                     unit: "ft",  category: "wire" },
  { key: "thhn_4",            name: "#4 THHN wire",                     unit: "ft",  category: "wire" },
  { key: "thhn_2",            name: "#2 THHN wire",                     unit: "ft",  category: "wire" },
  { key: "thhn_1o",           name: "#1/0 THHN wire",                   unit: "ft",  category: "wire" },
  // Service Entrance Wire
  { key: "ser_2o_al",         name: "SER 2/0 aluminum cable",           unit: "ft",  category: "wire" },
  { key: "ser_4o_al",         name: "SER 4/0 aluminum cable",           unit: "ft",  category: "wire" },
  { key: "xhhw_2o_al",        name: "XHHW 2/0 aluminum",               unit: "ft",  category: "wire" },
  { key: "xhhw_350_al",       name: "350 kcmil AL XHHW",               unit: "ft",  category: "wire" },
  { key: "xhhw_500_al",       name: "500 kcmil AL XHHW",               unit: "ft",  category: "wire" },
  // MC Cable
  { key: "mc_142",            name: "MC cable 14/2",                    unit: "ft",  category: "wire" },
  { key: "mc_122",            name: "MC cable 12/2",                    unit: "ft",  category: "wire" },
  { key: "mc_102",            name: "MC cable 10/2",                    unit: "ft",  category: "wire" },
  { key: "mc_62",             name: "MC cable 6/2",                     unit: "ft",  category: "wire" },
  // EMT Conduit
  { key: "emt_12",            name: "1/2 inch EMT conduit",             unit: "ft",  category: "conduit" },
  { key: "emt_34",            name: "3/4 inch EMT conduit",             unit: "ft",  category: "conduit" },
  { key: "emt_1in",           name: "1 inch EMT conduit",               unit: "ft",  category: "conduit" },
  { key: "emt_114",           name: "1-1/4 inch EMT conduit",           unit: "ft",  category: "conduit" },
  { key: "emt_2in",           name: "2 inch EMT conduit",               unit: "ft",  category: "conduit" },
  // EMT Fittings
  { key: "emt_12_conn",       name: "1/2 inch EMT connector",           unit: "ea",  category: "conduit" },
  { key: "emt_34_conn",       name: "3/4 inch EMT connector",           unit: "ea",  category: "conduit" },
  { key: "emt_1in_conn",      name: "1 inch EMT connector",             unit: "ea",  category: "conduit" },
  { key: "emt_12_coupl",      name: "1/2 inch EMT coupling",            unit: "ea",  category: "conduit" },
  { key: "emt_34_coupl",      name: "3/4 inch EMT coupling",            unit: "ea",  category: "conduit" },
  { key: "emt_12_strap",      name: "1/2 inch EMT strap",               unit: "ea",  category: "conduit" },
  { key: "emt_34_strap",      name: "3/4 inch EMT strap",               unit: "ea",  category: "conduit" },
  { key: "lb_34",             name: "3/4 inch LB conduit body",         unit: "ea",  category: "conduit" },
  { key: "lb_1in",            name: "1 inch LB conduit body",           unit: "ea",  category: "conduit" },
  // Devices
  { key: "recept_nema1450",   name: "NEMA 14-50 receptacle",            unit: "ea",  category: "devices" },
  { key: "recept_nema650",    name: "NEMA 6-50 receptacle",             unit: "ea",  category: "devices" },
  { key: "recept_gfci_20a",   name: "GFCI 20A receptacle",              unit: "ea",  category: "devices" },
  { key: "recept_tr_15a",     name: "TR 15A duplex outlet",             unit: "ea",  category: "devices" },
  { key: "recept_tr_20a",     name: "TR 20A duplex outlet",             unit: "ea",  category: "devices" },
  { key: "recept_usb",        name: "USB outlet receptacle",            unit: "ea",  category: "devices" },
  { key: "switch_1p",         name: "single-pole switch",               unit: "ea",  category: "devices" },
  { key: "switch_3way",       name: "3-way switch",                     unit: "ea",  category: "devices" },
  { key: "dimmer_led",        name: "LED dimmer switch",                unit: "ea",  category: "devices" },
  { key: "dimmer_3way",       name: "3-way LED dimmer",                 unit: "ea",  category: "devices" },
  // Lights
  { key: "light_canless_4",   name: "4 inch canless wafer LED",         unit: "ea",  category: "devices" },
  { key: "light_canless_6",   name: "6 inch canless wafer LED",         unit: "ea",  category: "devices" },
  { key: "light_recessed_6",  name: "6 inch recessed can with trim",    unit: "ea",  category: "devices" },
  { key: "light_highbay_100", name: "100W LED high bay fixture",        unit: "ea",  category: "devices" },
  { key: "light_highbay_200", name: "200W LED high bay fixture",        unit: "ea",  category: "devices" },
  { key: "light_strip",       name: "LED strip light per foot",         unit: "ft",  category: "devices" },
  { key: "light_wallpack",    name: "LED outdoor wall pack",            unit: "ea",  category: "devices" },
  { key: "light_exit",        name: "LED exit sign",                    unit: "ea",  category: "devices" },
  { key: "light_vapor_4ft",   name: "4ft LED vapor tight fixture",      unit: "ea",  category: "devices" },
  // Boxes
  { key: "box_1gang_nw",      name: "1-gang new work box",              unit: "ea",  category: "boxes" },
  { key: "box_1gang_ow",      name: "1-gang old work box",              unit: "ea",  category: "boxes" },
  { key: "box_2gang_nw",      name: "2-gang new work box",              unit: "ea",  category: "boxes" },
  { key: "box_4sq",           name: "4 inch square box 2-1/8 deep",    unit: "ea",  category: "boxes" },
  { key: "box_4sq_ext",       name: "4 inch square box extension",      unit: "ea",  category: "boxes" },
  { key: "box_octagon",       name: "4 inch octagon box",               unit: "ea",  category: "boxes" },
  { key: "box_wp",            name: "weatherproof 1-gang box",          unit: "ea",  category: "boxes" },
  { key: "cover_wp_inuse",    name: "weatherproof in-use cover",        unit: "ea",  category: "boxes" },
  { key: "cover_blank",       name: "blank cover plate",                unit: "ea",  category: "boxes" },
  // Grounding
  { key: "ground_rod",        name: "ground rod 5/8 inch 8ft copper",   unit: "ea",  category: "fittings" },
  { key: "ground_clamp",      name: "ground rod clamp",                 unit: "ea",  category: "fittings" },
  { key: "gec_6",             name: "#6 bare copper GEC wire",          unit: "ft",  category: "fittings" },
  { key: "gec_4",             name: "#4 bare copper GEC wire",          unit: "ft",  category: "fittings" },
  // Misc
  { key: "wire_nuts_bag",     name: "wire nuts assorted bag",           unit: "bag", category: "consumables" },
  { key: "tape_electrical",   name: "electrical tape roll",             unit: "ea",  category: "consumables" },
  { key: "staples_nmb",       name: "NM-B wire staples box",            unit: "box", category: "consumables" },
  { key: "anti_ox",           name: "anti-oxidant compound tube",       unit: "ea",  category: "consumables" },
  { key: "consumables_lot",   name: "misc consumables lot",             unit: "lot", category: "consumables" },
];

export async function POST(req: Request) {
  try {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!anthropicKey) return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
    if (!supabaseUrl || !supabaseKey) return Response.json({ error: "Supabase config missing" }, { status: 500 });

    const client = new Anthropic({ apiKey: anthropicKey });
    const db     = createClient(supabaseUrl, supabaseKey);

    console.log("[pricebook/update] pricing", ITEMS_TO_PRICE.length, "items in 3 parallel batches");

    const BATCH_SIZE = 10;
    const batches = Array.from(
      { length: Math.ceil(ITEMS_TO_PRICE.length / BATCH_SIZE) },
      (_, i) => ITEMS_TO_PRICE.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    );

    console.log(`[pricebook/update] ${batches.length} batches of ${BATCH_SIZE} items, sequential with 15s delay`);

    async function priceBatch(items: typeof ITEMS_TO_PRICE, batchNum: number) {
      console.log(`[pricebook/update] batch ${batchNum} starting (${items.length} items)`);
      
      const timeout = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Batch ${batchNum} timed out after 45s`)), 45000)
      );

      const call = client.messages.create({
        model:       "claude-haiku-4-5-20251001",
        max_tokens:  512,
        temperature: 0,
        system: `You are an electrical materials pricing expert. Provide accurate 2025 US contractor supply house prices — what electricians actually pay at distributors like Graybar, CED, Rexel, and Platt. These are TRADE prices, not retail. Return ONLY a valid JSON array with no markdown or explanation:
[{"key":"item_key","unit_cost":0.00}]`,
        messages: [{
          role: "user",
          content: `Return a JSON array with 2025 contractor supply house prices for these items:\n\n${items.map(i => `{"key":"${i.key}","name":"${i.name}","unit":"per ${i.unit}"}`).join("\n")}`,
        }],
      });

      const res   = await Promise.race([call, timeout]);
      const text  = res.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("").trim();
      const clean = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
      const match = clean.match(/\[[\s\S]*\]/);
      const parsed = JSON.parse(match ? match[0] : clean);
      console.log(`[pricebook/update] batch ${batchNum} done (${Array.isArray(parsed) ? parsed.length : 0} prices)`);
      return Array.isArray(parsed) ? parsed : [];
    }

    // Run batches sequentially with delay to stay under 30k token/min rate limit
    const priced: Array<{ key: string; unit_cost: number; source: string }> = [];
    for (let i = 0; i < batches.length; i++) {
      try {
        const result = await priceBatch(batches[i], i + 1);
        priced.push(...result);
        // Wait 5 seconds between batches to avoid rate limit
        if (i < batches.length - 1) await new Promise(r => setTimeout(r, 15000));
      } catch (err) {
        console.error(`[pricebook/update] batch ${i + 1} error:`, err);
      }
    }
    console.log("[pricebook/update] total prices received:", priced.length);

    const rows = priced
      .filter((p: any) => p.key && typeof p.unit_cost === "number" && p.unit_cost > 0)
      .map((p: any) => {
        const item = ITEMS_TO_PRICE.find(i => i.key === p.key);
        if (!item) return null;
        return {
          item_key:   p.key,
          item_name:  item.name,
          unit:       item.unit,
          unit_cost:  p.unit_cost,
          category:   item.category,
          source:     "claude-2025",
          notes:      null,
          updated_at: new Date().toISOString(),
        };
      })
      .filter(Boolean);

    if (rows.length === 0) return Response.json({ error: "No valid prices returned" }, { status: 502 });

    const { error } = await db.from("pricebook").upsert(rows, { onConflict: "item_key" });
    if (error) return Response.json({ error: error.message }, { status: 500 });

    console.log("[pricebook/update] saved", rows.length, "items to Supabase");
    return Response.json({ success: true, updated: rows.length, items: rows.map(r => ({ key: r!.item_key, name: r!.item_name, cost: r!.unit_cost })) });

  } catch (err: unknown) {
    console.error("[pricebook/update] error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}