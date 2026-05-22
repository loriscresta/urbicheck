import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
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
              Informativa sul Trattamento dei Dati Personali
            </h1>
            <p className="text-sm text-muted-foreground mt-1">ai sensi del Regolamento UE 2016/679 (GDPR)</p>
          </div>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
              Titolare del Trattamento
            </h2>
            <div className="text-sm text-foreground space-y-1 leading-relaxed">
              <p><strong>Dell'Aria Claudia Giuseppina</strong></p>
              <p>Via Costa 44, 15026 Carentino (AL)</p>
              <p>P.IVA: 02655840060 | C.F.: DLLCDG89C58G580S | REA: AL-301497</p>
              <p>Email: <a href="mailto:info@urbicheck.it" className="text-primary hover:underline">info@urbicheck.it</a> | Tel: +39 377 0929026</p>
              <p>PEC: <a href="mailto:claudiadellaria@pec.it" className="text-primary hover:underline">claudiadellaria@pec.it</a></p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
              Dati Trattati e Finalità
            </h2>
            <ul className="text-sm text-foreground space-y-3 leading-relaxed">
              <li className="flex gap-2"><span className="text-accent shrink-0">—</span><span><strong>Email, nome:</strong> per la creazione e gestione dell'account (base giuridica: esecuzione del contratto, art. 6.1.b GDPR)</span></li>
              <li className="flex gap-2"><span className="text-accent shrink-0">—</span><span><strong>Dati catastali inseriti</strong> (foglio, particella, comune): per erogare il servizio di analisi urbanistica richiesto</span></li>
              <li className="flex gap-2"><span className="text-accent shrink-0">—</span><span><strong>Storico delle query e crediti utilizzati:</strong> per la gestione del rapporto commerciale e obblighi contabili</span></li>
              <li className="flex gap-2"><span className="text-accent shrink-0">—</span><span><strong>Dati di pagamento:</strong> gestiti esclusivamente da Stripe Inc. (responsabile esterno del trattamento)</span></li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
              Conservazione
            </h2>
            <p className="text-sm text-foreground leading-relaxed">
              I dati saranno conservati per la durata del rapporto contrattuale e, successivamente, per il periodo previsto
              dagli obblighi fiscali e legali (max 10 anni). I dati dell'account possono essere cancellati su richiesta
              scrivendo a <a href="mailto:info@urbicheck.it" className="text-primary hover:underline">info@urbicheck.it</a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
              Diritti dell'Interessato
            </h2>
            <p className="text-sm text-foreground leading-relaxed">
              L'utente può in qualsiasi momento esercitare i diritti di: accesso (art. 15), rettifica (art. 16),
              cancellazione (art. 17), limitazione (art. 18), portabilità (art. 20), opposizione (art. 21)
              scrivendo a <a href="mailto:info@urbicheck.it" className="text-primary hover:underline">info@urbicheck.it</a>.
              Ha inoltre diritto di proporre reclamo al Garante per la protezione dei dati personali
              (<a href="https://www.garanteprivacy.it" target="_blank" rel="noreferrer" className="text-primary hover:underline">www.garanteprivacy.it</a>).
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
              Trasferimento Dati
            </h2>
            <p className="text-sm text-foreground leading-relaxed">
              I dati non vengono trasferiti a paesi terzi. Stripe Inc. opera secondo il framework EU-US Data Privacy Framework.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
              Cookie
            </h2>
            <p className="text-sm text-foreground leading-relaxed">
              Utilizziamo esclusivamente cookie tecnici necessari al funzionamento del servizio.
              Non utilizziamo cookie di profilazione o di terze parti a scopo pubblicitario.
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