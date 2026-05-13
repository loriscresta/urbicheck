import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Search, History, CreditCard, LayoutDashboard, Menu, X,
  LogOut, ChevronRight, Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/search", icon: Search, label: "Nuova Ricerca" },
  { path: "/history", icon: History, label: "Le mie analisi" },
  { path: "/credits", icon: CreditCard, label: "Crediti" },
];

const Logo = ({ small = false }) => (
  <Link to="/dashboard" className="flex items-center gap-3">
    <div
      className={`${small ? "w-8 h-8" : "w-10 h-10"} rounded-lg flex items-center justify-center shrink-0`}
      style={{ background: '#C8A06E' }}
    >
      <Building2 className={`${small ? "w-4 h-4" : "w-5 h-5"} text-white`} />
    </div>
    <div>
      <h1
        className={`${small ? "text-base" : "text-lg"} font-bold tracking-widest text-white uppercase leading-none`}
        style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}
      >
        URBI CHECK
      </h1>
      {!small && (
        <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: 'rgba(200,160,110,0.7)' }}>
          analisi urbanistica
        </p>
      )}
    </div>
  </Link>
);

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

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
    <div className="min-h-screen flex" style={{ background: '#F5F4F0' }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64" style={{ background: '#0D1B2A' }}>
        <div className="p-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <Logo />
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  background: active ? 'rgba(200,160,110,0.12)' : 'transparent',
                  color: active ? '#C8A06E' : 'rgba(245,244,240,0.65)',
                }}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
                {active && <ChevronRight className="w-3 h-3 ml-auto" style={{ color: '#C8A06E' }} />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="rounded-lg p-4 mb-3" style={{ background: 'rgba(200,160,110,0.1)' }}>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'rgba(245,244,240,0.5)' }}>Saldo crediti</p>
            <p className="text-2xl font-extrabold" style={{ color: '#C8A06E', fontFamily: 'Georgia, serif' }}>
              €{(credits?.balance || 0).toFixed(2)}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
            style={{ color: 'rgba(245,244,240,0.5)' }}
          >
            <LogOut className="w-4 h-4" />
            Esci
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 border-b" style={{ background: '#0D1B2A', borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between px-4 h-16">
          <Logo small />
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold" style={{ color: '#C8A06E' }}>
              €{(credits?.balance || 0).toFixed(2)}
            </span>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="text-white">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <nav className="px-4 pb-4 space-y-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: active ? 'rgba(200,160,110,0.12)' : 'transparent',
                    color: active ? '#C8A06E' : 'rgba(245,244,240,0.65)',
                  }}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-sm mt-1"
              style={{ color: 'rgba(245,244,240,0.5)' }}
            >
              <LogOut className="w-4 h-4" />
              Esci
            </button>
          </nav>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:overflow-y-auto">
        <div className="pt-16 lg:pt-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}