import { Link } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default function TerminiCondizioni() {
  return (
    <div className="min-h-screen" style={{ background: '#F4EFE6' }}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-3 h-3" /> Torna alla home
        </Link>

        <div className="bg-white border border-border p-8 space-y-8">
          <div>
            <p className="text-[10px] uppercase tracking-[3px] text-muted-foreground mb-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              Documento legale
            </p>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Libre Baskerville', serif", color: '#1A3A6B' }}>
              Termini e Condizioni di Servizio
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Ultimo aggiornamento: maggio 2026</p>
          </div>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
              Il Servizio
            </h2>
            <p className="text-sm text-foreground leading-relaxed">
              UrbiCheck è un servizio di informazione urbanistica che fornisce estratti di dati edilizi, catastali
              e urbanistici a scopo puramente informativo. Il servizio è erogato da{" "}
              <strong>Dell'Aria Claudia Giuseppina</strong> (P.IVA 02655840060).
            </p>
          </section>

          <section>
            <div className="flex items-start gap-3 p-4 border border-amber-300 bg-amber-50 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-base font-bold mb-2" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
                  Natura Informativa — Limitazione di Responsabilità
                </h2>
                <p className="text-sm text-amber-900 leading-relaxed">
                  I report generati da UrbiCheck hanno <strong>esclusivamente valore informativo</strong> e non costituiscono
                  parere professionale, perizia tecnica, certificazione urbanistica o documento ufficiale. I dati sono
                  elaborati sulla base di fonti pubbliche aggiornate; l'utente è tenuto a verificare le informazioni
                  presso gli enti competenti (Comune, Agenzia delle Entrate, Regione) prima di assumere qualsiasi
                  decisione tecnica, legale o economica. Dell'Aria Claudia Giuseppina non assume responsabilità
                  per decisioni adottate sulla base delle informazioni fornite dal servizio.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
              Prezzo e Crediti
            </h2>
            <div className="text-sm text-foreground leading-relaxed space-y-2">
              <p>Il servizio è attualmente in fase beta.</p>
              <ul className="space-y-1 pl-4">
                <li>— Prezzo standard: <strong>€9,90 per report</strong></li>
                <li>— Prezzo promozionale beta: <strong>€2,99 per report</strong></li>
                <li>— Nuovi utenti: <strong>5 report gratuiti</strong> al momento della registrazione</li>
              </ul>
              <p>I crediti acquistati non sono rimborsabili salvo malfunzionamenti tecnici imputabili al servizio.</p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
              Proprietà Intellettuale
            </h2>
            <p className="text-sm text-foreground leading-relaxed">
              I report generati, la piattaforma, il brand UrbiCheck e tutti i contenuti sono di proprietà di
              Dell'Aria Claudia Giuseppina. È vietata la riproduzione, ridistribuzione o rivendita dei report
              senza autorizzazione scritta.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
              Legge Applicabile
            </h2>
            <p className="text-sm text-foreground leading-relaxed">
              I presenti Termini sono regolati dalla legge italiana. Per qualsiasi controversia è competente
              il <strong>Foro di Alessandria</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
              Contatti
            </h2>
            <p className="text-sm text-foreground leading-relaxed">
              <a href="mailto:info@urbicheck.it" className="text-primary hover:underline">info@urbicheck.it</a>
              {" | "}Tel: +39 377 0929026
            </p>
          </section>

          <div className="pt-4 border-t border-border text-xs text-muted-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            UrbiCheck © 2026 — Dell'Aria Claudia Giuseppina | P.IVA 02655840060
          </div>
        </div>
      </div>
    </div>
  );
}