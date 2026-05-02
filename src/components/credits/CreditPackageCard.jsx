import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

export default function CreditPackageCard({ pkg, onPurchase, delay = 0 }) {
  const pricePerQuery = (pkg.price / pkg.queries).toFixed(2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`rounded-xl border-2 p-6 relative transition-all hover:shadow-lg ${
        pkg.popular
          ? "border-accent bg-accent/5 shadow-md"
          : "border-border bg-card hover:border-primary/30"
      }`}
    >
      {pkg.popular && (
        <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-[11px] px-3">
          Più Popolare
        </Badge>
      )}

      <div className="text-center mb-6">
        <h3 className="font-semibold text-lg">{pkg.name}</h3>
        <div className="mt-3">
          <span className="text-4xl font-bold tracking-tight">€{pkg.price.toFixed(2)}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          €{pricePerQuery} per query
        </p>
        {pkg.savings && (
          <Badge variant="outline" className="mt-2 bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
            Risparmi {pkg.savings}
          </Badge>
        )}
      </div>

      <ul className="space-y-2 mb-6">
        <li className="flex items-center gap-2 text-sm">
          <Check className="w-4 h-4 text-emerald-500" />
          {pkg.queries} {pkg.queries === 1 ? "report completo" : "report completi"}
        </li>
        <li className="flex items-center gap-2 text-sm">
          <Check className="w-4 h-4 text-emerald-500" />
          Analisi urbanistica dettagliata
        </li>
        <li className="flex items-center gap-2 text-sm">
          <Check className="w-4 h-4 text-emerald-500" />
          Vincoli e pratiche
        </li>
      </ul>

      <Button
        className={`w-full ${pkg.popular ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}`}
        variant={pkg.popular ? "default" : "outline"}
        onClick={() => onPurchase(pkg)}
      >
        Acquista
      </Button>
    </motion.div>
  );
}