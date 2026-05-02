import React from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Search, Shield, FileText, MapPin,
  ChevronRight, CheckCircle, ArrowRight, Users, Zap
} from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Building2,
    title: "Dati Catastali",
    desc: "Categoria, classe, consistenza, rendita catastale e intestatari verificati.",
  },
  {
    icon: MapPin,
    title: "Quadro Urbanistico",
    desc: "PRG/PUC/PGT, zona urbanistica, destinazione d'uso, indici edificabilità.",
  },
  {
    icon: Shield,
    title: "Vincoli Territoriali",
    desc: "Sismico, idraulico, paesaggistico, archeologico e tutti i vincoli attivi.",
  },
  {
    icon: FileText,
    title: "Pratiche Necessarie",
    desc: "SCIA, CILA, Permesso di costruire: cosa serve, tempi e costi stimati.",
  },
];

const targets = [
  { label: "Agenti Immobiliari", desc: "Valuta rapidamente la situazione urbanistica degli immobili in portafoglio" },
  { label: "Investitori", desc: "Analisi preliminare prima di ogni investimento immobiliare" },
  { label: "Geometri & Tecnici", desc: "Report operativo per velocizzare le pratiche edilizie" },
  { label: "Privati", desc: "Verifica urbanistica prima di acquistare casa" },
];

export default function LandingPage() {
  const handleLogin = () => {
    base44.auth.redirectToLogin("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">Urbicheck</span>
          </div>
          <Button onClick={handleLogin} className="gap-2">
            Accedi <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Badge variant="outline" className="mb-6 px-4 py-1.5 text-xs font-medium">
              <Zap className="w-3 h-3 mr-1" /> Analisi urbanistica in tempo reale
            </Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold tracking-tight leading-[1.1]">
              La due diligence
              <br />
              <span className="text-accent">urbanistica</span> in un click
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mt-6 max-w-2xl mx-auto leading-relaxed">
              Inserisci i dati catastali e ricevi una scheda operativa completa con vincoli, 
              pratiche necessarie e accesso agli atti. Tutto a €9,90.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
              <Button size="lg" onClick={handleLogin} className="gap-2 px-8 h-13 text-base">
                Inizia Ora <ArrowRight className="w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" className="gap-2 px-8 h-13 text-base" onClick={handleLogin}>
                <Search className="w-4 h-4" /> Prova una Ricerca
              </Button>
            </div>
          </motion.div>

          {/* Trust */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-6 mt-12 text-sm text-muted-foreground"
          >
            <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500" /> Dati verificati</span>
            <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500" /> Report istantaneo</span>
            <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500" /> Pay-per-query</span>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-serif font-bold tracking-tight">Cosa include ogni report</h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
              Una scheda operativa completa per ogni immobile, generata in tempo reale
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-bold tracking-tight mb-4">
            Semplice e trasparente
          </h2>
          <p className="text-muted-foreground mb-10 max-w-lg mx-auto">
            Nessun abbonamento. Paghi solo quando cerchi. Pacchetti disponibili con sconti fino al 40%.
          </p>
          <div className="bg-card rounded-2xl border-2 border-accent shadow-lg p-8 md:p-10 inline-block">
            <p className="text-sm text-muted-foreground uppercase tracking-widest mb-2">A partire da</p>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-6xl font-bold tracking-tight">€9,90</span>
              <span className="text-muted-foreground text-lg">/query</span>
            </div>
            <ul className="mt-6 space-y-2 text-sm text-left max-w-xs mx-auto">
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> Report urbanistico completo</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> Vincoli e criticità</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> Pratiche e tempistiche</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> Accesso atti e uffici</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> Storico ricerche illimitato</li>
            </ul>
            <Button size="lg" className="mt-8 w-full gap-2" onClick={handleLogin}>
              Inizia Ora <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Target */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-bold tracking-tight">Per chi è Urbicheck</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {targets.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
                className="flex items-start gap-4 bg-card rounded-xl border border-border p-6"
              >
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">{t.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
              <Building2 className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">Urbicheck</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026 Urbicheck. Tutti i diritti riservati. Le informazioni fornite hanno valore indicativo.
          </p>
        </div>
      </footer>
    </div>
  );
}