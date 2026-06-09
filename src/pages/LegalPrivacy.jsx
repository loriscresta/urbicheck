import { Link } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default function LegalPrivacy() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-8">
          <ArrowLeft className="w-4 h-4" /> Torna all'app
        </Link>

        <h1 className="text-2xl font-bold mb-1" style={{ color: '#1A3A6B' }}>🔒 Privacy Policy — UrbiCheck</h1>
        <p className="text-xs text-gray-500 mb-8">Aggiornata: Maggio 2025 | Versione 1.0 | GDPR Reg. UE 2016/679</p>

        {/* Nota importante */}
        <div className="mb-8 p-4 rounded-lg border border-amber-300 bg-amber-50 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900">
            <strong>Nota importante:</strong> UrbiCheck consulta dati catastali <strong>PUBBLICI</strong> dell'Agenzia delle Entrate.
            Non richiede né tratta credenziali SPID, dati bancari personali o documenti di identità degli utenti.
          </p>
        </div>

        <div className="space-y-8 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">1. Titolare del Trattamento</h2>
            <p className="leading-relaxed">
              <strong>Dell'Aria Claudia Giuseppina</strong> (impresa individuale)<br />
              Via Costa 44, 15026 Carentino (AL)<br />
              P.IVA: 02655840060 | C.F.: DLLCDG89C58G580S | REA: AL-301497<br />
              Email: <a href="mailto:info@urbicheck.it" className="text-blue-600 hover:underline">info@urbicheck.it</a><br />
              PEC (comunicazioni formali): <a href="mailto:claudiadellaria@pec.it" className="text-blue-600 hover:underline">claudiadellaria@pec.it</a>
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">2. Tipologie di Dati Trattati</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-200 px-3 py-2 text-left">Tipologia</th>
                    <th className="border border-gray-200 px-3 py-2 text-left">Dettaglio</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Dati registrazione", "Nome, email, password (hashed bcrypt — mai in chiaro)"],
                    ["Dati utilizzo", "Query catastali (comune, foglio, particella, finalità analisi)"],
                    ["Dati catastali pubblici AdE", "Dati estratti da banche dati pubbliche dell'Agenzia delle Entrate"],
                    ["Dati pagamento", "Token Stripe (nessun dato carta conservato da UrbiCheck)"],
                    ["Dati tecnici", "Indirizzo IP, log di accesso, user-agent del browser"],
                  ].map(([tipo, dettaglio], i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border border-gray-200 px-3 py-2 font-semibold">{tipo}</td>
                      <td className="border border-gray-200 px-3 py-2">{dettaglio}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">3. Finalità e Basi Giuridiche</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-200 px-3 py-2 text-left">Finalità</th>
                    <th className="border border-gray-200 px-3 py-2 text-left">Base giuridica</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Erogazione del servizio", "Esecuzione contratto (art. 6.1.b GDPR)"],
                    ["Pagamenti", "Esecuzione contratto (art. 6.1.b GDPR)"],
                    ["Comunicazioni marketing", "Consenso (art. 6.1.a GDPR) — opzionale"],
                    ["Sicurezza e antifrode", "Legittimo interesse (art. 6.1.f GDPR)"],
                    ["Obblighi fiscali e legali", "Obbligo legale (art. 6.1.c GDPR)"],
                  ].map(([finalita, base], i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border border-gray-200 px-3 py-2 font-semibold">{finalita}</td>
                      <td className="border border-gray-200 px-3 py-2">{base}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">4. Conservazione dei Dati</h2>
            <ul className="space-y-1 list-disc list-inside">
              <li>Dati account: conservati fino a 2 anni dopo la cancellazione dell'account</li>
              <li>Query catastali: 24 mesi dalla data di creazione</li>
              <li>Dati pagamento: 10 anni per obblighi fiscali (D.P.R. 633/1972)</li>
              <li>Log tecnici: 6 mesi</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">5. Responsabili del Trattamento</h2>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong>Base44 Inc.</strong> — Hosting e infrastruttura cloud (USA, SCC Dec. 2021/914/UE)</li>
              <li><strong>Stripe Inc.</strong> — Elaborazione pagamenti (USA, Standard Contractual Clauses)</li>
              <li>Servizi email transazionali per notifiche di sistema</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">6. Trasferimenti Extra-UE</h2>
            <p>I dati trattati da Stripe Inc. e Base44 Inc. possono essere trasferiti negli USA con le garanzie delle <strong>Standard Contractual Clauses</strong> approvate con Decisione della Commissione Europea 2021/914/UE.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">7. Diritti dell'Interessato (artt. 15-22 GDPR)</h2>
            <p className="mb-3">L'interessato ha diritto di esercitare in qualsiasi momento:</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {["Accesso (art.15)", "Rettifica (art.16)", "Cancellazione (art.17)", "Limitazione (art.18)", "Portabilità (art.20)", "Opposizione (art.21)", "Revoca consenso (art.7)", "Reclamo al Garante"].map((d) => (
                <div key={d} className="bg-blue-50 border border-blue-200 rounded px-3 py-2 text-xs">{d}</div>
              ))}
            </div>
            <p>Per esercitare i diritti:<br />
              <a href="mailto:info@urbicheck.it" className="text-blue-600 hover:underline">info@urbicheck.it</a> (richieste generali)<br />
              <a href="mailto:claudiadellaria@pec.it" className="text-blue-600 hover:underline">claudiadellaria@pec.it</a> (comunicazioni formali/PEC)
            </p>
            <p className="mt-1">Reclami al Garante Privacy: <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.garanteprivacy.it</a></p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">8. Sicurezza</h2>
            <p>UrbiCheck adotta misure tecniche adeguate: HTTPS/TLS 1.3, password hashate con bcrypt, tokenizzazione Stripe per i pagamenti, accesso ai dati limitato al personale autorizzato.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">9. Minori</h2>
            <p>Il servizio è riservato agli utenti maggiorenni (18+). Non raccogliamo consapevolmente dati di minori.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">10. Aggiornamenti</h2>
            <p>Eventuali modifiche sostanziali saranno comunicate via email con almeno 15 giorni di preavviso. La data di aggiornamento è indicata in testa al documento.</p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200 text-xs text-gray-400 text-center">
          <Link to="/termini" className="hover:underline mr-4">Termini e Condizioni</Link>
          <Link to="/cookie" className="hover:underline">Cookie Policy</Link>
        </div>
      </div>
    </div>
  );
}