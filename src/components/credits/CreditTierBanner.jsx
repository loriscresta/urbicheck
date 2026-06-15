import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const FREE_REPORTS = 3;
const LAUNCH_REPORTS = 3;
const LAUNCH_PRICE = 2.99;
const STANDARD_PRICE = 9.90;

/**
 * Shared banner showing the user's current credit tier.
 * Used on SearchPage and Dashboard.
 */
export default function CreditTierBanner({ variant = "search" }) {
  const { data: credits, isLoading } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      const user = await base44.auth.me();
      const list = await base44.entities.UserCredits.filter({ user_email: user.email });
      return list?.[0] || { balance: 0, free_reports_used: 0, beta_paid_reports_used: 0, total_queries: 0, total_spent: 0 };
    },
  });

  if (isLoading) return null;

  const freeUsed = credits?.free_reports_used || 0;
  const launchUsed = credits?.beta_paid_reports_used || 0;
  const balance = credits?.balance || 0;

  let tierLabel, tierColor, tierBg;
  if (freeUsed < FREE_REPORTS) {
    const remaining = FREE_REPORTS - freeUsed;
    tierLabel = `Stai usando il report gratuito #${freeUsed + 1}/${FREE_REPORTS} — incluso in beta, nessun costo${remaining > 0 ? ` — ne hai ancora ${remaining} gratuiti` : ''}`;
    tierColor = '#059669';
    tierBg = '#ecfdf5';
  } else if (launchUsed < LAUNCH_REPORTS) {
    const remaining = LAUNCH_REPORTS - launchUsed;
    tierLabel = `Report beta #${launchUsed + 1}/${FREE_REPORTS + LAUNCH_REPORTS} — costo: €${LAUNCH_PRICE.toFixed(2)}${remaining > 0 ? ` (ancora ${remaining} a questo prezzo)` : ' (ultimo a prezzo lancio!)'}`;
    tierColor = '#d97706';
    tierBg = '#fffbeb';
  } else {
    tierLabel = `Costo report: €${STANDARD_PRICE.toFixed(2)} — saldo attuale €${balance.toFixed(2)}`;
    tierColor = '#1A3A6B';
    tierBg = '#f0f4ff';
  }

  if (variant === "dashboard") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <TierCard
          label="Report gratuiti usati"
          value={`${freeUsed} / ${FREE_REPORTS}`}
          color={freeUsed < FREE_REPORTS ? '#059669' : '#7A7268'}
          bg={freeUsed < FREE_REPORTS ? '#ecfdf5' : '#f5f5f4'}
        />
        <TierCard
          label="Report beta €2,99 usati"
          value={`${launchUsed} / ${LAUNCH_REPORTS}`}
          color={launchUsed < LAUNCH_REPORTS ? '#d97706' : '#7A7268'}
          bg={launchUsed < LAUNCH_REPORTS ? '#fffbeb' : '#f5f5f4'}
        />
        <TierCard
          label="Prossimo costo"
          value={freeUsed < FREE_REPORTS ? 'Gratuito' : launchUsed < LAUNCH_REPORTS ? `€${LAUNCH_PRICE.toFixed(2)}` : `€${STANDARD_PRICE.toFixed(2)}`}
          color={freeUsed < FREE_REPORTS ? '#059669' : launchUsed < LAUNCH_REPORTS ? '#d97706' : '#1A3A6B'}
          bg={freeUsed < FREE_REPORTS ? '#ecfdf5' : launchUsed < LAUNCH_REPORTS ? '#fffbeb' : '#f0f4ff'}
        />
      </div>
    );
  }

  return (
    <div className="mb-4 px-4 py-2.5 flex items-center gap-2 text-xs rounded"
      style={{ background: tierBg, border: `1px solid ${tierColor}40`, fontFamily: "'IBM Plex Mono', monospace", color: tierColor }}>
      {freeUsed < FREE_REPORTS ? '🎁' : launchUsed < LAUNCH_REPORTS ? '🚀' : '💳'}
      <span>{tierLabel}</span>
    </div>
  );
}

function TierCard({ label, value, color, bg }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 rounded" style={{ background: bg, border: `1px solid ${color}40` }}>
      <span className="text-[10px] uppercase tracking-widest" style={{ color, fontFamily: "'IBM Plex Mono', monospace" }}>{label}</span>
      <span className="text-lg font-bold" style={{ color, fontFamily: "'IBM Plex Mono', monospace" }}>{value}</span>
    </div>
  );
}

export function getTierResult(credits) {
  const freeUsed = credits?.free_reports_used || 0;
  const launchUsed = credits?.beta_paid_reports_used || 0;
  if (freeUsed < FREE_REPORTS) return { tier: 'free', label: `Report gratuito #${freeUsed}/${FREE_REPORTS} utilizzato — ne hai ancora ${FREE_REPORTS - freeUsed} gratuiti` };
  if (launchUsed < LAUNCH_REPORTS) return { tier: 'launch_paid', label: `€${LAUNCH_PRICE.toFixed(2)} scalati dal tuo credito (report beta #${launchUsed}/${FREE_REPORTS + LAUNCH_REPORTS})` };
  return { tier: 'standard', label: `€${STANDARD_PRICE.toFixed(2)} scalati dal tuo credito` };
}