import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { notifyMakeCredit } from "@/functions/notifyMakeCredit";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  Users, Search, CreditCard, AlertTriangle, Mail,
  ChevronRight, Loader2, PlusCircle, Send, ExternalLink
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
import ParcelCoveragePanel from "@/components/admin/ParcelCoveragePanel";

const mono = "'IBM Plex Mono', monospace";
const serif = "'Libre Baskerville', serif";
const T = { blue: '#1A3A6B', red: '#B33A2A', paper: '#F4EFE6', border: '#C4BAA8', grey: '#7A7268' };

const statusMap = {
  completed: { label: "Completata", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pending: { label: "In corso", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  processing: { label: "In elaborazione", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  failed: { label: "Errore", cls: "bg-red-50 text-red-700 border-red-200" },
};

function KpiCard({ icon: Icon, label, value, sub, highlight }) {
  return (
    <div className="bg-white p-5" style={{ border: `1px solid ${T.border}` }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[2px] mb-2" style={{ color: T.grey, fontFamily: mono }}>{label}</p>
          <p className="text-2xl font-bold" style={{ color: highlight ? T.red : T.blue, fontFamily: mono }}>{value}</p>
          {sub && <p className="text-[10px] mt-1" style={{ color: T.grey, fontFamily: mono }}>{sub}</p>}
        </div>
        <div className="w-9 h-9 flex items-center justify-center shrink-0" style={{ background: T.paper, border: `1px solid ${T.border}` }}>
          <Icon className="w-4 h-4" style={{ color: highlight ? T.red : T.blue }} />
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[3px] mb-3 mt-8" style={{ color: T.red, fontFamily: mono }}>{title}</p>
  );
}

/* ── Add Credits Modal ── */
function AddCreditsForm({ userEmail, onDone }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setLoading(true);
    const list = await base44.entities.UserCredits.filter({ user_email: userEmail });
    const credits = list[0];
    if (credits) {
      await base44.entities.UserCredits.update(credits.id, { balance: (credits.balance || 0) + amt });
    } else {
      await base44.entities.UserCredits.create({ user_email: userEmail, balance: amt, total_spent: 0, total_queries: 0 });
    }
    await base44.entities.CreditTransaction.create({ user_email: userEmail, type: "purchase", amount: amt, description: reason || `Crediti aggiunti da admin` });
    notifyMakeCredit({ user_email: userEmail, amount: amt, type: 'purchase' }).catch(() => {});
    qc.invalidateQueries({ queryKey: ["adminCredits"] });
    toast({ title: `+€${amt.toFixed(2)} aggiunti a ${userEmail}` });
    setLoading(false);
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 mt-2 p-3" style={{ background: T.paper, border: `1px solid ${T.border}` }}>
      <div>
        <label className="block text-[9px] uppercase tracking-[2px] mb-1" style={{ color: T.grey, fontFamily: mono }}>Importo €</label>
        <input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} required
          className="h-8 w-24 px-2 text-xs border outline-none" style={{ border: `1px solid ${T.border}`, fontFamily: mono }} />
      </div>
      <div className="flex-1 min-w-32">
        <label className="block text-[9px] uppercase tracking-[2px] mb-1" style={{ color: T.grey, fontFamily: mono }}>Motivo</label>
        <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="es. Rimborso, bonus"
          className="h-8 w-full px-2 text-xs border outline-none" style={{ border: `1px solid ${T.border}`, fontFamily: mono }} />
      </div>
      <button type="submit" disabled={loading} className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest text-white" style={{ background: T.blue, fontFamily: mono }}>
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Aggiungi"}
      </button>
      <button type="button" onClick={onDone} className="h-8 px-3 text-[10px] uppercase tracking-widest" style={{ color: T.grey, fontFamily: mono }}>✕</button>
    </form>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [addCreditFor, setAddCreditFor] = useState(null);
  const [massEmailMsg, setMassEmailMsg] = useState("");
  const [massEmailSending, setMassEmailSending] = useState(false);
  const { toast } = useToast();

  const { data: currentUser } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });

  // All queries (admin)
  const { data: allQueries = [], isLoading: qLoading } = useQuery({
    queryKey: ["adminQueries"],
    queryFn: () => base44.entities.CadastralQuery.list("-created_date", 50),
    enabled: currentUser?.role === "admin",
  });

  // All credits
  const { data: allCredits = [] } = useQuery({
    queryKey: ["adminCredits"],
    queryFn: () => base44.entities.UserCredits.list(),
    enabled: currentUser?.role === "admin",
  });

  // All transactions
  const { data: allTx = [] } = useQuery({
    queryKey: ["adminTx"],
    queryFn: () => base44.entities.CreditTransaction.list("-created_date", 100),
    enabled: currentUser?.role === "admin",
  });

  // Waitlist
  const { data: waitlist = [] } = useQuery({
    queryKey: ["adminWaitlist"],
    queryFn: () => base44.entities.WaitlistSubscriber.list("-created_date", 200),
    enabled: currentUser?.role === "admin",
  });

  if (!currentUser) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin" style={{ color: T.blue }} /></div>;
  if (currentUser.role !== "admin") return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <AlertTriangle className="w-10 h-10" style={{ color: T.red }} />
      <p className="font-bold text-lg" style={{ color: T.blue, fontFamily: mono }}>Accesso negato</p>
      <Link to="/dashboard" className="text-xs underline" style={{ color: T.grey, fontFamily: mono }}>← Torna alla dashboard</Link>
    </div>
  );

  // KPIs
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);
  const queriesToday = allQueries.filter(q => new Date(q.created_date) >= today).length;
  const queriesWeek = allQueries.filter(q => new Date(q.created_date) >= weekAgo).length;
  const totalRevenue = allTx.filter(t => t.type === "purchase").reduce((s, t) => s + (t.amount || 0), 0);
  const failedQueries = allQueries.filter(q => q.status === "failed").length;
  const uniqueUsers = [...new Set(allQueries.map(q => q.created_by))];

  const TABS = ["overview", "utenti", "query", "waitlist", "transazioni", "copertura"];

  const handleSendMassEmail = async () => {
    if (!massEmailMsg.trim()) return;
    setMassEmailSending(true);
    let sent = 0;
    for (const sub of waitlist) {
      try {
        await base44.integrations.Core.SendEmail({
          to: sub.email,
          subject: "UrbiCheck — Aggiornamento Beta",
          body: buildMassEmailHtml(sub.email, massEmailMsg),
          from_name: "UrbiCheck",
        });
        sent++;
      } catch (_e) {}
    }
    toast({ title: `Email inviate a ${sent}/${waitlist.length} iscritti` });
    setMassEmailMsg("");
    setMassEmailSending(false);
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[3px] mb-1" style={{ color: T.red, fontFamily: mono }}>Admin Panel</p>
        <h1 className="text-2xl font-bold" style={{ color: T.blue, fontFamily: serif, fontStyle: 'italic' }}>UrbiCheck Admin</h1>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-0 mb-6 overflow-x-auto" style={{ borderBottom: `2px solid ${T.border}` }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-[2px] whitespace-nowrap border-b-2 -mb-0.5 transition-colors"
            style={{ borderColor: activeTab === tab ? T.red : 'transparent', color: activeTab === tab ? T.blue : T.grey, fontFamily: mono }}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === "overview" && (
        <div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <KpiCard icon={Users} label="Utenti unici" value={uniqueUsers.length} />
            <KpiCard icon={Search} label="Query oggi" value={queriesToday} sub={`${queriesWeek} questa settimana`} />
            <KpiCard icon={Search} label="Query totali" value={allQueries.length} />
            <KpiCard icon={CreditCard} label="Revenue totale" value={`€${totalRevenue.toFixed(2)}`} highlight />
            <KpiCard icon={AlertTriangle} label="Waitlist" value={waitlist.length} />
          </div>
          {failedQueries > 0 && (
            <div className="mt-4 flex items-center gap-3 px-4 py-3" style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderLeft: `4px solid ${T.red}` }}>
              <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: T.red }} />
              <p className="text-xs" style={{ color: '#1C1A17', fontFamily: mono }}>
                {failedQueries} quer{failedQueries === 1 ? 'y' : 'ies'} in stato "failed" — verifica log backend
              </p>
              <button onClick={() => setActiveTab("query")} className="ml-auto text-[10px] underline" style={{ color: T.blue, fontFamily: mono }}>Vedi →</button>
            </div>
          )}
        </div>
      )}

      {/* ── UTENTI ── */}
      {activeTab === "utenti" && (
        <div>
          <SectionHeader title={`Utenti (${uniqueUsers.length})`} />
          <div className="overflow-x-auto bg-white" style={{ border: `1px solid ${T.border}` }}>
            <table className="w-full text-xs" style={{ fontFamily: mono }}>
              <thead>
                <tr style={{ background: T.paper, borderBottom: `1px solid ${T.border}` }}>
                  {["Email", "Saldo €", "Query", "Ultima query", "Azioni"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-[2px] font-bold whitespace-nowrap" style={{ color: T.grey }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uniqueUsers.map(email => {
                  const c = allCredits.find(cr => cr.user_email === email);
                  const userQ = allQueries.filter(q => q.created_by === email);
                  const lastQ = userQ[0];
                  return (
                    <React.Fragment key={email}>
                      <tr className="border-b" style={{ borderColor: T.border }}>
                        <td className="px-4 py-3 max-w-[180px] truncate" style={{ color: T.blue }}>{email}</td>
                        <td className="px-4 py-3 font-bold" style={{ color: (c?.balance || 0) < 9.9 ? T.red : T.blue }}>€{(c?.balance || 0).toFixed(2)}</td>
                        <td className="px-4 py-3" style={{ color: T.grey }}>{userQ.length}</td>
                        <td className="px-4 py-3 whitespace-nowrap" style={{ color: T.grey }}>
                          {lastQ ? format(new Date(lastQ.created_date), "d MMM yy", { locale: it }) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => setAddCreditFor(addCreditFor === email ? null : email)}
                            className="flex items-center gap-1 text-[10px] px-2 py-1 font-bold uppercase tracking-wider"
                            style={{ border: `1px solid ${T.blue}`, color: T.blue }}>
                            <PlusCircle className="w-3 h-3" /> Crediti
                          </button>
                        </td>
                      </tr>
                      {addCreditFor === email && (
                        <tr>
                          <td colSpan={5} className="px-4 pb-3">
                            <AddCreditsForm userEmail={email} onDone={() => setAddCreditFor(null)} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── QUERY ── */}
      {activeTab === "query" && (
        <div>
          <SectionHeader title={`Ultime Query (${allQueries.length})`} />
          {qLoading ? <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" style={{ color: T.blue }} /></div> : (
            <div className="overflow-x-auto bg-white" style={{ border: `1px solid ${T.border}` }}>
              <table className="w-full text-xs" style={{ fontFamily: mono }}>
                <thead>
                  <tr style={{ background: T.paper, borderBottom: `1px solid ${T.border}` }}>
                    {["ID", "Utente", "Comune", "F/P", "Status", "Paid", "Data", ""].map(h => (
                      <th key={h} className="text-left px-3 py-3 text-[10px] uppercase tracking-[2px] font-bold whitespace-nowrap" style={{ color: T.grey }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allQueries.map(q => {
                    const st = statusMap[q.status] || statusMap.pending;
                    return (
                      <tr key={q.id} className="border-b hover:bg-stone-50" style={{ borderColor: T.border }}>
                        <td className="px-3 py-2.5 text-[10px]" style={{ color: T.grey }}>{q.id?.slice(-6).toUpperCase()}</td>
                        <td className="px-3 py-2.5 max-w-[130px] truncate" style={{ color: T.blue }}>{q.created_by}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap font-semibold" style={{ color: T.blue }}>{q.comune}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: T.grey }}>F.{q.foglio} P.{q.particella}</td>
                        <td className="px-3 py-2.5"><Badge variant="outline" className={`${st.cls} text-[10px]`}>{st.label}</Badge></td>
                        <td className="px-3 py-2.5">
                          {q.paid ? <span className="text-[10px] font-bold text-emerald-600">✓</span> : <span className="text-[10px] text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: T.grey }}>
                          {format(new Date(q.created_date), "d MMM yy HH:mm", { locale: it })}
                        </td>
                        <td className="px-3 py-2.5">
                          <Link to={`/report/${q.id}`} className="flex items-center gap-1 text-[10px] hover:underline" style={{ color: T.blue }}>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── WAITLIST ── */}
      {activeTab === "waitlist" && (
        <div>
          <SectionHeader title={`Waitlist (${waitlist.length} iscritti)`} />

          {/* Mass email */}
          <div className="mb-5 p-4 bg-white" style={{ border: `1px solid ${T.border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-[2px] mb-2" style={{ color: T.grey, fontFamily: mono }}>Invia email massiva agli iscritti</p>
            <textarea
              value={massEmailMsg}
              onChange={e => setMassEmailMsg(e.target.value)}
              placeholder="Testo dell'email (HTML supportato)..."
              rows={4}
              className="w-full p-3 text-xs border outline-none resize-none mb-2"
              style={{ border: `1px solid ${T.border}`, fontFamily: mono }}
            />
            <button onClick={handleSendMassEmail} disabled={massEmailSending || !massEmailMsg.trim()}
              className="flex items-center gap-2 h-9 px-4 text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-50"
              style={{ background: T.blue, fontFamily: mono }}>
              {massEmailSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              Invia a tutti ({waitlist.length})
            </button>
          </div>

          <div className="overflow-x-auto bg-white" style={{ border: `1px solid ${T.border}` }}>
            <table className="w-full text-xs" style={{ fontFamily: mono }}>
              <thead>
                <tr style={{ background: T.paper, borderBottom: `1px solid ${T.border}` }}>
                  {["Email", "Ruolo", "Regione", "Iscrizione"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-[2px] font-bold" style={{ color: T.grey }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {waitlist.map(sub => (
                  <tr key={sub.id} className="border-b" style={{ borderColor: T.border }}>
                    <td className="px-4 py-2.5" style={{ color: T.blue }}>{sub.email}</td>
                    <td className="px-4 py-2.5" style={{ color: T.grey }}>{sub.ruolo || "—"}</td>
                    <td className="px-4 py-2.5" style={{ color: T.grey }}>{sub.regione_interesse || "—"}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: T.grey }}>
                      {format(new Date(sub.created_date), "d MMM yy", { locale: it })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TRANSAZIONI ── */}
      {activeTab === "transazioni" && (
        <div>
          <SectionHeader title={`Ultime Transazioni (${allTx.length})`} />
          <div className="overflow-x-auto bg-white" style={{ border: `1px solid ${T.border}` }}>
            <table className="w-full text-xs" style={{ fontFamily: mono }}>
              <thead>
                <tr style={{ background: T.paper, borderBottom: `1px solid ${T.border}` }}>
                  {["Utente", "Tipo", "Importo", "Descrizione", "Data"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-[2px] font-bold whitespace-nowrap" style={{ color: T.grey }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allTx.map(tx => (
                  <tr key={tx.id} className="border-b" style={{ borderColor: T.border }}>
                    <td className="px-4 py-2.5 max-w-[150px] truncate" style={{ color: T.blue }}>{tx.user_email}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className={`text-[10px] ${tx.type === 'purchase' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : tx.type === 'refund' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {tx.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 font-bold whitespace-nowrap" style={{ color: tx.type === 'purchase' ? '#059669' : T.red }}>
                      {tx.type === 'purchase' ? '+' : '-'}€{Math.abs(tx.amount || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 max-w-[200px] truncate" style={{ color: T.grey }}>{tx.description || "—"}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: T.grey }}>
                      {format(new Date(tx.created_date), "d MMM yy HH:mm", { locale: it })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── COPERTURA CATASTALE ── */}
      {activeTab === "copertura" && <ParcelCoveragePanel />}

      <div className="mt-10 pt-6 border-t text-center text-[10px] uppercase tracking-[2px]" style={{ borderColor: T.border, color: T.grey, fontFamily: mono }}>
        urbicheck.it — Admin Panel — Accesso riservato
      </div>
    </div>
  );
}

function buildMassEmailHtml(email, message) {
  return `<!DOCTYPE html><html><body style="font-family:'IBM Plex Mono',monospace;background:#F4EFE6;margin:0;padding:0">
<div style="max-width:600px;margin:0 auto;background:#fff;border-top:4px solid #1A3A6B">
<div style="background:#1A3A6B;padding:24px 32px;border-bottom:3px solid #B33A2A">
  <span style="font-weight:700;font-size:1.1rem;letter-spacing:0.05em;color:#F4EFE6">URBI</span>
  <span style="font-weight:700;font-size:1.1rem;letter-spacing:0.05em;color:#B33A2A">CHECK</span>
</div>
<div style="padding:32px">${message}</div>
<div style="background:#1C1A17;padding:16px 32px;font-size:10px;color:#7A7268">
  UrbiCheck — Fenice Management · <a href="#" style="color:#7A7268">Annulla iscrizione</a>
</div></div></body></html>`;
}