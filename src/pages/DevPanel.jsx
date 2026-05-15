import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, Database, Settings, BarChart3 } from "lucide-react";
import { Loader2 } from "lucide-react";
import UrbiCheckDataLayer from "@/components/dev/UrbiCheckDataLayer";

const TABS = [
  { id: "copertura", label: "Copertura dati PRG", icon: Database },
  { id: "stats",     label: "Statistiche",         icon: BarChart3 },
  { id: "config",    label: "Configurazione",       icon: Settings },
];

export default function DevPanel() {
  const [activeTab, setActiveTab] = useState("copertura");

  const { data: user, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="p-10 text-center">
        <p className="text-muted-foreground text-sm">Accesso riservato agli amministratori.</p>
        <Link to="/dashboard" className="text-primary text-sm hover:underline mt-2 inline-block">Torna al dashboard</Link>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="mb-8">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-3 h-3" /> Dashboard
        </Link>
        <div className="rounded-xl p-5" style={{ background: "#1A3A6B" }}>
          <p className="text-white/60 text-xs uppercase tracking-widest mb-1">Pannello di sviluppo</p>
          <h1 className="text-xl font-bold text-white tracking-tight">UrbiCheck Dev Panel</h1>
          <p className="text-white/60 text-xs mt-1">Strumenti interni — solo admin</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.id ? "bg-white shadow-sm text-gray-900" : "text-gray-600 hover:text-gray-800"}`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "copertura" && <UrbiCheckDataLayer />}

      {activeTab === "stats" && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          Sezione statistiche — in sviluppo
        </div>
      )}

      {activeTab === "config" && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          Sezione configurazione — in sviluppo
        </div>
      )}
    </div>
  );
}