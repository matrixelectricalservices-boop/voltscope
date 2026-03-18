// app/lib/userProfile.ts
// Shared profile utilities — imported by dashboard page AND estimate page

export type UserProfile = {
  name:     string;
  company:  string;
  phone:    string;
  email:    string;
  license?: string;
  address?: string;
};

export const PROFILE_KEY = "voltscope:user-profile";

function defaultProfile(): UserProfile {
  return { name: "", company: "", phone: "", email: "", license: "", address: "" };
}

export function loadProfile(): UserProfile {
  if (typeof window === "undefined") return defaultProfile();
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return { ...defaultProfile(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultProfile();
}

export function saveProfile(p: UserProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}