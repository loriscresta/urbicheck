import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-8">
          <ArrowLeft className="w-4 h-4" /> Torna all'app
        </Link>

        <h1 className="text-2xl font-bold mb-1" style={{ color: '#1A3A6B' }}>🍪 Cookie Policy — UrbiCheck</h1>
        <p className="text-xs text-gray-500 mb-8">Aggiornata: Maggio 2025 | GDPR Reg. UE 2016/679</p>

        <div className="space-y-8 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">1. Cosa sono i cookie</h2>
            <p>I cookie sono piccoli file di testo salvati nel browser dell'utente quando visita un sito web.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">2. Cookie utilizzati da UrbiCheck</h2>
            <p className="mb-4">UrbiCheck utilizza <strong>ESCLUSIVAMENTE cookie tecnici</strong> necessari al funzionamento del servizio. Non utilizziamo cookie di profilazione, marketing o tracciamento.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-200 px-3 py-2 text-left">Nome</th>
                    <th className="border border-gray-200 px-3 py-2 text-left">Scopo</th>
                    <th className="border border-gray-200 px-3 py-2 text-left">Durata</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["session", "Mantenere la sessione utente autenticata", "Sessione"],
                    ["auth_token", "Token di autenticazione sicuro", "30 giorni"],
                    ["cookie_consent", "Ricordare che l'utente ha accettato l'informativa cookie", "1 anno"],
                  ].map(([nome, scopo, durata], i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border border-gray-200 px-3 py-2 font-semibold">{nome}</td>
                      <td className="border border-gray-200 px-3 py-2">{scopo}</td>
                      <td className="border border-gray-200 px-3 py-2 text-gray-500">{durata}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">3. Cookie di terze parti</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>
                <strong>Stripe (stripe.com):</strong> cookie tecnici per elaborazione pagamenti sicuri.{" "}
                <a href="https://stripe.com/it/privacy" target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800">
                  Privacy policy Stripe
                </a>
              </li>
              <li><strong>Base44 (base44.com):</strong> infrastruttura applicativa</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">4. Come disabilitare i cookie</h2>
            <p>Puoi disabilitare i cookie dal menu impostazioni del tuo browser. La disabilitazione dei cookie tecnici potrebbe compromettere il funzionamento del servizio.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">5. Titolare del trattamento</h2>
            <ul className="space-y-1 text-sm">
              <li><strong>Dell'Aria Claudia Giuseppina</strong> (impresa individuale)</li>
              <li>Via Costa 44, 15026 Carentino (AL)</li>
              <li>P.IVA: 02655840060 | C.F.: DLLCDG89C58G580S | REA: AL-301497</li>
              <li>Email: <a href="mailto:info@urbicheck.it" className="underline">info@urbicheck.it</a></li>
              <li>PEC: <a href="mailto:claudiadellaria@pec.it" className="underline">claudiadellaria@pec.it</a></li>
            </ul>
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