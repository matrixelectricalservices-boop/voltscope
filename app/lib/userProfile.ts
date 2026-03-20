// app/lib/userProfile.ts
import { supabase } from "./supabase";

export type UserProfile = {
  name:     string;
  company:  string;
  phone:    string;
  email:    string;
  license?: string;
  address?: string;
};

const LOCAL_KEY = "voltscope:user-profile";

function defaultProfile(): UserProfile {
  return { name: "", company: "", phone: "", email: "", license: "", address: "" };
}

// Fast local read (used by PDF generator — no async needed)
export function loadProfile(): UserProfile {
  if (typeof window === "undefined") return defaultProfile();
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return { ...defaultProfile(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultProfile();
}

// Full DB read — call on dashboard mount to sync from Supabase
export async function loadProfileFromDB(): Promise<UserProfile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return defaultProfile();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data) return defaultProfile();

  const profile: UserProfile = {
    name:    data.name    ?? "",
    company: data.company ?? "",
    phone:   data.phone   ?? "",
    email:   data.email   ?? user.email ?? "",
    license: data.license ?? "",
    address: data.address ?? "",
  };

  localStorage.setItem(LOCAL_KEY, JSON.stringify(profile));
  return profile;
}

// Write to both Supabase and local cache
export async function saveProfile(p: UserProfile): Promise<void> {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(p));

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("profiles")
    .update({
      name:    p.name,
      company: p.company,
      phone:   p.phone,
      email:   p.email,
      license: p.license ?? null,
      address: p.address ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) console.error("[userProfile] saveProfile:", error);
}