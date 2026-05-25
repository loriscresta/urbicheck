import { Link } from "react-router-dom";
import { ArrowLeft, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

export default function LegalTermini() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-8">
          <ArrowLeft className="w-4 h-4" /> Torna all'app
        </Link>

        <h1 className="text-2xl font-bold mb-1" style={{ color: '#1A3A6B' }}>📋 Termini e Condizioni — UrbiCheck</h1>
        <p className="text-xs text-gray-500 mb-8">Aggiornati: Maggio 2025 | Versione 1.0 | Fase Beta</p>

        {/* Avviso importante */}
        <div className="mb-8 p-4 rounded-lg border border-orange-300 bg-orange-50 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <p className="text-sm text-orange-900">
            <strong>Avviso importante:</strong> UrbiCheck è uno strumento di supporto informativo. I Report <strong>NON sostituiscono</strong> la consulenza tecnica professionale (geometra, ingegnere, architetto) né costituiscono pareri legali.
            Verificare sempre con CDU ufficiale e professionisti abilitati prima di operazioni immobiliari.
          </p>
        </div>

        <div className="space-y-8 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">1. Definizioni</h2>
            <ul className="space-y-1">
              {[
                ["Servizio", "La piattaforma web UrbiCheck e tutte le sue funzionalità"],
                ["Titolare", "Dell'Aria Claudia Giuseppina (impresa individuale) — Via Costa 44, 15026 Carentino (AL) — P.IVA 02655840060"],
                ["Utente", "Persona fisica o giuridica registrata che accede al Servizio"],
                ["Report", "L'analisi urbanistica e catastale generata per una singola particella"],
                ["Crediti", "Unità di pagamento prepagato per l'acquisto di Report (1 Report = €9,90)"],
              ].map(([termine, def]) => (
                <li key={termine} className="flex gap-2"><span className="font-semibold shrink-0">{termine}:</span><span>{def}</span></li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">2. Descrizione del Servizio</h2>
            <p>UrbiCheck fornisce analisi urbanistiche e catastali basate su dati pubblici: Agenzia delle Entrate (AdE), PRG/PGT comunali, PAI ARPA, Osservatorio del Mercato Immobiliare (OMI).</p>
            <p className="mt-2"><strong>Copertura attuale (Fase Beta):</strong> Piemonte, Liguria, Lombardia. Graduale espansione nazionale in corso.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">3. Registrazione</h2>
            <ul className="space-y-1 list-disc list-inside">
              <li>Richiede email valida e password sicura (min. 8 caratteri)</li>
              <li>Un solo account per persona fisica o giuridica</li>
              <li>Divieto di condivisione delle credenziali con terzi</li>
              <li>L'Utente è responsabile delle attività svolte con il proprio account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">4. Prezzi e Crediti</h2>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-200 px-3 py-2 text-left">Voce</th>
                    <th className="border border-gray-200 px-3 py-2 text-left">Importo</th>
                    <th className="border border-gray-200 px-3 py-2 text-left">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Costo per Report", "€9,90", "IVA inclusa"],
                    ["Credito benvenuto (Beta)", "€49,50", "= 5 Report gratuiti alla registrazione"],
                    ["Pacchetto Starter", "€25,00", "Ricarica manuale crediti"],
                    ["Pacchetto Pro", "€55,00", "Ricarica manuale crediti"],
                    ["Pacchetto Business", "€99,00", "Ricarica manuale crediti"],
                  ].map(([voce, importo, note], i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border border-gray-200 px-3 py-2 font-semibold">{voce}</td>
                      <td className="border border-gray-200 px-3 py-2 font-bold" style={{ color: '#1A3A6B' }}>{importo}</td>
                      <td className="border border-gray-200 px-3 py-2 text-gray-500">{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="space-y-1 list-disc list-inside text-xs text-gray-600">
              <li>Pagamenti elaborati da Stripe Inc. — nessun dato carta conservato da UrbiCheck</li>
              <li>Crediti non rimborsabili salvo cancellazione del servizio da parte del Titolare</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">5. Usi Consentiti e Vietati</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-emerald-800 text-xs uppercase tracking-wide">Usi Consentiti</span>
                </div>
                <ul className="space-y-1 text-xs text-emerald-900 list-disc list-inside">
                  <li>Analisi pre-acquisto immobiliare</li>
                  <li>Due diligence professionale</li>
                  <li>Supporto a agenti, geometri, avvocati</li>
                  <li>Ricerca e analisi di mercato</li>
                  <li>Uso interno aziendale</li>
                </ul>
              </div>
              <div className="p-4 rounded-lg border border-red-200 bg-red-50">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="font-bold text-red-800 text-xs uppercase tracking-wide">Usi Vietati</span>
                </div>
                <ul className="space-y-1 text-xs text-red-900 list-disc list-inside">
                  <li>Scraping automatico dei dati</li>
                  <li>Rivendita dei Report a terzi</li>
                  <li>Finalità fraudolente o illegali</li>
                  <li>Aggiramento del sistema crediti</li>
                  <li>Creazione di servizi concorrenti</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">6. Limitazioni di Responsabilità</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>I dati forniti sono indicativi e provengono da fonti pubbliche ufficiali; UrbiCheck non garantisce la loro completezza o aggiornamento in tempo reale</li>
              <li>Gli indici NTA (IF, RC, Hmax) possono provenire dal database UrbiCheck o da stime AI — verificare sempre con CDU ufficiale del Comune</li>
              <li>I valori OMI sono statistiche di mercato, non perizie immobiliari</li>
              <li>UrbiCheck non è responsabile di decisioni immobiliari basate sui Report</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">7. Proprietà Intellettuale</h2>
            <p>Il software, il database NTA e i contenuti originali di UrbiCheck sono di proprietà del Titolare. I dati catastali e urbanistici pubblici sono di proprietà delle rispettive Pubbliche Amministrazioni (AdE, Comuni, Regioni).</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">8. Cancellazione dell'Account</h2>
            <ul className="space-y-1 list-disc list-inside">
              <li>L'Utente può cancellare il proprio account dalla sezione Impostazioni</li>
              <li>I crediti residui non sono rimborsabili alla cancellazione volontaria</li>
              <li>Il Titolare può sospendere o cancellare account in caso di violazioni dei presenti Termini</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">9. Legge Applicabile e Foro Competente</h2>
            <p>I presenti Termini sono regolati dalla legge italiana. Per eventuali controversie è competente il Foro di Alessandria, salvo quanto previsto dal Codice del Consumo (D.Lgs. 206/2005) per i consumatori.</p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200 text-xs text-gray-400 text-center">
          <Link to="/privacy" className="hover:underline mr-4">Privacy Policy</Link>
          <Link to="/cookie" className="hover:underline">Cookie Policy</Link>
        </div>
      </div>
    </div>
  );
}