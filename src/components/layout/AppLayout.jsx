import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Search, History, CreditCard, LayoutDashboard, Menu, X, LogOut, ShieldCheck } from "lucide-react";

const navItems = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/search", icon: Search, label: "Nuova Ricerca" },
  { path: "/history", icon: History, label: "Le mie analisi" },
  { path: "/credits", icon: CreditCard, label: "Crediti" },
];

/* UrbiCheck SVG Logo Icon — catasto grid + checkmark + red bar */
const LogoIcon = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" fill="#1A3A6B" />
    {/* grid lines */}
    <line x1="13" y1="2" x2="13" y2="32" stroke="white" strokeWidth="0.8" strokeOpacity="0.12" />
    <line x1="27" y1="2" x2="27" y2="32" stroke="white" strokeWidth="0.8" strokeOpacity="0.12" />
    <line x1="2" y1="13" x2="38" y2="13" stroke="white" strokeWidth="0.8" strokeOpacity="0.12" />
    <line x1="2" y1="24" x2="38" y2="24" stroke="white" strokeWidth="0.8" strokeOpacity="0.12" />
    {/* checkmark */}
    <polyline points="11,19 17,26 29,12" stroke="#B33A2A" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    {/* red bottom bar */}
    <rect x="0" y="36" width="40" height="4" fill="#B33A2A" />
  </svg>
);

const UrbiCheckWordmark = ({ dark = false }) => (
  <div style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
    <div className="flex items-baseline gap-0 leading-none">
      <span className="font-bold text-lg tracking-widest" style={{ color: dark ? '#1A3A6B' : '#FFFFFF' }}>URBI</span>
      <span className="font-bold text-lg tracking-widest" style={{ color: '#B33A2A' }}>CHECK</span>
    </div>
    <div className="text-[9px] tracking-[3px] uppercase mt-0.5" style={{ color: dark ? '#7A7268' : 'rgba(244,239,230,0.5)', fontFamily: "'IBM Plex Mono', monospace" }}>
      ANALISI URBANISTICA
    </div>
  </div>
);

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: credits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      const user = await base44.auth.me();
      const list = await base44.entities.UserCredits.filter({ user_email: user.email });
      return list[0] || { balance: 0 };
    },
  });

  const handleLogout = () => base44.auth.logout();

  return (
    <div className="min-h-screen flex" style={{ background: '#F4EFE6' }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64" style={{ background: '#1A3A6B', borderRight: '3px solid #B33A2A' }}>
        <div className="p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Link to="/dashboard" className="flex items-center gap-3">
            <LogoIcon size={40} />
            <UrbiCheckWordmark />
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-0.5">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-4 py-3 text-xs font-semibold tracking-widest uppercase transition-all duration-150"
                style={{
                  background: active ? 'rgba(179,58,42,0.15)' : 'transparent',
                  color: active ? '#B33A2A' : 'rgba(244,239,230,0.6)',
                  borderLeft: active ? '3px solid #B33A2A' : '3px solid transparent',
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
          {currentUser?.role === "admin" && (
            <Link
              to="/admin"
              className="flex items-center gap-3 px-4 py-3 text-xs font-semibold tracking-widest uppercase transition-all duration-150"
              style={{
                background: location.pathname === '/admin' ? 'rgba(179,58,42,0.15)' : 'transparent',
                color: location.pathname === '/admin' ? '#B33A2A' : 'rgba(244,239,230,0.4)',
                borderLeft: location.pathname === '/admin' ? '3px solid #B33A2A' : '3px solid transparent',
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              Admin
            </Link>
          )}
        </nav>

        <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="p-4 mb-3" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-[10px] uppercase tracking-[2px] mb-1" style={{ color: 'rgba(244,239,230,0.45)', fontFamily: "'IBM Plex Mono', monospace" }}>
              SALDO CREDITI
            </p>
            <p className="text-2xl font-bold" style={{ color: '#B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}>
              €{(credits?.balance || 0).toFixed(2)}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-widest transition-colors hover:text-white"
            style={{ color: 'rgba(244,239,230,0.4)', fontFamily: "'IBM Plex Mono', monospace" }}
          >
            <LogOut className="w-4 h-4" />
            Esci
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50" style={{ background: '#1A3A6B', borderBottom: '3px solid #B33A2A' }}>
        <div className="flex items-center justify-between px-4 h-16">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <LogoIcon size={32} />
            <UrbiCheckWordmark />
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold" style={{ color: '#B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}>
              €{(credits?.balance || 0).toFixed(2)}
            </span>
            <button onClick={() => setMobileOpen(!mobileOpen)} style={{ color: '#F4EFE6' }}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <nav className="px-4 pb-4 space-y-0.5" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-xs font-semibold tracking-widest uppercase transition-all"
                  style={{
                    background: active ? 'rgba(179,58,42,0.15)' : 'transparent',
                    color: active ? '#B33A2A' : 'rgba(244,239,230,0.6)',
                    borderLeft: active ? '3px solid #B33A2A' : '3px solid transparent',
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
            {currentUser?.role === "admin" && (
              <Link to="/admin" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-xs font-semibold tracking-widest uppercase transition-all"
                style={{ color: 'rgba(244,239,230,0.4)', fontFamily: "'IBM Plex Mono', monospace" }}>
                <ShieldCheck className="w-4 h-4" /> Admin
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-widest mt-1"
              style={{ color: 'rgba(244,239,230,0.4)', fontFamily: "'IBM Plex Mono', monospace" }}
            >
              <LogOut className="w-4 h-4" />
              Esci
            </button>
          </nav>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:overflow-y-auto flex flex-col">
        <div className="flex-1 pt-16 lg:pt-0">
          <Outlet />
        </div>
        <footer className="border-t border-border/30 px-6 py-4" style={{ background: 'rgba(26,58,107,0.04)', fontFamily: "'IBM Plex Mono', monospace" }}>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
            <span>© 2026 UrbiCheck — Dell'Aria Claudia Giuseppina | P.IVA 02655840060</span>
            <div className="flex gap-4">
              <Link to="/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link to="/termini-e-condizioni" className="hover:text-foreground transition-colors">Termini e Condizioni</Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}