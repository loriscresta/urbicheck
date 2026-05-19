/**
 * IndiciEdiliziSection — mostra indici edilizi con gestione smart dei dati mancanti.
 * Se i valori contengono "Stima orientativa" o "Verificare su NTA/PRG", mostra
 * banner CDU + link reali invece dei valori approssimativi.
 */
import React from "react";
import { BarChart3, ExternalLink, AlertTriangle, Info } from "lucide-react";
import ReportSection from "@/components/report/ReportSection";

const CDU_LINKS = {
  "alessandria": {
    cdu: "https://www.comune.alessandria.it/index.php?id=551",
    geoportale: "https://www.geoportale.piemonte.it/geonetwork/srv/ita/catalog.search#/search?any=PRGC+Alessandria",
    piano: "PRGC — Piano Regolatore Generale Comunale di Alessandria",
    sportello: "Piazza della Libertà 1, 15121 Alessandria — Tel. 0131 515111",
    telefono: "0131 515111",
  },
  "torino": {
    cdu: "https://www.comune.torino.it/urb/",
    geoportale: "https://www.geoportale.piemonte.it/geonetwork/srv/ita/catalog.search#/search?any=PRG+Torino",
    piano: "PRG — Piano Regolatore Generale",
    sportello: "Ufficio Urbanistica, Torino",
  },
  "savona": {
    cdu: "https://www.comune.savona.it/it/page/urbanistica",
    geoportale: "https://geoportal.regione.liguria.it/",
    piano: "PUC — Piano Urbanistico Comunale",
    sportello: "UTC di Savona",
  },
};

function getCduLinks(comuneNome) {
  return CDU_LINKS[(comuneNome || "").toLowerCase().trim()] || null;
}

const PLACEHOLDER_PATTERNS = [
  /stima orientativa/i,
  /verificare su nta/i,
  /verificare su prg/i,
  /verificare presso/i,
  /contattare utc/i,
];

function isPlaceholder(val) {
  if (!val || typeof val !== "string") return false;
  return PLACEHOLDER_PATTERNS.some((p) => p.test(val));
}

function CduBanner({ comune, cduInfo }) {
  return (
    <div className="mb-4 rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-900">
            📋 Indici edilizi non recuperati automaticamente da WFS
          </p>
          <p className="text-xs text-amber-800 mt-1 leading-relaxed">
            Gli indici urbanistici (IF, RC, H max, distanze) del {cduInfo?.piano || "piano urbanistico"} di{" "}
            <strong>{comune}</strong> non sono disponibili nel database WFS regionale aperto.
            Per ottenere i valori ufficiali richiedere il <strong>Certificato di Destinazione Urbanistica (CDU)</strong>:
          </p>
        </div>
      </div>
      <div className="ml-6 mt-2 space-y-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-amber-700">•</span>
          <span className="text-amber-800 font-medium">Sportello online:</span>
          <a href={cduInfo.cdu} target="_blank" rel="noopener noreferrer"
            className="text-primary underline flex items-center gap-1 hover:opacity-80">
            comune.{comune?.toLowerCase()}.it — Richiesta CDU
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-amber-700">•</span>
          <span className="text-amber-800 font-medium">Geoportale:</span>
          <a href={cduInfo.geoportale} target="_blank" rel="noopener noreferrer"
            className="text-primary underline flex items-center gap-1 hover:opacity-80">
            Cerca {cduInfo?.piano?.split("—")[0]?.trim() || "piano urbanistico"}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        {cduInfo.sportello && (
          <div className="flex items-start gap-2">
            <span className="text-amber-700">•</span>
            <span className="text-amber-800 font-medium">Sportello fisico:</span>
            <span className="text-amber-800">{cduInfo.sportello}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function IndiceCard({ label, value, cduInfo, comune }) {
  if (isPlaceholder(value)) {
    // Dato non disponibile nel DB regionale — mostra in grigio neutro, non come warning
    return (
      <div className="bg-muted/20 border border-border rounded-lg p-3">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-xs text-muted-foreground italic">n.d. — verifica su NTA/PRG Comunale</p>
        {cduInfo && (
          <div className="mt-1.5 space-y-0.5">
            <a href={cduInfo.cdu} target="_blank" rel="noopener noreferrer"
              className="text-[10px] text-primary flex items-center gap-1 hover:underline">
              <ExternalLink className="w-2.5 h-2.5" /> CDU Comune di {comune}
            </a>
          </div>
        )}
      </div>
    );
  }
  if (!value) return null;
  return (
    <div className="bg-muted/40 rounded-lg p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-semibold text-sm">{value}</p>
    </div>
  );
}

export default function IndiciEdiliziSection({ indici, comune, delay = 0.08 }) {
  if (!indici) return null;

  const cduInfo = getCduLinks(comune);
  const fields = [
    { label: "Indice di Fabbricabilità (IF)", value: indici.if_mc_mq },
    { label: "Rapporto di Copertura (RC)", value: indici.rc_percentuale },
    { label: "Altezza Massima (H max)", value: indici.h_max },
    { label: "Distanza dai confini", value: indici.distanza_confini },
    { label: "Distanza tra fabbricati", value: indici.distanza_fabbricati },
    { label: "Distanza dalla strada", value: indici.distanza_strada },
  ].filter((f) => f.value);

  const anyPlaceholder = fields.some((f) => isPlaceholder(f.value));

  return (
    <ReportSection icon={BarChart3} title="Indici Edilizi" delay={delay}>
      {anyPlaceholder && (
        <div className="mb-4 rounded-lg border border-border bg-muted/20 p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Gli indici urbanistici non sono disponibili nel database WFS regionale aperto.
            I valori n.d. non indicano un rischio — richiedere il CDU al Comune per i valori ufficiali.
            {cduInfo && (
              <> <a href={cduInfo.cdu} target="_blank" rel="noopener noreferrer" className="text-primary underline ml-1">Richiedi CDU →</a></>
            )}
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {fields.map((f) => (
          <IndiceCard key={f.label} label={f.label} value={f.value} cduInfo={cduInfo} comune={comune} />
        ))}
      </div>
    </ReportSection>
  );
}