import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Building2, MapPin, FileText, Shield, AlertTriangle,
  ClipboardList, FolderOpen, Lightbulb, ArrowLeft, Download, Loader2,
  BarChart3, CheckCircle2, XCircle, AlertCircle, Gavel, FileSearch, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import ReportSection from "@/components/report/ReportSection";
import VincoloCard from "@/components/report/VincoloCard";
import DataRow from "@/components/report/DataRow";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { generatePDF } from "@/lib/generateUrbiCheckPDF";
import FinancialDueDiligence from "@/components/report/FinancialDueDiligence";
import AttiRequestForm from "@/components/atti/AttiRequestForm";
import WfsLiguriaPanel from "@/components/report/WfsLiguriaPanel";
import ParcellaMap from "@/components/report/ParcellaMap";
import IndiciEdiliziSection from "@/components/report/IndiciEdiliziSection";
import PlanimetriaSection from "@/components/report/PlanimetriaSection";
import VincoliRischiPiemonte, { FerroviaCard } from "@/components/report/VincoliRischiPiemonte";

// ── Utilities ──────────────────────────────────────────────────────────────

const CATEGORIA_GROUPS = {
  residential: ['A/1','A/2','A/3','A/4','A/5','A/6','A/7','A/8','A/9','A/11'],
  commercial: ['C/1','C/2','C/3','C/4','C/5','C/6','C/7'],
  offices: ['A/10','B/1','B/2','B/3','B/4','B/5','B/6','B/7','B/8'],
  industrial: ['D/1','D/2','D/3','D/4','D/5','D/6','D/7','D/8','D/9','D/10'],
  land: ['F/1','F/2','F/3','F/4','F/5'],
};
const CATEGORIA_LABELS = {
  residential: null,
  commercial: { icon: '🏪', label: 'Immobile commerciale', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  offices: { icon: '🏢', label: 'Ufficio / Direzionale', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  industrial: { icon: '🏭', label: 'Immobile non residenziale — industriale/produttivo', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  land: { icon: '🌿', label: 'Area non edificata / Terreno', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
};

function detectCategoriaGroup(cat) {
  if (!cat) return null;
  const c = cat.toUpperCase().trim();
  for (const [group, cats] of Object.entries(CATEGORIA_GROUPS)) {
    if (cats.some(k => c === k || c.startsWith(k))) return group;
  }
  return null;
}

function cleanVal(val) {
  if (!val || typeof val !== 'string') return val;
  if (/stima orientativa|verificare su visura|verificare su nta|disponibile su visura|richiedi visura/i.test(val)) return null;
  return val;
}

// Filtra testi "stima orientativa" restituendo un fallback invece di null
function cleanOrFallback(val, fallback) {
  if (!val || typeof val !== 'string') return fallback || null;
  if (/stima orientativa|verificare su (visura|nta|prg)|disponibile su visura|richiedi visura/i.test(val)) return fallback || null;
  return val;
}

function normalizeComplessita(val) {
  if (!val || typeof val !== 'string') return null;
  if (val.length > 25 || val.toLowerCase().includes('stima') || val.toLowerCase().includes('verificare')) return null;
  return val;
}

// Tempi e costi standard per tipo pratica — usati come fallback quando l'AI genera "stima orientativa"
const PRATICHE_FALLBACK = {
  'permesso di costruire':   { tempistica: '60–90 giorni (prorogabile a 150 gg)', costi: 'Oneri urbanizzazione primaria/secondaria + diritti segreteria' },
  'scia':                    { tempistica: '30 giorni (silenzio-assenso)', costi: 'Diritti di segreteria comunali + oneri di urbanizzazione' },
  'cila':                    { tempistica: '5 giorni (comunicazione)', costi: 'Diritti di segreteria (€30–150 ca.)' },
  'cila-s':                  { tempistica: '5 giorni (comunicazione asseverata)', costi: 'Diritti di segreteria (€50–200 ca.)' },
  'comunicazione':           { tempistica: '5 giorni', costi: 'Diritti di segreteria (€30–150 ca.)' },
  'variante urbanistica':    { tempistica: '6–18 mesi', costi: 'Oneri di urbanizzazione + spese tecniche' },
  'autorizzazione paesagg':  { tempistica: '60–120 giorni', costi: 'Diritti istruttoria + spese tecniche' },
  'ristrutturazione':        { tempistica: '30–90 giorni (CILA/SCIA/PDC)', costi: 'Diritti di segreteria + oneri comunali' },
  'manutenzione':            { tempistica: '5–30 giorni', costi: 'Diritti di segreteria (€30–100 ca.)' },
  'nuova costruzione':       { tempistica: '60–90 giorni (PDC)', costi: 'Oneri di urbanizzazione + costo costruzione' },
};

function getPraticaFallback(tipo) {
  const t = (tipo || '').toLowerCase();
  for (const [key, val] of Object.entries(PRATICHE_FALLBACK)) {
    if (t.includes(key)) return val;
  }
  return { tempistica: '30–90 giorni (variabile per tipo pratica)', costi: 'Diritti di segreteria + eventuali oneri comunali' };
}

function enrichFattibilita(interventi, ntaData, comune) {
  if (!interventi) return [];
  return interventi.map(fi => {
    const tipo = (fi.tipo_intervento || '').toLowerCase();
    const fb = getPraticaFallback(fi.pratica_richiesta || fi.tipo_intervento);

    // Pulisci nota, tempistica e costi da "stima orientativa"
    const note = cleanOrFallback(fi.note,
      ntaData && tipo.includes('nuova') ? `Permesso di costruire obbligatorio. IF ${ntaData.IF}, H max ${ntaData.Hmax}.` :
      ntaData ? `Intervento ammesso nella zona ${ntaData.nomeZona || 'residenziale'} (${ntaData.strumento}).` : null
    );
    const tempistica = cleanOrFallback(fi.tempistica_stimata, fb.tempistica);
    const costi = cleanOrFallback(fi.costi_stimati, fb.costi);
    const ente = cleanOrFallback(fi.ente_competente,
      tipo.includes('nuova') ? `Comune di ${comune} — Ufficio Urbanistica` : `Comune di ${comune} — Ufficio Edilizia Privata`
    );

    return { ...fi, note, tempistica_stimata: tempistica, costi_stimati: costi, ente_competente: ente };
  });
}

const FINALITA_LABELS = {
  acquisto_privato: "Acquisto privato",
  investimento: "Investimento",
  sviluppo_immobiliare: "Sviluppo immobiliare",
  asta_giudiziaria: "Asta giudiziaria",
  due_diligence: "Due diligence",
  valutazione_professionale: "Valutazione professionale",
};

const SEISMIC_ZONES = {
  'Torino': 3, 'Alessandria': 3, 'Asti': 3, 'Biella': 3, 'Cuneo': 3, 'Novara': 4,
  'Verbania': 3, 'Vercelli': 4, 'Casale Monferrato': 3, 'Moncalieri': 3, 'Collegno': 3,
  'Settimo Torinese': 3, 'Pinerolo': 3, 'Rivoli': 3, 'Nichelino': 3, 'Chieri': 3,
  'Carmagnola': 3, 'Alba': 3, 'Bra': 3, 'Fossano': 3, 'Saluzzo': 3, 'Mondovì': 3,
  'Acqui Terme': 3, 'Ovada': 3, 'Tortona': 3, 'Novi Ligure': 3, 'Pietra Ligure': 2,
  'Genova': 3, 'Savona': 3, 'La Spezia': 2, 'Imperia': 2, 'Sanremo': 3,
  'Bordighera': 3, 'Ventimiglia': 3, 'Albenga': 3, 'Sestri Levante': 2,
  'Chiavari': 2, 'Rapallo': 2, 'Arenzano': 3, 'Varazze': 3,
  'Milano': 4, 'Monza': 4, 'Bergamo': 3, 'Brescia': 2, 'Como': 2, 'Cremona': 3,
  'Lecco': 2, 'Lodi': 3, 'Mantova': 3, 'Pavia': 3, 'Sondrio': 2, 'Varese': 4,
  'Vigevano': 3, 'Busto Arsizio': 4, 'Gallarate': 4, 'Saronno': 4, 'Legnano': 4,
  'Seregno': 4, 'Rho': 4, 'Sesto San Giovanni': 4, 'Cinisello Balsamo': 4,
  'Desenzano del Garda': 2, 'Treviglio': 3, 'Romano di Lombardia': 3,
};
const SEISMIC_DESC = { 1: 'Alta pericolosità sismica', 2: 'Pericolosità sismica media', 3: 'Pericolosità sismica bassa', 4: 'Pericolosità sismica molto bassa' };

function ZonaBadge({ colore }) {
  const config = {
    verde: { bg: "bg-emerald-100 border-emerald-300 text-emerald-800", label: "Zona Verde — Alta fattibilità" },
    giallo: { bg: "bg-amber-100 border-amber-300 text-amber-800", label: "Zona Gialla — Fattibilità condizionata" },
    rosso: { bg: "bg-red-100 border-red-300 text-red-800", label: "Zona Rossa — Criticità significative" },
  };
  const c = config[colore?.toLowerCase()] || config.giallo;
  return (
    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border font-semibold text-sm ${c.bg}`}>
      <span className={`w-3 h-3 rounded-full ${colore === 'verde' ? 'bg-emerald-500' : colore === 'rosso' ? 'bg-red-500' : 'bg-amber-500'}`} />
      {c.label}
    </span>
  );
}

function PRGStatusBadge({ status }) {
  const cfg = {
    found:        { color: "#22c55e", bg: "#f0fdf4", label: "🟢 PRG open disponibile" },
    partial:      { color: "#f59e0b", bg: "#fffbeb", label: "🟡 Dato parziale" },
    catasto_only: { color: "#B33A2A", bg: "#fef2f2", label: "🔴 PRG non open" },
    missing:      { color: "#B33A2A", bg: "#fef2f2", label: "🔴 Comune non trovato" },
  }[status] || { color: "#6b7280", bg: "#f9fafb", label: "— Dato PRG non verificato" };
  return <span className="inline-flex items-center text-xs font-semibold px-2 py-1 rounded" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>;
}

function FattibilitaBadge({ value }) {
  if (value === "fattibile") return <span className="flex items-center gap-1 text-emerald-700 text-xs font-semibold"><CheckCircle2 className="w-4 h-4" /> Fattibile</span>;
  if (value === "non_fattibile") return <span className="flex items-center gap-1 text-red-600 text-xs font-semibold"><XCircle className="w-4 h-4" /> Non fattibile</span>;
  return <span className="flex items-center gap-1 text-amber-700 text-xs font-semibold"><AlertCircle className="w-4 h-4" /> Con autorizzazione</span>;
}

const INDICI_NTA_LOCAL = {
  "Alessandria": { IF: "2.0 m³/m²", Hmax: "10.5 m (≈ 3 piani)" },
  "Torino":      { IF: "2.0 m³/m²", Hmax: "14.5 m (≈ 4 piani)" },
  "Cuneo":       { IF: "1.5 m³/m²", Hmax: "9.0 m (≈ 3 piani)" },
  "Asti":        { IF: "1.8 m³/m²", Hmax: "10.5 m" },
  "Novara":      { IF: "2.0 m³/m²", Hmax: "12.0 m" },
  "Vercelli":    { IF: "1.5 m³/m²", Hmax: "9.0 m" },
  "Biella":      { IF: "1.5 m³/m²", Hmax: "9.0 m" },
  "Verbania":    { IF: "1.5 m³/m²", Hmax: "9.0 m" },
  "Genova":      { IF: "2.0 m³/m²", Hmax: "12.0 m" },
  "La Spezia":   { IF: "1.8 m³/m²", Hmax: "10.5 m" },
  "Savona":      { IF: "1.5 m³/m²", Hmax: "9.0 m" },
  "Imperia":     { IF: "1.5 m³/m²", Hmax: "9.0 m" },
};

// ── Main Component ─────────────────────────────────────────────────────────

/**
 * ReportPageContent — renders the full report UI.
 * Props:
 *   query        - the CadastralQuery record (required)
 *   refetch      - optional function to refresh the query record
 *   isPublicView - if true, hides auth-only actions (AccoessoAtti, WFS trigger, admin PDF, etc.)
 */
export default function ReportPageContent({ query, refetch = () => {}, isPublicView = false }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [showAttiForm, setShowAttiForm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [resolvedNta, setResolvedNta] = useState(null);
  const [comunePrefill, setComunePrefill] = useState(null);
  const [financialSnapshot, setFinancialSnapshot] = useState(null);

  useEffect(() => {
    if (!isPublicView) {
      base44.auth.me().then(u => setCurrentUser(u)).catch(() => {});
    }
  }, [isPublicView]);

  const handleDownloadPDF = async () => {
    setIsDownloadingPDF(true);
    const { doc, reportNum } = await generatePDF(query, financialSnapshot);
    doc.save(`URBICHECK_${query.comune}_${reportNum}.pdf`);
    setIsDownloadingPDF(false);
    toast({ title: "PDF scaricato ✓", description: `Scheda ${reportNum} salvata.` });
  };

  const r = query.report_data || {};
  const isAsta = query.finalita === "asta_giudiziaria";
  const ntaLocal = INDICI_NTA_LOCAL[query.comune] || null;
  const isPiemonte = (query.regione || '').toLowerCase().includes('piemonte');
  const isLiguria = (query.regione || '').toLowerCase().includes('liguria');
  const isLombardia = (query.regione || '').toLowerCase().includes('lombardia');
  const wfsRis = r.wfs_liguria?.risultati;
  const comuneLower = (query.comune || '').toLowerCase().trim();

  const staticZona = SEISMIC_ZONES[query.comune] ||
    SEISMIC_ZONES[Object.keys(SEISMIC_ZONES).find(k => k.toLowerCase() === query.comune?.toLowerCase?.())];

  const wfsSismica = wfsRis?.sismica;
  let vincoloSismicoEffettivo;
  if (wfsSismica) {
    const zonaLabel = `Zona ${wfsSismica.zona}`;
    vincoloSismicoEffettivo = { presente: true, zona: `${zonaLabel} — ${wfsSismica.descrizione || ''}`, dettagli: `${zonaLabel} — ${wfsSismica.descrizione || ''}. ${wfsSismica.nota || ''} Rif: ${wfsSismica.riferimento_normativo || ''}` };
  } else if (staticZona) {
    vincoloSismicoEffettivo = { presente: true, zona: `Zona ${staticZona} — ${SEISMIC_DESC[staticZona]}`, dettagli: `Zona sismica ${staticZona} — ${SEISMIC_DESC[staticZona]}. Fonte: Classificazione sismica ufficiale OPCM 3274/2003 — Dipartimento Protezione Civile.`, verified: true };
  } else if (isPiemonte) {
    vincoloSismicoEffettivo = { presente: true, zona: 'Zona 3 — Media sismicità — DGR n.6-887/2019', dettagli: 'Zona 3 — Media sismicità — DGR n.6-887/2019. Applicare NTC 2018.' };
  } else {
    vincoloSismicoEffettivo = r.vincoli?.vincolo_sismico || { presente: false };
  }

  const wfsPai = wfsRis?.pai_rischio_idrogeologico;
  const paiFranePresenti = wfsPai && (wfsPai.features_totali > 0 || wfsPai.dati?.some(d => d.trovato));
  const _idraulicoAI = r.vincoli?.vincolo_idraulico;
  const idraulicoDettagliAI = cleanOrFallback(_idraulicoAI?.dettagli, 'Verifica PAI consigliata — richiedere CDU al Comune o consultare IdroGEO ISPRA');
  const vincoloIdraulicoEffettivo = wfsPai
    ? { presente: paiFranePresenti, dettagli: wfsPai.nota || (paiFranePresenti ? 'Rilevate geometrie PAI — consultare fonte ufficiale.' : 'Nessuna frana censita entro area di ricerca.'), classe_rischio: paiFranePresenti ? 'Da verificare su fonte ufficiale' : null }
    : (_idraulicoAI ? { ..._idraulicoAI, dettagli: idraulicoDettagliAI } : { presente: false });

  const wfsVincoliPaesaggistici = wfsRis?.vincoli_paesaggistici_ope_legis;
  const wfsPaesaggisticoVincoli = wfsVincoliPaesaggistici?.vincoli?.filter(v => v.livello === 'APPLICABILE') || [];
  const _paesaggisticoAI = r.vincoli?.vincolo_paesaggistico;
  const paesaggisticoDettagliAI = cleanOrFallback(_paesaggisticoAI?.dettagli, 'Verifica puntuale consigliata — richiedere CDU al Comune');
  const vincoloPaesaggisticoEffettivo = wfsVincoliPaesaggistici
    ? { presente: wfsPaesaggisticoVincoli.length > 0, dettagli: wfsPaesaggisticoVincoli.length > 0 ? wfsPaesaggisticoVincoli.map(v => v.descrizione || v.tipo).join(' | ') : (wfsVincoliPaesaggistici.vincoli?.[0]?.nota || 'Nessun vincolo paesaggistico ope legis rilevato.'), tipo: wfsPaesaggisticoVincoli.length > 0 ? wfsPaesaggisticoVincoli.map(v => v.tipo).join(', ') : null }
    : (_paesaggisticoAI ? { ..._paesaggisticoAI, dettagli: paesaggisticoDettagliAI } : { presente: false, dettagli: 'Non verificato via WFS — richiedere CDU al Comune' });

  const wfsCorsiAcqua = wfsRis?.vincolo_corsi_acqua;
  const corsiAcquaTrovati = wfsCorsiAcqua?.dati?.filter(d => d.trovato) || [];
  const vincoloCorsiAcquaEffettivo = wfsCorsiAcqua
    ? { presente: corsiAcquaTrovati.length > 0, dettagli: corsiAcquaTrovati.length > 0 ? corsiAcquaTrovati.map(d => `${d.nome} (${d.tipo})`).join(', ') + ' — fascia tutela 150m art.142 D.Lgs 42/2004' : (wfsCorsiAcqua.dati?.[0]?.nota || "Nessun corso d'acqua rilevato entro 250m.") }
    : null;

  const wfsFerroviario = wfsRis?.vincolo_ferroviario;
  const ferrorieTrovate = wfsFerroviario?.dati?.filter(d => d.trovato) || [];
  const vfNew = r.vincolo_ferroviario;
  const isNewStructure = vfNew && typeof vfNew.vicina !== 'undefined';
  let vincoloFerroviarioEffettivo = null;
  let ferroviaStoricaCard = null;
  let metroCard = null;
  let tramCard = null;

  // Lookup statico ferrovie dismesse/turistiche (usato da VincoliRischiPiemonte)
  const FERROVIE_DISMESSE_PIEMONTE = [
    { comuni: ['calamandrana','nizza monferrato','canelli','castagnole delle lanze','costigliole d\'asti','isola d\'asti','asti','portacomaro','castello di annone','annone di brianza'], nome: 'Ferrovia Asti-Alba (Ferrovia Turistica delle Langhe e del Monferrato)', tipo: 'ferroviaria_dismessa_turistica' },
    { comuni: ['alba','bra','cherasco','fossano','cuneo'], nome: 'Ferrovia Alba-Bra-Cuneo (dismessa)', tipo: 'ferroviaria_dismessa' },
    { comuni: ['mondovì','villanova mondovì','niella tanaro','ceva','garessio','ormea'], nome: 'Ferrovia Ceva-Ormea (dismessa)', tipo: 'ferroviaria_dismessa' },
    { comuni: ['casale monferrato','occimiano','rivarone','tortona'], nome: 'Ferrovia Casale-Mortara (tratto piemontese, dismessa)', tipo: 'ferroviaria_dismessa' },
  ];
  const staticFerroviaMatch = isPiemonte
    ? FERROVIE_DISMESSE_PIEMONTE.find(f => f.comuni.includes(comuneLower?.trim()))
    : null;

  if (wfsFerroviario) {
    // Se Overpass non trova ferrovie ma il lookup statico sì → usare quello
    if (ferrorieTrovate.length === 0 && staticFerroviaMatch) {
      vincoloFerroviarioEffettivo = {
        presente: true,
        dettagli: `${staticFerroviaMatch.nome} — verifica fasce DPR 753/1980 (30m dall'asse). Ferrovia dismessa/turistica: le fasce di rispetto possono permanere.`,
      };
    } else {
      vincoloFerroviarioEffettivo = { presente: ferrorieTrovate.length > 0, dettagli: ferrorieTrovate.length > 0 ? ferrorieTrovate.map(d => `${d.nome} — fascia rispetto 30m (DPR 753/1980)`).join(' | ') : (wfsFerroviario.dati?.[0]?.nota || 'Nessuna ferrovia rilevata entro 500m.') };
    }
  } else if (!isNewStructure && vfNew) {
    const vf = vfNew;
    if (vf.ferrovia_attiva?.presente) {
      const fa = vf.ferrovia_attiva;
      vincoloFerroviarioEffettivo = { presente: true, dettagli: fa.tipo === 'assoluta' ? `🚆 Ferrovia attiva — Fascia ASSOLUTA (DPR 753/1980 art. 49). Edificazione vietata entro 30m. Distanza: ${fa.distanza_m}m.` : fa.tipo === 'limitata' ? `🚆 Ferrovia attiva — Fascia 150m (DPR 753/1980). Distanza: ${fa.distanza_m}m.` : `🚆 ${fa.dettagli || `Ferrovia attiva nelle vicinanze. Distanza: ${fa.distanza_m}m.`}` };
    } else if (vf.presente && vf.tipo && !['nessuna','storica','assente'].includes(vf.tipo) && !vf.ferrovia_attiva) {
      vincoloFerroviarioEffettivo = { presente: true, dettagli: vf.tipo === 'assoluta' ? `Fascia di rispetto ferroviaria ASSOLUTA — DPR 753/1980. Distanza: ${vf.distanza_m}m.` : `Vincolo ferroviario DPR 753/1980. Distanza: ${vf.distanza_m}m.` };
    }
    if (vf.ferrovia_storica?.presente) ferroviaStoricaCard = vf.ferrovia_storica;
    if (vf.metro?.presente) metroCard = vf.metro;
    if (vf.tram?.presente) tramCard = vf.tram;
  }

  const FIN_FINALITA = ["investimento", "sviluppo_immobiliare", "asta_giudiziaria"];
  const showFinancial = FIN_FINALITA.includes(query.finalita) || r.fin_data?.prezzo_acquisto;
  const finData = r.fin_data || {};
  const reportNum = `UB-${query.id?.slice(-8).toUpperCase()}`;

  const categoriaRaw = query.categoria_catastale || r.dati_catastali?.categoria;
  const categoriaGroup = detectCategoriaGroup(categoriaRaw);
  const categoriaBadge = categoriaGroup ? CATEGORIA_LABELS[categoriaGroup] : null;
  const isResiCategory = /^A\//i.test(categoriaRaw || '');
  const isPrgServizi = r.zonizzazione && (r.zonizzazione.zona_codice === '19' || /servizi.*(impianti|pubblici)/i.test(r.zonizzazione.destinazione_prevalente || '') || /area.*servizi/i.test(r.zonizzazione.destinazione_prevalente || '') || /servizi.impianti/i.test(r.zonizzazione.zona_codice || ''));
  const showPrgMismatchNote = isResiCategory && isPrgServizi;

  const complessitaNorm = normalizeComplessita(r.valutazione_sintetica?.livello_complessita);
  // hasVerifiedVincoli = true quando abbiamo dati sismici certi (staticZona) o WFS ufficiale
  // Questo evita di mostrare "⚠ Non verificato" per vincoli che abbiamo dalla classificazione OPCM
  const hasVerifiedVincoli = !!(wfsRis) || isPiemonte || isLiguria || !!staticZona;

  const complexityColor = {
    "Bassa": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Basso": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Media": "bg-amber-50 text-amber-700 border-amber-200",
    "Medio": "bg-amber-50 text-amber-700 border-amber-200",
    "Alta": "bg-red-50 text-red-700 border-red-200",
    "Alto": "bg-red-50 text-red-700 border-red-200",
    "Molto Alta": "bg-red-100 text-red-900 border-red-400",
  };

  const sezioniDisponibili = r.catasto_data?.sezioni_disponibili || [];
  const hasMultiSezioni = sezioniDisponibili.length > 1 && !query.sezione_catastale;

  const handleSelezioneSezione = async (sezione) => {
    const sez = sezioniDisponibili.find(s => s.sezione === sezione);
    if (!sez) return;
    await base44.entities.CadastralQuery.update(query.id, {
      sezione_catastale: sezione,
      centroid_lat: sez.lat,
      centroid_lng: sez.lon,
      report_data: { ...r, catasto_data: { ...r.catasto_data, lat: sez.lat, lon: sez.lon, inspire_id: sez.id } },
    });
    await refetch();
    toast({ title: `Sezione ${sezione} selezionata ✓` });
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        {!isPublicView && query.batch_id && (
          <Link to={`/batch/${query.batch_id}`} className="inline-flex items-center gap-1 text-sm text-primary font-semibold hover:underline mb-2">
            <ArrowLeft className="w-3 h-3" /> Torna al Report Palazzina
          </Link>
        )}
        {!isPublicView && (
          <Link to="/history" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-3 h-3" /> Torna allo storico
          </Link>
        )}

        <div className="rounded-xl p-5 mb-4" style={{ background: '#1e3a5f' }}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-widest mb-1">Scheda Certificata · {reportNum}</p>
              <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">{query.comune} ({query.regione})</h1>
              <p className="text-white/70 text-sm mt-1">
                Foglio {query.foglio} · Particella {query.particella}
                {query.subalterno ? ` · Sub. ${query.subalterno}` : ""}
                {query.provincia ? ` · ${query.provincia}` : ""}
              </p>
            </div>
            <div className="flex flex-col items-start lg:items-end gap-2">
              {query.finalita && <Badge className="bg-white/10 text-white border-white/20 text-xs">{FINALITA_LABELS[query.finalita] || query.finalita}</Badge>}
              <p className="text-white/50 text-xs">{format(new Date(query.created_date), "d MMMM yyyy 'alle' HH:mm", { locale: it })}</p>
              {complessitaNorm && (
                <Badge variant="outline" className={`${complexityColor[complessitaNorm] || 'bg-amber-50 text-amber-700 border-amber-200'} text-xs`}>
                  Complessità: {complessitaNorm}
                </Badge>
              )}
              <Badge className="bg-emerald-500 text-white border-0 text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Scheda certificata · N. {reportNum}
              </Badge>
            </div>
          </div>
        </div>
      </motion.div>

      {categoriaBadge && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`mb-4 rounded-lg border px-4 py-3 flex items-center gap-2 ${categoriaBadge.color}`}>
          <span className="text-lg">{categoriaBadge.icon}</span>
          <div>
            <p className="font-bold text-sm">{categoriaBadge.label} — {categoriaRaw}</p>
            <p className="text-xs mt-0.5 opacity-80">I valori OMI, i costi di ristrutturazione e la fattibilità sono calibrati per immobili non residenziali.</p>
          </div>
        </motion.div>
      )}

      {/* AVVISO MULTI-SEZIONE CATASTALE */}
      {!isPublicView && hasMultiSezioni && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 rounded-xl border-2 border-amber-400 bg-amber-50 p-5">
          <p className="font-bold text-amber-900 mb-2">
            {r.catasto_data?.selezione_richiesta ? `Sezione "${r.catasto_data.sezione_sister_cercata}" non trovata nel database INSPIRE — seleziona la posizione corretta` : `Trovata particella in ${sezioniDisponibili.length} sezioni catastali — seleziona quella corretta`}
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            {sezioniDisponibili.map(s => (
              <Button key={s.sezione || 'principale'} variant="outline" className="border-amber-400 text-amber-800 hover:bg-amber-100 text-left h-auto py-3 px-4 flex flex-col items-start gap-0.5" onClick={() => handleSelezioneSezione(s.sezione)}>
                <span className="font-bold text-sm">{s.sezione ? `Sezione INSPIRE: ${s.sezione}` : 'Sezione principale'}</span>
                <span className="text-xs font-mono">📍 {s.lat?.toFixed(5)}, {s.lon?.toFixed(5)}</span>
                {s.zona && <span className="text-xs text-amber-700 mt-0.5">{s.zona}</span>}
              </Button>
            ))}
          </div>
        </motion.div>
      )}

      <div className="space-y-6">
        {/* Tipologia immobile */}
        {r.dati_catastali && (
          <ReportSection icon={Building2} title="Tipologia Immobile" delay={0.02}>
            <DataRow label="Categoria catastale" value={query.categoria_catastale || cleanVal(r.dati_catastali.categoria) || r.catasto_data?.categoria} />
            <DataRow label="Destinazione d'Uso" value={cleanVal(r.dati_catastali.destinazione_uso) || r.catasto_data?.destinazione_uso} />
            <DataRow label="Consistenza / Superficie" value={query.vani ? `${query.vani} vani` : query.superficie_mq ? `${query.superficie_mq} mq` : (cleanVal(r.dati_catastali.consistenza) || r.catasto_data?.superficie)} />
            <DataRow label="Classe" value={query.classe_catastale || cleanVal(r.dati_catastali.classe)} />
            <DataRow label="Rendita Catastale" value={query.rendita_catastale != null ? `€${Number(query.rendita_catastale).toFixed(2)}` : cleanVal(r.dati_catastali.rendita_catastale)} />
            <DataRow label="Zona Censuaria" value={query.zona_censuaria || cleanVal(r.dati_catastali.zona_censuaria)} />
            {r.dati_catastali.microzona && !/verificare su visura/i.test(r.dati_catastali.microzona) && <DataRow label="Microzona" value={r.dati_catastali.microzona} />}
            {query.intestatari?.length > 0 && <DataRow label="Intestatari" value={query.intestatari.join(" — ")} />}
            {query.superficie_mq && <DataRow label="Superficie catastale" value={`${query.superficie_mq} mq`} />}
            {r.planimetria_data?.source === 'planimetria_upload' && r.planimetria_data?.was_uploaded === true && r.planimetria_data?.superficie_mq && (
              <div className="mt-2 p-2 rounded bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-center gap-2">
                <span>📐</span>
                <span><strong>Planimetria allegata:</strong> Superficie {r.planimetria_data.superficie_mq} mq{r.planimetria_data.vani ? ` · Vani: ${r.planimetria_data.vani}` : ''}</span>
              </div>
            )}
            {r.planimetria_data?.source === 'planimetria_upload' && r.planimetria_data?.was_uploaded === true && r.planimetria_data?.leggibile === false && (
              <div className="mt-2 p-2 rounded bg-amber-50 border border-amber-200 text-xs text-amber-800">📐 Planimetria allegata — superficie non rilevata automaticamente.</div>
            )}
          </ReportSection>
        )}

        {/* Planimetria — solo in vista autenticata (richiede auth per upload) */}
        {!isPublicView && <PlanimetriaSection query={query} onUpdated={refetch} />}

        {/* Zonizzazione */}
        {r.zonizzazione && (
          <ReportSection icon={MapPin} title="Zonizzazione Urbanistica" delay={0.04}>
            <div className="mb-4"><ZonaBadge colore={r.zonizzazione.colore} /></div>
            <DataRow label="Categoria generale" value={r.zonizzazione.destinazione_prevalente} />
            <DataRow label="Zona" value={r.zonizzazione.zona_codice} />
            {r.prg_lookup_status && <div className="mt-2"><PRGStatusBadge status={r.prg_lookup_status} /></div>}
            {showPrgMismatchNote && (
              <div className="mt-3 p-3 rounded-lg border border-amber-300 bg-amber-50 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900">⚠️ <strong>Possibile disallineamento PRG:</strong> La zonizzazione dal mosaico regionale indica un'area per servizi/impianti (codice 19), ma la categoria catastale risulta residenziale ({categoriaRaw}). <strong>Richiedere il CDU al Comune per conferma ufficiale.</strong></p>
              </div>
            )}
            {r.zonizzazione.descrizione && <div className="mt-3 p-3 bg-muted/50 rounded-lg"><p className="text-sm text-muted-foreground">{r.zonizzazione.descrizione}</p></div>}
          </ReportSection>
        )}

        {/* Vincoli */}
        {(r.vincoli || wfsRis) && (
          <ReportSection icon={Shield} title="Vincoli Principali" delay={0.06}>
            {wfsRis && <p className="text-[10px] uppercase tracking-widest text-emerald-700 mb-3" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>✓ Dati da fonti ufficiali WFS — {isPiemonte ? 'ARPA Piemonte + Overpass' : isLiguria ? 'Regione Liguria + Overpass' : 'WFS ufficiale'}</p>}
            {!hasVerifiedVincoli && (
              <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-900">⚠ Vincoli non verificati tramite WFS ufficiale</p>
                  <p className="text-xs text-amber-800 mt-0.5">I valori mostrati sono stime AI indicative e <strong>non sostituiscono una verifica ufficiale</strong>.{isLombardia && <> Verifica PAI su <a href="https://geoportale.regione.lombardia.it" target="_blank" rel="noopener noreferrer" className="underline">geoportale.regione.lombardia.it</a>.</>}</p>
                  <p className="text-xs text-amber-800 mt-1 font-semibold">→ Richiedere CDU al Comune per verifica ufficiale di tutti i vincoli.</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <VincoloCard label="Vincolo Sismico" presente={vincoloSismicoEffettivo.presente} dettagli={vincoloSismicoEffettivo.dettagli} extra={vincoloSismicoEffettivo.zona} unverified={!hasVerifiedVincoli} />
              <VincoloCard label="Rischio Idrogeologico (PAI)" presente={vincoloIdraulicoEffettivo.presente} unverified={!hasVerifiedVincoli}
                dettagli={isPiemonte && query.centroid_lat && query.centroid_lng ? <span>{vincoloIdraulicoEffettivo.dettagli}{vincoloIdraulicoEffettivo.dettagli && ' — '}<a href="https://webgis.arpa.piemonte.it/agportal/home" target="_blank" rel="noopener noreferrer" style={{ color: '#1A3A6B', textDecoration: 'underline' }}>Mappa ARPA interattiva →</a></span> : vincoloIdraulicoEffettivo.dettagli}
                extra={vincoloIdraulicoEffettivo.classe_rischio} />
              <VincoloCard label="Vincolo Paesaggistico" presente={vincoloPaesaggisticoEffettivo.presente} dettagli={vincoloPaesaggisticoEffettivo.dettagli} extra={vincoloPaesaggisticoEffettivo.tipo} unverified={!hasVerifiedVincoli} />
              {r.vincoli?.vincolo_archeologico && <VincoloCard label="Vincolo Archeologico" presente={r.vincoli.vincolo_archeologico.presente} dettagli={r.vincoli.vincolo_archeologico.dettagli} unverified={!hasVerifiedVincoli} />}
              {vincoloCorsiAcquaEffettivo && <VincoloCard label="Corsi d'Acqua (art.142)" presente={vincoloCorsiAcquaEffettivo.presente} dettagli={vincoloCorsiAcquaEffettivo.dettagli} unverified={!hasVerifiedVincoli} />}
              {isNewStructure && (() => {
                const vf = vfNew;
                const isStorica = /turist|storica?/i.test(vf.ferrovia || '') || vf.usage === 'tourism';
                if (vf.presente) return <div className="rounded-lg border-2 border-red-400 bg-red-50 p-3"><p className="text-sm font-bold text-red-900">⚠️ VINCOLO FERROVIARIO — ferrovia entro fascia di rispetto (30m)</p>{vf.ferrovia && <p className="text-xs font-semibold text-red-800 mt-1">{vf.ferrovia}</p>}{vf.distanza_m != null && <p className="text-xs text-red-700 mt-0.5">Distanza: {vf.distanza_m}m</p>}{vf.tipo && <p className="text-xs text-red-700">Tipo: {vf.tipo}</p>}<p className="text-xs text-red-800 mt-1 font-semibold">Rif. DPR 753/1980 — edificazione vietata entro 30m dall'asse del binario.</p></div>;
                if (vf.vicina) return <div className="rounded-lg border border-amber-400 bg-amber-50 p-3"><p className="text-sm font-bold text-amber-900">🚂 Ferrovia nelle vicinanze — {vf.distanza_m != null ? `${vf.distanza_m}m` : 'distanza n/d'}</p>{vf.ferrovia && <p className="text-xs font-semibold text-amber-800 mt-1">{vf.ferrovia}</p>}<p className="text-xs text-amber-800 mt-1 leading-relaxed">Ferrovia rilevata nelle vicinanze ma fuori dalla fascia di rispetto legale (30m). Nessun vincolo DPR 753/1980 applicabile.</p>{isStorica && <p className="text-xs text-amber-700 mt-1 font-semibold">Linea a carattere storico/turistico — transiti limitati.</p>}</div>;
                return <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 flex items-center gap-2"><span className="text-base">✅</span><p className="text-sm text-emerald-800">Nessuna ferrovia entro 500m</p></div>;
              })()}
              {!isNewStructure && vincoloFerroviarioEffettivo && <VincoloCard label="Vincolo Ferroviario" presente={vincoloFerroviarioEffettivo.presente} dettagli={vincoloFerroviarioEffettivo.dettagli} unverified={!hasVerifiedVincoli} />}
              {!isNewStructure && !vincoloFerroviarioEffettivo && isLombardia && (
                <FerroviaCard data={wfsFerroviario || null} comune={query.comune} regione={query.regione} />
              )}
              {!isNewStructure && ferroviaStoricaCard && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3"><div className="flex items-start gap-2"><span className="text-lg leading-none mt-0.5">{ferroviaStoricaCard.icon || '🚂'}</span><div><p className="text-sm font-bold text-amber-900">{ferroviaStoricaCard.label}</p>{ferroviaStoricaCard.nome && <p className="text-xs text-amber-800 font-semibold mt-0.5">{ferroviaStoricaCard.nome}</p>}<p className="text-xs text-amber-700 mt-1 leading-relaxed">{ferroviaStoricaCard.dettagli}</p><p className="text-[10px] text-amber-600 mt-1">Distanza: {ferroviaStoricaCard.distanza_m}m</p></div></div></div>}
              {!isNewStructure && metroCard && <div className="rounded-lg border border-blue-300 bg-blue-50 p-3"><div className="flex items-start gap-2"><span className="text-lg leading-none mt-0.5">{metroCard.icon || '🚇'}</span><div><p className="text-sm font-bold text-blue-900">{metroCard.label}</p>{metroCard.nome && <p className="text-xs text-blue-800 font-semibold mt-0.5">{metroCard.nome}</p>}<p className="text-xs text-blue-700 mt-1 leading-relaxed">{metroCard.dettagli}</p></div></div></div>}
              {!isNewStructure && tramCard && <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3"><div className="flex items-start gap-2"><span className="text-lg leading-none mt-0.5">{tramCard.icon || '🚊'}</span><div><p className="text-sm font-bold text-yellow-900">{tramCard.label}</p>{tramCard.nome && <p className="text-xs text-yellow-800 font-semibold mt-0.5">{tramCard.nome}</p>}<p className="text-xs text-yellow-700 mt-1 leading-relaxed">{tramCard.dettagli}</p></div></div></div>}
              {r.vincolo_idrico?.elementi?.map((el, i) => {
                const isAlto = el.impatto === 'alto'; const isMedio = el.impatto === 'medio';
                const colorCls = isAlto ? 'border-red-300 bg-red-50' : isMedio ? 'border-amber-300 bg-amber-50' : 'border-blue-200 bg-blue-50';
                const textCls = isAlto ? 'text-red-900' : isMedio ? 'text-amber-900' : 'text-blue-900';
                const subCls = isAlto ? 'text-red-700' : isMedio ? 'text-amber-700' : 'text-blue-700';
                const smallCls = isAlto ? 'text-red-600' : isMedio ? 'text-amber-600' : 'text-blue-600';
                return <div key={`ww-${i}`} className={`rounded-lg border p-3 ${colorCls}`}><div className="flex items-start gap-2"><span className="text-lg leading-none mt-0.5">{el.icon}</span><div><p className={`text-sm font-bold ${textCls}`}>{el.label}</p>{el.nome && <p className={`text-xs font-semibold mt-0.5 ${subCls}`}>{el.nome}</p>}<p className={`text-xs mt-1 leading-relaxed ${subCls}`}>{el.dettagli}</p>{el.link_pai && <a href={el.link_pai} target="_blank" rel="noopener noreferrer" className={`text-[10px] underline mt-1 inline-block ${smallCls}`}>Piano di Assetto Idrogeologico Liguria →</a>}<p className={`text-[10px] mt-1 ${smallCls}`}>Distanza: {el.distanza_m}m</p></div></div></div>;
              })}
              {r.vincolo_idrico?.presente && r.vincolo_idrico.footer && <div className="col-span-full text-[10px] text-muted-foreground italic border-t border-border pt-2 mt-1">ℹ️ {r.vincolo_idrico.footer}</div>}
            </div>
            {r.vincoli?.altri_vincoli?.length > 0 && !wfsRis && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Altri Vincoli (stima AI)</p>
                {r.vincoli.altri_vincoli.map((v, i) => <VincoloCard key={i} label={v.nome} presente={v.presente} dettagli={v.dettagli} unverified={!hasVerifiedVincoli} />)}
              </div>
            )}
          </ReportSection>
        )}

        {/* Indici Edilizi */}
        <IndiciEdiliziSection indici={r.indici_edilizi} comune={query.comune} regione={query.regione} query={query} wfsZonaUrbanistica={r.wfs_liguria?.risultati?.zona_urbanistica} delay={0.08} onNtaResolved={setResolvedNta} />

        {/* Vincoli e Rischi Piemonte */}
        {isPiemonte && query.report_data?.wfs_liguria && <VincoliRischiPiemonte query={query} />}

        {/* Quadro Urbanistico */}
        {r.quadro_urbanistico && (() => {
          // Zona WMS mosaicatura (fonte primaria) vs lookup NTA statico
          const wmsZonaCodice = wfsRis?.zona_urbanistica?.zona_codice || null;
          const wmsDescrizione = wfsRis?.zona_urbanistica?.destinazione_uso || wfsRis?.zona_urbanistica?.messaggio || null;
          const wmsDisponibile = !!(wfsRis?.zona_urbanistica?.disponibile);
          const ntaZona = resolvedNta?.nomeZona || cleanVal(r.quadro_urbanistico.zona_urbanistica);
          const ntaDest = resolvedNta ? (resolvedNta.nomeZona?.toLowerCase().includes('resid') ? 'Residenziale' : cleanVal(r.quadro_urbanistico.destinazione_uso)) : cleanVal(r.quadro_urbanistico.destinazione_uso);

          // Discordanza: WMS dice qualcosa di diverso dal NTA/AI
          const hasDiscordanza = wmsDisponibile && wmsZonaCodice && ntaZona &&
            !ntaZona.toLowerCase().includes(wmsZonaCodice.toLowerCase()) &&
            !wmsZonaCodice.toLowerCase().includes(ntaZona.toLowerCase());

          return (
            <ReportSection icon={FileText} title="Quadro Urbanistico (PRG/PUC)" delay={0.1}>
              {wmsDisponibile && wmsZonaCodice && (
                <div className="mb-3 flex items-center gap-2 px-3 py-1.5 text-xs rounded bg-emerald-50 border border-emerald-200 text-emerald-800">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  Zona da Mosaicatura PRG Piemonte (WMS ufficiale): <strong className="ml-1">{wmsZonaCodice}{wmsDescrizione ? ` — ${wmsDescrizione}` : ''}</strong>
                </div>
              )}
              {hasDiscordanza && (
                <div className="mb-3 flex items-start gap-2 p-3 rounded-lg border border-amber-300 bg-amber-50">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900">
                    <strong>⚠ Discordanza tra fonti:</strong> La Mosaicatura PRG regionale (WMS) indica codice <strong>{wmsZonaCodice}</strong>
                    {wmsDescrizione ? ` (${wmsDescrizione})` : ''}, mentre il database NTA indica "<strong>{ntaZona}</strong>".
                    {" "}Richiedere il CDU al Comune per chiarimento definitivo.
                  </p>
                </div>
              )}
              <DataRow label="Strumento Vigente" value={resolvedNta?.strumento || r.quadro_urbanistico.strumento_vigente} />
              <DataRow label="Zona Urbanistica" value={wmsDisponibile && wmsZonaCodice ? `${wmsZonaCodice}${wmsDescrizione ? ` — ${wmsDescrizione}` : ''}` : ntaZona} />
              <DataRow label="Destinazione d'Uso" value={wmsDisponibile && wmsDescrizione ? wmsDescrizione : ntaDest} />
              <DataRow label="Indice Edificabilità" value={resolvedNta?.IF || ntaLocal?.IF || cleanVal(r.quadro_urbanistico.indice_edificabilita)} />
              <DataRow label="Altezza Massima" value={resolvedNta?.Hmax || ntaLocal?.Hmax || cleanVal(r.quadro_urbanistico.altezza_massima)} />
              <DataRow label="Rapporto di Copertura" value={resolvedNta?.RC || cleanVal(r.quadro_urbanistico.rc_percentuale)} />
              <DataRow label="Distanze Minime" value={resolvedNta?.Dc ? `Dc: ${resolvedNta.Dc} · Df: ${resolvedNta.Df} · Ds: ${resolvedNta.Ds}` : cleanVal(r.quadro_urbanistico.distanze_minime)} />
              {r.quadro_urbanistico.note_urbanistiche && !resolvedNta && cleanVal(r.quadro_urbanistico.note_urbanistiche) && <div className="mt-3 p-3 bg-muted/50 rounded-lg"><p className="text-sm text-muted-foreground">{r.quadro_urbanistico.note_urbanistiche}</p></div>}
            </ReportSection>
          );
        })()}

        {/* Fattibilità interventi */}
        {r.fattibilita_interventi?.length > 0 && (
          <ReportSection icon={CheckCircle2} title="Fattibilità Interventi" delay={0.12}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border"><th className="text-left py-2 pr-4 text-muted-foreground font-medium">Tipo intervento</th><th className="text-left py-2 pr-4 text-muted-foreground font-medium">Fattibilità</th><th className="text-left py-2 text-muted-foreground font-medium">Note</th></tr></thead>
                <tbody>
                  {enrichFattibilita(r.fattibilita_interventi, resolvedNta, query.comune).map((fi, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="py-3 pr-4 font-medium">{fi.tipo_intervento}</td>
                      <td className="py-3 pr-4"><FattibilitaBadge value={fi.fattibilita} /></td>
                      <td className="py-3 text-muted-foreground text-xs">{fi.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ReportSection>
        )}

        {/* Pratiche Necessarie */}
        {r.pratiche_necessarie?.length > 0 && (
          <ReportSection icon={ClipboardList} title="Pratiche Necessarie" delay={0.14}>
            <div className="space-y-4">
              {r.pratiche_necessarie.map((p, i) => {
                const fb = getPraticaFallback(p.pratica_richiesta || p.tipo_intervento);
                const tempistica = cleanOrFallback(p.tempistica_stimata, fb.tempistica);
                const costi = cleanOrFallback(p.costi_stimati, fb.costi);
                const ente = cleanOrFallback(p.ente_competente, `Comune di ${query.comune} — Ufficio Tecnico`);
                const note = cleanOrFallback(p.note, null);
                return (
                  <div key={i} className="p-4 rounded-lg border border-border bg-muted/20">
                    <div className="flex items-start justify-between mb-2"><div><p className="font-medium text-sm">{p.tipo_intervento}</p><Badge variant="outline" className="mt-1 text-xs">{p.pratica_richiesta}</Badge></div></div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-sm">
                      <div><span className="text-muted-foreground">Ente: </span><span className="font-medium">{ente}</span></div>
                      <div><span className="text-muted-foreground">Tempi: </span><span className="font-medium">{tempistica}</span></div>
                      <div><span className="text-muted-foreground">Costi: </span><span className="font-medium">{costi}</span></div>
                    </div>
                    {note && <p className="text-xs text-muted-foreground mt-2">{note}</p>}
                  </div>
                );
              })}
            </div>
          </ReportSection>
        )}

        {/* Asta Giudiziaria */}
        {isAsta && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="rounded-xl border-2 border-amber-300 bg-amber-50 p-6">
            <div className="flex items-center gap-3 mb-4"><Gavel className="w-5 h-5 text-amber-700" /><h3 className="font-bold text-amber-800">Sezione Asta Giudiziaria</h3></div>
            <p className="text-sm text-amber-800 mb-4">Per gli immobili all'asta è essenziale verificare la conformità urbanistico-catastale prima dell'offerta.</p>
            {r.accesso_atti && <div className="space-y-2 text-sm text-amber-900"><p><strong>CDU:</strong> da richiedere presso {r.accesso_atti.ufficio_urbanistica || "l'ufficio tecnico comunale"}</p><p><strong>Documenti consigliati:</strong> {r.accesso_atti.documenti_ottenibili?.join(", ") || "visura catastale, planimetria, CDU, licenza edilizia originaria"}</p></div>}
          </motion.div>
        )}

        {/* Accesso agli Atti */}
        {r.accesso_atti && (
          <ReportSection icon={FolderOpen} title="Accesso agli Atti" delay={0.18}>
            <DataRow label="Ufficio Catasto" value={r.accesso_atti.ufficio_catasto} />
            <DataRow label="Ufficio Urbanistica" value={r.accesso_atti.ufficio_urbanistica} />
            <DataRow label="Ufficio Edilizia" value={r.accesso_atti.ufficio_edilizia} />
            <DataRow label="Modalità Accesso" value={r.accesso_atti.modalita_accesso} />
            {r.accesso_atti.documenti_ottenibili?.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-muted-foreground mb-2">Documenti Ottenibili:</p>
                <div className="flex flex-col gap-2">
                  {r.accesso_atti.documenti_ottenibili.map((d, i) => <div key={i} className="flex flex-col gap-0.5"><Badge variant="outline" className="text-xs w-fit">{d}</Badge>{/planimetri/i.test(d) && <p className="text-[10px] text-muted-foreground pl-1">documento riservato — solo proprietario con SPID</p>}{/visura/i.test(d) && <p className="text-[10px] text-muted-foreground pl-1">documento pubblico — richiedibile gratuitamente sul portale AdE</p>}</div>)}
                </div>
              </div>
            )}
          </ReportSection>
        )}

        {/* Analisi Finanziaria */}
        {showFinancial && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#1e3a5f' }}><span className="text-white text-xs font-bold">€</span></div>
              <h2 className="text-lg font-bold tracking-tight" style={{ color: '#1e3a5f' }}>Analisi Finanziaria & Due Diligence</h2>
            </div>
            <FinancialDueDiligence query={query} finData={finData} onSnapshotReady={setFinancialSnapshot} />
          </motion.div>
        )}

        {/* Mappa Catastale */}
        {(() => {
          const poly = query.geometry_geojson || r.catasto_data?.geojson_polygon || null;
          return (
            <ReportSection icon={MapPin} title="Mappa Particella Catastale" delay={0.05}>
              {r.catasto_data?.inspire_id && <div className="mb-2 text-xs text-muted-foreground">INSPIRE ID: {r.catasto_data.inspire_id}</div>}
              <ParcellaMap query={{ ...query, geometry_geojson: poly }} foglio={query.foglio} particella={query.particella} height={320} />
            </ReportSection>
          );
        })()}

        {/* Valutazione Sintetica */}
        {r.valutazione_sintetica && (() => {
          const isStima = (s) => /stima orientativa|verificare su (nta|prg|visura)|disponibile su visura/i.test(s || '');
          const criticita = (r.valutazione_sintetica.criticita_principali || []).filter(c => !isStima(c));
          const opportunita = (r.valutazione_sintetica.opportunita || []).filter(o => !isStima(o));
          const raccomandazioni = (r.valutazione_sintetica.raccomandazioni || []).filter(ra => !isStima(ra));
          if (!criticita.length && !opportunita.length && !raccomandazioni.length) return null;
          return (
            <ReportSection icon={Lightbulb} title="Valutazione Sintetica" delay={0.2}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {criticita.length > 0 && <div><p className="text-sm font-semibold mb-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-500" /> Criticità</p><ul className="space-y-1">{criticita.map((c, i) => <li key={i} className="text-sm text-muted-foreground">• {c}</li>)}</ul></div>}
                {opportunita.length > 0 && <div><p className="text-sm font-semibold mb-2 text-emerald-600">✦ Opportunità</p><ul className="space-y-1">{opportunita.map((o, i) => <li key={i} className="text-sm text-muted-foreground">• {o}</li>)}</ul></div>}
                {raccomandazioni.length > 0 && <div><p className="text-sm font-semibold mb-2 text-blue-600">→ Raccomandazioni</p><ul className="space-y-1">{raccomandazioni.map((ra, i) => <li key={i} className="text-sm text-muted-foreground">• {ra}</li>)}</ul></div>}
              </div>
            </ReportSection>
          );
        })()}
      </div>

      {/* WFS — Lombardia */}
      {isLombardia && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 p-5 rounded-xl" style={{ border: '2px solid #1A3A6B', background: '#fff' }}>
          <div className="flex items-center gap-2 mb-3" style={{ background: '#1A3A6B', margin: '-1.25rem -1.25rem 1rem', padding: '0.75rem 1.25rem' }}>
            <Shield className="w-4 h-4 text-white" /><p className="text-xs font-bold text-white uppercase tracking-widest">Verifica Vincoli — Regione Lombardia</p>
          </div>
          <p className="text-xs text-muted-foreground mb-3">L'analisi WFS automatica non è disponibile per la Lombardia. Verificare manualmente sui portali ufficiali:</p>
          <div className="space-y-2 text-xs">
            <a href="https://geoportale.regione.lombardia.it" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline"><ExternalLink className="w-3 h-3" /> Geoportale Regione Lombardia (PAI, vincoli paesaggistici)</a>
            <a href="https://idrogeo.isprambiente.it/app/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline"><ExternalLink className="w-3 h-3" /> IdroGEO ISPRA — PAI frane e alluvioni Lombardia</a>
            <a href="https://www.sit.regione.lombardia.it" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline"><ExternalLink className="w-3 h-3" /> SIT Regione Lombardia — Zonizzazione sismica</a>
          </div>
        </motion.div>
      )}

      {/* WFS Panel — Liguria/Piemonte (solo vista autenticata) */}
      {!isPublicView && (['Liguria','Piemonte'].includes(query.regione) || (query.regione || '').toLowerCase().includes('piemonte') || (query.regione || '').toLowerCase().includes('liguria')) && (
        <WfsLiguriaPanel query={query} onComplete={() => { queryClient.invalidateQueries({ queryKey: ["query", query.id] }); refetch(); }} />
      )}

      {/* Download PDF */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mt-8 p-6 rounded-xl border border-border bg-card">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Button variant="outline" className="gap-2 border-emerald-500 text-emerald-700 hover:bg-emerald-50" onClick={async () => {
            try {
              await handleDownloadPDF();
            } catch (_e) {
              window.print();
            }
          }} disabled={isDownloadingPDF}>
            {isDownloadingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 📄 Scarica / Stampa PDF
          </Button>
        </div>
        {!isPublicView && (
          <>
            <div className="mb-3 flex items-center gap-2 px-3 py-1.5 text-xs" style={{ background: '#f0fdf4', border: '1px solid #86efac', fontFamily: "'IBM Plex Mono', monospace", color: '#15803d' }}>
              <CheckCircle2 className="w-3.5 h-3.5" /> ✓ Incluso in beta — nessun costo aggiuntivo
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex flex-col gap-1">
                <Button className="gap-2" style={{ background: '#1e3a5f' }} onClick={async () => {
                  let cr = null;
                  if (query.comune_id) { const res = await base44.entities.ComuneItalia.filter({ id: query.comune_id }); cr = res[0] || null; }
                  setComunePrefill(cr); setShowAttiForm(true);
                }}>
                  <FileSearch className="w-4 h-4" /> Richiedi &quot;Accesso agli Atti&quot;
                </Button>
                <p className="text-[10px] text-muted-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace", maxWidth: 280 }}>
                  Fissa un appuntamento al Comune per ottenere copia di tutti i documenti d'archivio relativi al tuo immobile
                </p>
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* Form Accesso Atti */}
      {!isPublicView && showAttiForm && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 p-6 rounded-xl border-2 border-primary bg-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg" style={{ color: '#1e3a5f' }}>Richiedi "Accesso agli Atti"</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowAttiForm(false)}>✕</Button>
          </div>
          <AttiRequestForm
            prefill={{ query_id: query.id, comune: comunePrefill, foglio: query.foglio, particella: query.particella, subalterno: query.subalterno }}
            onSuccess={() => { setShowAttiForm(false); toast({ title: "Richiesta atti salvata ✓" }); }}
            onCancel={() => setShowAttiForm(false)}
          />
        </motion.div>
      )}

      {/* Disclaimer */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-6 p-4 rounded-lg border-2 border-amber-300 bg-amber-50 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-900 leading-relaxed">
          <strong>⚠️ Questo report ha valore esclusivamente informativo e non costituisce parere professionale o certificazione urbanistica.</strong>{" "}
          Verificare i dati presso gli uffici tecnici comunali prima di assumere qualsiasi decisione tecnica, legale o economica.{" "}
          UrbiCheck non sostituisce la consulenza di un professionista abilitato (geometra, architetto, ingegnere). —{" "}
          <a href="/termini-e-condizioni" className="underline hover:text-amber-700">Termini e Condizioni</a>
        </p>
      </motion.div>

      <div className="mt-6 text-center text-xs text-muted-foreground">urbicheck.it | Dati aggiornati da fonti GIS ufficiali regionali</div>
    </div>
  );
}