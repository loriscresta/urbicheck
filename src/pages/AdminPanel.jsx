import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { notifyMakeCredit } from "@/functions/notifyMakeCredit";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  Users, Search, TrendingUp, AlertTriangle, Mail,
  CreditCard, List, ClipboardList, ChevronRight, Loader2,
  Plus, Send, ExternalLink
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const mono = "'IBM Plex Mono', monospace";
const serif = "'Libre Baskerville', serif";

const TABS = [
  { key: "overview", label: "Overview", icon: TrendingUp },
  { key: "users", label: "Utenti", icon: Users },
  { key: "queries", label: "Query", icon: Search },
  { key: "waitlist", label: "Waitlist", icon: Mail },
  { key: "transactions", label: "Transazioni", icon: CreditCard },
];

const statusMap = {
  completed: { label: "Completata", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pending: { label: "In corso", className: "bg-amber-50 text-amber-700 border-amber-200" },
  processing: { label: "Processing", className: "bg-blue-50 text-blue-700 border-blue-200" },
  failed: { label: "Errore", className: "bg-red-50 text-red-700 border-red-200" },
};

function KpiCard({ icon: IconComp, label, value, sub, highlight }) {
  const Icon = IconComp;
  return (
    <div className="bg-white p-5" style={{ border: `1px solid ${highlight ? '#B33A2A' : '#C4BAA8'}`, borderTop: highlight ? '3px solid #B33A2A' : '1px solid #C4BAA8' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] uppercase tracking-[2px]" style={{ color: '#7A7268', fontFamily: mono }}>{label}</p>
        <Icon className="w-4 h-4" style={{ color: highlight ? '#B33A2A' : '#1A3A6B' }} />
      </div>
      <p className="text-2xl font-bold" style={{ color: '#1A3A6B', fontFamily: mono }}>{value}</p>
      {sub && <p className="text-[10px] mt-1" style={{ color: '#7A7268', fontFamily: mono }}>{sub}</p>}
    </div>
  );
}

/* ─── Overview Tab ─── */
function OverviewTab({ queries, transactions, users, waitlist }) {
  const today = new Date().toDateString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const todayQ = queries.filter(q => new Date(q.created_date).toDateString() === today).length;
  const weekQ = queries.filter(q => new Date(q.created_date) >= weekAgo).length;
  const revenue = transactions.filter(t => t.type === "purchase").reduce((s, t) => s + (t.amount || 0), 0);
  const failed = queries.filter(q => q.status === "failed").length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <KpiCard icon={Users} label="Utenti registrati" value={users.length} />
      <KpiCard icon={Search} label="Query totali" value={queries.length} sub={`Oggi: ${todayQ} · Sett.: ${weekQ}`} />
      <KpiCard icon={TrendingUp} label="Revenue totale" value={`€${revenue.toFixed(2)}`} highlight />
      <KpiCard icon={AlertTriangle} label="Query fallite" value={failed} sub="Da monitorare" />
      <KpiCard icon={Mail} label="Waitlist" value={waitlist.length} />
    </div>
  );
}

/* ─── Users Tab ─── */
function UsersTab({ users, allCredits, allQueries }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [addCredit, setAddCredit] = useState({}); // { [email]: { amount, reason, loading } }

  const handleAddCredits = async (userEmail) => {
    const entry = addCredit[userEmail] || {};
    const amount = parseFloat(entry.amount);
    if (!amount || amount <= 0) return;
    setAddCredit(p => ({ ...p, [userEmail]: { ...p[userEmail], loading: true } }));

    const creditRec = allCredits.find(c => c.user_email === userEmail);
    if (creditRec) {
      await base44.entities.UserCredits.update(creditRec.id, {
        balance: (creditRec.balance || 0) + amount,
      });
    } else {
      await base44.entities.UserCredits.create({ user_email: userEmail, balance: amount, total_spent: 0, total_queries: 0 });
    }
    await base44.entities.CreditTransaction.create({
      user_email: userEmail,
      type: "purchase",
      amount,
      description: entry.reason || "Crediti aggiunti da admin",
    });
    notifyMakeCredit({ user_email: userEmail, amount, type: 'purchase' }).catch(() => {});
    qc.invalidateQueries({ queryKey: ["adminCredits"] });
    setAddCredit(p => ({ ...p, [userEmail]: { amount: "", reason: "", loading: false } }));
    toast({ title: `€${amount.toFixed(2)} aggiunti a ${userEmail}` });
  };

  return (
    <div className="bg-white overflow-x-auto" style={{ border: '1px solid #C4BAA8' }}>
      <table className="w-full text-xs" style={{ fontFamily: mono }}>
        <thead>
          <tr style={{ background: '#F4EFE6', borderBottom: '1px solid #C4BAA8' }}>
            {['Email', 'Registrato', 'Saldo', 'N° Query', 'Ultima query', 'Azioni'].map(h => (
              <th key={h} className="text-left px-4 py-3 font-bold uppercase tracking-[1px]" style={{ color: '#1A3A6B', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const cred = allCredits.find(c => c.user_email === u.email);
            const uqs = allQueries.filter(q => q.created_by === u.email);
            const lastQ = uqs[0];
            const entry = addCredit[u.email] || {};
            return (
              <React.Fragment key={u.id}>
                <tr style={{ borderBottom: '1px solid #E8E2D8' }} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3 font-medium" style={{ color: '#1A3A6B', maxWidth: 180 }}>
                    <div className="truncate">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {format(new Date(u.created_date), "d MMM yy", { locale: it })}
                  </td>
                  <td className="px-4 py-3 font-bold" style={{ color: (cred?.balance || 0) < 9.9 ? '#B33A2A' : '#1A3A6B' }}>
                    €{(cred?.balance || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">{uqs.length}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {lastQ ? format(new Date(lastQ.created_date), "d MMM yy", { locale: it }) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setAddCredit(p => ({ ...p, [u.email]: { ...p[u.email], _open: !p[u.email]?._open } }))}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors hover:opacity-80"
                      style={{ background: '#1A3A6B', color: '#fff' }}
                    >
                      <Plus className="w-3 h-3" /> Crediti
                    </button>
                  </td>
                </tr>
                {entry._open && (
                  <tr style={{ background: '#F4EFE6', borderBottom: '1px solid #C4BAA8' }}>
                    <td colSpan={6} className="px-4 py-3">
                      <div className="flex flex-wrap gap-2 items-center">
                        <input
                          type="number"
                          placeholder="€ importo"
                          value={entry.amount || ""}
                          onChange={e => setAddCredit(p => ({ ...p, [u.email]: { ...p[u.email], amount: e.target.value } }))}
                          className="h-8 px-3 text-xs outline-none"
                          style={{ border: '1px solid #C4BAA8', fontFamily: mono, width: 100 }}
                        />
                        <input
                          type="text"
                          placeholder="Motivo (opz.)"
                          value={entry.reason || ""}
                          onChange={e => setAddCredit(p => ({ ...p, [u.email]: { ...p[u.email], reason: e.target.value } }))}
                          className="h-8 px-3 text-xs outline-none"
                          style={{ border: '1px solid #C4BAA8', fontFamily: mono, width: 180 }}
                        />
                        <button
                          onClick={() => handleAddCredits(u.email)}
                          disabled={entry.loading}
                          className="flex items-center gap-1 h-8 px-3 text-[10px] font-bold uppercase tracking-widest"
                          style={{ background: '#B33A2A', color: '#fff' }}
                        >
                          {entry.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Send className="w-3 h-3" /> Aggiungi</>}
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Queries Tab ─── */
function QueriesTab({ queries }) {
  return (
    <div className="bg-white overflow-x-auto" style={{ border: '1px solid #C4BAA8' }}>
      <table className="w-full text-xs" style={{ fontFamily: mono }}>
        <thead>
          <tr style={{ background: '#F4EFE6', borderBottom: '1px solid #C4BAA8' }}>
            {['ID', 'Utente', 'Comune', 'Fg/Part', 'Status', 'Paid', 'Data', ''].map(h => (
              <th key={h} className="text-left px-4 py-3 font-bold uppercase tracking-[1px]" style={{ color: '#1A3A6B', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {queries.map(q => {
            const st = statusMap[q.status] || statusMap.pending;
            return (
              <tr key={q.id} style={{ borderBottom: '1px solid #E8E2D8' }} className="hover:bg-stone-50 transition-colors">
                <td className="px-4 py-2.5 font-mono text-[10px]" style={{ color: '#7A7268' }}>
                  {q.id?.slice(-8).toUpperCase()}
                </td>
                <td className="px-4 py-2.5 max-w-[160px]">
                  <div className="truncate" title={q.created_by}>{q.created_by}</div>
                </td>
                <td className="px-4 py-2.5 font-medium" style={{ color: '#1A3A6B' }}>{q.comune}</td>
                <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">F.{q.foglio} P.{q.particella}</td>
                <td className="px-4 py-2.5">
                  <Badge variant="outline" className={`${st.className} text-[10px]`}>{st.label}</Badge>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`text-[11px] font-bold ${q.paid ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {q.paid ? "✓" : "–"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                  {format(new Date(q.created_date), "d MMM yy HH:mm", { locale: it })}
                </td>
                <td className="px-4 py-2.5">
                  <Link to={`/report/${q.id}`} target="_blank">
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Waitlist Tab ─── */
function WaitlistTab({ waitlist }) {
  const { toast } = useToast();
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

  const handleBulkEmail = async () => {
    if (!msg.trim()) return;
    setSending(true);
    const APP_URL = window.location.origin;
    for (const sub of waitlist) {
      await base44.integrations.Core.SendEmail({
        to: sub.email,
        subject: "UrbiCheck — Aggiornamento dalla tua lista d'attesa",
        body: `<!DOCTYPE html><html><body style="font-family:'IBM Plex Mono',monospace;background:#F4EFE6;padding:2rem;">
<div style="max-width:560px;margin:auto;background:#fff;border:1px solid #C4BAA8;padding:2rem;">
<h2 style="color:#1A3A6B;font-size:1.1rem;margin-bottom:1rem;">URBI<span style="color:#B33A2A">CHECK</span></h2>
<p style="color:#1C1A17;line-height:1.7;white-space:pre-wrap;">${msg}</p>
<div style="margin-top:2rem;padding-top:1rem;border-top:1px solid #C4BAA8;">
<a href="${APP_URL}" style="background:#1A3A6B;color:#fff;padding:0.75rem 1.5rem;text-decoration:none;font-weight:700;font-size:0.8rem;letter-spacing:2px;">ACCEDI ALL'APP →</a>
</div>
<p style="color:#7A7268;font-size:0.7rem;margin-top:2rem;">UrbiCheck © 2026 — stai ricevendo questa email perché sei iscritto alla lista d'attesa.</p>
</div></body></html>`,
      });
    }
    setSending(false);
    setMsg("");
    toast({ title: `Email inviata a ${waitlist.length} iscritti ✓` });
  };

  return (
    <div className="space-y-6">
      {/* Bulk email */}
      <div className="bg-white p-5" style={{ border: '1px solid #C4BAA8' }}>
        <p className="text-[10px] font-bold uppercase tracking-[2px] mb-3" style={{ color: '#B33A2A', fontFamily: mono }}>
          Email massiva a {waitlist.length} iscritti
        </p>
        <textarea
          value={msg}
          onChange={e => setMsg(e.target.value)}
          placeholder="Scrivi il messaggio da inviare a tutti gli iscritti..."
          rows={4}
          className="w-full p-3 text-sm outline-none resize-none"
          style={{ border: '1px solid #C4BAA8', fontFamily: mono, background: '#F4EFE6' }}
        />
        <button
          onClick={handleBulkEmail}
          disabled={sending || !msg.trim()}
          className="mt-3 flex items-center gap-2 px-4 h-9 text-[10px] font-bold uppercase tracking-widest transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: '#1A3A6B', color: '#fff', fontFamily: mono }}
        >
          {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          Invia a tutti
        </button>
      </div>

      {/* Table */}
      <div className="bg-white overflow-x-auto" style={{ border: '1px solid #C4BAA8' }}>
        <table className="w-full text-xs" style={{ fontFamily: mono }}>
          <thead>
            <tr style={{ background: '#F4EFE6', borderBottom: '1px solid #C4BAA8' }}>
              {['Email', 'Ruolo', 'Regione', 'Data iscrizione'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-bold uppercase tracking-[1px]" style={{ color: '#1A3A6B' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {waitlist.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid #E8E2D8' }} className="hover:bg-stone-50">
                <td className="px-4 py-2.5">{s.email}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{s.ruolo || "—"}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{s.regione_interesse || "—"}</td>
                <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                  {format(new Date(s.created_date), "d MMM yyyy", { locale: it })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Transactions Tab ─── */
function TransactionsTab({ transactions }) {
  const typeLabels = { purchase: "Acquisto", query_charge: "Addebito query", refund: "Rimborso" };
  const typeColors = { purchase: "text-emerald-600", query_charge: "text-red-600", refund: "text-blue-600" };
  return (
    <div className="bg-white overflow-x-auto" style={{ border: '1px solid #C4BAA8' }}>
      <table className="w-full text-xs" style={{ fontFamily: mono }}>
        <thead>
          <tr style={{ background: '#F4EFE6', borderBottom: '1px solid #C4BAA8' }}>
            {['Utente', 'Tipo', 'Importo', 'Descrizione', 'Data'].map(h => (
              <th key={h} className="text-left px-4 py-3 font-bold uppercase tracking-[1px]" style={{ color: '#1A3A6B', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transactions.map(t => (
            <tr key={t.id} style={{ borderBottom: '1px solid #E8E2D8' }} className="hover:bg-stone-50">
              <td className="px-4 py-2.5 max-w-[180px]">
                <div className="truncate" title={t.user_email}>{t.user_email}</div>
              </td>
              <td className={`px-4 py-2.5 font-bold ${typeColors[t.type] || ''}`}>{typeLabels[t.type] || t.type}</td>
              <td className="px-4 py-2.5 font-bold" style={{ color: '#1A3A6B' }}>€{Math.abs(t.amount || 0).toFixed(2)}</td>
              <td className="px-4 py-2.5 text-muted-foreground max-w-[200px]">
                <div className="truncate">{t.description || "—"}</div>
              </td>
              <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                {format(new Date(t.created_date), "d MMM yy HH:mm", { locale: it })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Main ─── */
export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: user } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: () => base44.entities.User.list("-created_date", 200),
    enabled: user?.role === "admin",
  });
  const { data: allQueries = [] } = useQuery({
    queryKey: ["adminQueries"],
    queryFn: () => base44.entities.CadastralQuery.list("-created_date", 50),
    enabled: user?.role === "admin",
  });
  const { data: allCredits = [] } = useQuery({
    queryKey: ["adminCredits"],
    queryFn: () => base44.entities.UserCredits.list("-created_date", 200),
    enabled: user?.role === "admin",
  });
  const { data: allTransactions = [] } = useQuery({
    queryKey: ["adminTransactions"],
    queryFn: () => base44.entities.CreditTransaction.list("-created_date", 100),
    enabled: user?.role === "admin",
  });
  const { data: waitlist = [] } = useQuery({
    queryKey: ["adminWaitlist"],
    queryFn: () => base44.entities.WaitlistSubscriber.list("-created_date", 500),
    enabled: user?.role === "admin",
  });

  if (!user) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (user.role !== "admin") return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center p-8">
        <AlertTriangle className="w-10 h-10 mx-auto mb-4 text-red-500" />
        <p className="font-bold text-lg" style={{ fontFamily: mono, color: '#1A3A6B' }}>Accesso negato</p>
        <p className="text-sm text-muted-foreground mt-1">Solo gli amministratori possono visualizzare questa pagina.</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#1A3A6B', fontFamily: serif, fontStyle: 'italic' }}>
          Admin Panel
        </h1>
        <p className="text-[10px] uppercase tracking-[2px] mt-1" style={{ color: '#7A7268', fontFamily: mono }}>
          UrbiCheck — Area riservata amministratori
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-0 mb-8 border-b" style={{ borderColor: '#C4BAA8' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[2px] transition-colors border-b-2"
            style={{
              fontFamily: mono,
              borderColor: activeTab === tab.key ? '#B33A2A' : 'transparent',
              color: activeTab === tab.key ? '#1A3A6B' : '#7A7268',
            }}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {usersLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#1A3A6B' }} />
        </div>
      ) : (
        <>
          {activeTab === "overview" && <OverviewTab queries={allQueries} transactions={allTransactions} users={users} waitlist={waitlist} />}
          {activeTab === "users" && <UsersTab users={users} allCredits={allCredits} allQueries={allQueries} />}
          {activeTab === "queries" && <QueriesTab queries={allQueries} />}
          {activeTab === "waitlist" && <WaitlistTab waitlist={waitlist} />}
          {activeTab === "transactions" && <TransactionsTab transactions={allTransactions} />}
        </>
      )}

      <div className="mt-10 pt-6 border-t text-center text-[10px] uppercase tracking-[2px]" style={{ borderColor: '#C4BAA8', color: '#7A7268', fontFamily: mono }}>
        urbicheck.it | Admin Panel
      </div>
    </div>
  );
}