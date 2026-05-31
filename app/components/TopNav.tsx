"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

type Props = {
  userName?: string;
};

export default function TopNav({ userName: userNameProp }: Props) {
  const path = usePathname() ?? "";
  const [userName, setUserName] = useState(userNameProp ?? "");

  useEffect(() => {
    if (userNameProp) { setUserName(userNameProp); return; }
    supabase.auth.getUser().then(({ data }) => {
      const name = data?.user?.user_metadata?.name ?? "";
      if (name) setUserName(name);
    });
  }, [userNameProp]);

  const initial = userName ? userName.charAt(0).toUpperCase() : "?";

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: "⊞" },
    { href: "/projects",  label: "Customers", icon: "👥" },
    { href: "/estimates", label: "Estimates", icon: "📄" },
    { href: "/account",   label: "Account",   icon: "⚙" },
  ];

  function isActive(href: string) {
    if (href === "/dashboard") return path === "/dashboard";
    return path.startsWith(href);
  }

  return (
    <>
      <style>{`
        .sb-topbar {
          position: sticky; top: 0; z-index: 100; height: 56px;
          background: #0B0F1A; border-bottom: 1px solid rgba(255,255,255,0.07);
          display: flex; align-items: center; padding: 0 16px; gap: 0; overflow: hidden;
        }
        .sb-logo {
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          font-weight: 800; font-size: 16px; color: #fff;
          letter-spacing: -0.3px; display: flex; align-items: center;
          gap: 8px; text-decoration: none; flex-shrink: 0;
        }
        .sb-logo-mark {
          width: 30px; height: 30px; border-radius: 10px;
          background: #0B0F1A; border: 1px solid rgba(37,99,235,0.4);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .sb-logo-name { color: #fff; }
        .sb-logo-name span { color: #2563EB; }
        .sb-divider { width: 1px; height: 20px; background: rgba(255,255,255,0.07); margin: 0 12px; flex-shrink: 0; }
        .sb-nav { display: flex; align-items: center; gap: 2px; flex: 1; min-width: 0; }
        .sb-nav-link {
          font-family: 'Inter', system-ui, sans-serif; font-size: 13px; font-weight: 500;
          color: rgba(255,255,255,0.50); text-decoration: none;
          padding: 5px 8px; border-radius: 8px;
          transition: background 0.15s, color 0.15s; white-space: nowrap;
        }
        .sb-nav-link:hover  { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.85); }
        .sb-nav-link.active { color: rgba(255,255,255,0.90); background: rgba(255,255,255,0.08); }
        .sb-avatar {
          width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
          background: linear-gradient(135deg, #2563EB 0%, #7c3aed 100%);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          font-weight: 700; font-size: 12px; color: #fff;
          text-decoration: none; transition: opacity 0.15s;
        }
        .sb-avatar:hover { opacity: 0.85; }

        /* ── Mobile bottom nav ── */
        .sb-bottom-nav {
          display: none;
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 200;
          background: #0B0F1A; border-top: 1px solid rgba(255,255,255,0.07);
          padding: 8px 0 env(safe-area-inset-bottom, 8px);
        }
        .sb-bottom-nav-inner {
          display: grid; grid-template-columns: repeat(4, 1fr);
          max-width: 500px; margin: 0 auto;
        }
        .sb-bottom-link {
          display: flex; flex-direction: column; align-items: center; gap: 3px;
          padding: 6px 4px; text-decoration: none;
          color: rgba(255,255,255,0.40); font-family: 'Inter', system-ui, sans-serif;
          font-size: 10px; font-weight: 500; transition: color 0.15s;
        }
        .sb-bottom-link.active { color: #2563EB; }
        .sb-bottom-link:hover  { color: rgba(255,255,255,0.80); }
        .sb-bottom-icon { font-size: 18px; line-height: 1; }
        .sb-bottom-account {
          width: 22px; height: 22px; border-radius: 50%;
          background: linear-gradient(135deg, #2563EB 0%, #7c3aed 100%);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          font-weight: 700; font-size: 10px; color: #fff;
        }
        .sb-bottom-account.active-ring { box-shadow: 0 0 0 2px #2563EB; }

        @media (max-width: 640px) {
          .sb-nav      { display: none; }
          .sb-divider  { display: none; }
          .sb-avatar   { display: none; }
          .sb-bottom-nav { display: block; }
          /* Add padding so content isn't hidden behind bottom nav */
          body { padding-bottom: 70px; }
        }
      `}</style>

      {/* Top bar */}
      <nav className="sb-topbar">
        <a href="/" className="sb-logo">
          <div className="sb-logo-mark">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <line x1="5" y1="17" x2="5" y2="9" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round"/>
              <line x1="15" y1="17" x2="15" y2="9" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round"/>
              <path d="M5 9 Q10 2 15 9" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="8" cy="6" r="1.2" fill="#93c5fd"/>
              <circle cx="12" cy="6" r="1.2" fill="#93c5fd"/>
            </svg>
          </div>
          <span className="sb-logo-name">Sparc<span>Bid</span></span>
        </a>
        <div className="sb-divider" />
        <div className="sb-nav">
          {navLinks.slice(0, 3).map(({ href, label }) => (
            <a key={href} href={href} className={`sb-nav-link${isActive(href) ? " active" : ""}`}>
              {label}
            </a>
          ))}
        </div>
        <a href="/account" className="sb-avatar" title="Account settings">
          {initial}
        </a>
      </nav>

      {/* Mobile bottom nav */}
      <div className="sb-bottom-nav">
        <div className="sb-bottom-nav-inner">
          {navLinks.slice(0, 3).map(({ href, label, icon }) => (
            <a key={href} href={href} className={`sb-bottom-link${isActive(href) ? " active" : ""}`}>
              <span className="sb-bottom-icon">{icon}</span>
              <span>{label}</span>
            </a>
          ))}
          <a href="/account" className={`sb-bottom-link${isActive("/account") ? " active" : ""}`}>
            <div className={`sb-bottom-account${isActive("/account") ? " active-ring" : ""}`}>{initial}</div>
            <span>Account</span>
          </a>
        </div>
      </div>
    </>
  );
}