import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function LegalCookie() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-8">
          <ArrowLeft className="w-4 h-4" /> Torna all'app
        </Link>

        <h1 className="text-2xl font-bold mb-1" style={{ color: '#1A3A6B' }}>🍪 Cookie Policy — UrbiCheck</h1>
        <p className="text-xs text-gray-500 mb-8">Aggiornata: Maggio 2025 | Versione 1.0</p>

        <div className="space-y-8 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">1. Cosa sono i cookie</h2>
            <p>I cookie sono piccoli file di testo memorizzati dal browser sul dispositivo dell'utente durante la navigazione. Possono essere necessari per il funzionamento del servizio (tecnici) o usati per finalità di profilazione o analisi (che richiedono consenso).</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">2. Cookie utilizzati da UrbiCheck</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-200 px-3 py-2 text-left">Nome</th>
                    <th className="border border-gray-200 px-3 py-2 text-left">Durata</th>
                    <th className="border border-gray-200 px-3 py-2 text-left">Finalità</th>
                    <th className="border border-gray-200 px-3 py-2 text-left">Consenso</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["auth_token", "30 giorni (se 'ricordami')", "Autenticazione utente", "Non richiesto"],
                    ["user_preferences", "1 anno", "Preferenze interfaccia", "Non richiesto"],
                    ["csrf_token", "Sessione", "Sicurezza anti-CSRF", "Non richiesto"],
                    ["urbicheck_cookie_consent", "1 anno", "Memorizza consenso cookie", "Non richiesto"],
                    ["stripe_sid", "30 minuti", "Sessione pagamenti sicuri", "Funzionale"],
                  ].map(([nome, durata, finalita, consenso], i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border border-gray-200 px-3 py-2 font-mono font-semibold">{nome}</td>
                      <td className="border border-gray-200 px-3 py-2">{durata}</td>
                      <td className="border border-gray-200 px-3 py-2">{finalita}</td>
                      <td className="border border-gray-200 px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${consenso === 'Non richiesto' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                          {consenso}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">3. Cookie NON utilizzati</h2>
            <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50">
              <p className="text-xs text-emerald-900 font-semibold mb-2">✅ UrbiCheck NON utilizza:</p>
              <ul className="space-y-1 text-xs text-emerald-800 list-disc list-inside">
                <li>Cookie pubblicitari o di remarketing</li>
                <li>Google Analytics o strumenti di analytics di terze parti</li>
                <li>Meta Pixel o cookie Facebook/Instagram</li>
                <li>Cookie di social network (like, share, login social)</li>
                <li>Tracciamento cross-site dell'utente</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">4. Cookie tecnici e obbligo di consenso</h2>
            <p>I cookie tecnici sopra elencati (autenticazione, sicurezza, preferenze) sono strettamente necessari al funzionamento del servizio e, ai sensi dell'<strong>art. 122, comma 1, D.Lgs. 196/2003</strong> (Codice Privacy) e del <strong>Provvedimento Garante Privacy 8 maggio 2014</strong>, non richiedono il preventivo consenso dell'utente.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">5. Gestione dei cookie nel browser</h2>
            <p className="mb-3">Puoi gestire o eliminare i cookie direttamente dal tuo browser:</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Chrome", "https://support.google.com/chrome/answer/95647"],
                ["Firefox", "https://support.mozilla.org/it/kb/protezione-antitracciamento-avanzata-firefox"],
                ["Safari", "https://support.apple.com/it-it/guide/safari/sfri11471/mac"],
                ["Edge", "https://support.microsoft.com/it-it/microsoft-edge/eliminare-i-cookie-in-microsoft-edge"],
              ].map(([browser, url]) => (
                <a key={browser} href={url} target="_blank" rel="noopener noreferrer"
                  className="block p-3 rounded border border-gray-200 text-xs hover:border-blue-300 hover:bg-blue-50 transition-colors">
                  <span className="font-semibold text-blue-600">🌐 {browser}</span>
                  <span className="block text-gray-400 mt-0.5">Guida ufficiale →</span>
                </a>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-500">Attenzione: disabilitare i cookie tecnici potrebbe compromettere il funzionamento del servizio (es. impossibilità di accedere all'account).</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">6. Modifiche alla Cookie Policy</h2>
            <p>In caso di introduzione di nuovi cookie analitici o di marketing, sarà mostrato un apposito banner per la raccolta del consenso prima dell'installazione. Eventuali modifiche saranno comunicate con almeno 15 giorni di preavviso via email.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">7. Contatti</h2>
            <p>Per domande sui cookie: <a href="mailto:privacy@urbicheck.it" className="text-blue-600 hover:underline">privacy@urbicheck.it</a></p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200 text-xs text-gray-400 text-center">
          <Link to="/privacy" className="hover:underline mr-4">Privacy Policy</Link>
          <Link to="/termini" className="hover:underline">Termini e Condizioni</Link>
        </div>
      </div>
    </div>
  );
}