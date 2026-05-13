import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, X } from "lucide-react";

/**
 * ComuneAutocomplete
 * Props:
 *   onSelect(comune: ComuneItalia | null) — called when user picks a comune or clears
 *   selectedComune — controlled value (full ComuneItalia record or null)
 *   required — boolean
 */
export default function ComuneAutocomplete({ onSelect, selectedComune, required }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  // If a comune is already selected, show its name in the input
  const displayValue = selectedComune ? selectedComune.nome : query;

  const search = async (text) => {
    if (!text || text.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setIsLoading(true);
    const data = await base44.entities.ComuneItalia.filter(
      { nome: { $regex: text, $options: "i" } },
      "nome",
      20
    );
    setResults(data);
    setShowDropdown(true);
    setIsLoading(false);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    // If user types after selecting, clear selection
    if (selectedComune) {
      onSelect(null);
    }
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (comune) => {
    onSelect(comune);
    setQuery("");
    setShowDropdown(false);
    setResults([]);
  };

  const handleClear = () => {
    onSelect(null);
    setQuery("");
    setShowDropdown(false);
    setResults([]);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="space-y-2" ref={containerRef}>
      <Label>Comune {required && "*"}</Label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-9 pr-8"
          placeholder="Cerca comune... (es. Roma, Milano)"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          {selectedComune && !isLoading && (
            <button type="button" onClick={handleClear} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {showDropdown && results.length > 0 && (
          <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {results.map((c) => (
              <button
                key={c.id}
                type="button"
                className="w-full text-left px-4 py-2.5 hover:bg-muted/60 transition-colors flex items-center justify-between gap-2 text-sm"
                onClick={() => handleSelect(c)}
              >
                <span className="font-medium">{c.nome}</span>
                <span className="text-muted-foreground text-xs shrink-0">
                  {c.sigla_provincia} · {c.regione}
                </span>
              </button>
            ))}
          </div>
        )}
        {showDropdown && !isLoading && results.length === 0 && query.length >= 2 && (
          <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-popover border border-border rounded-lg shadow-lg px-4 py-3 text-sm text-muted-foreground">
            Nessun comune trovato per "{query}"
          </div>
        )}
      </div>

      {/* Auto-populated read-only fields */}
      {selectedComune && (
        <div className="flex flex-wrap gap-3 mt-2">
          <span className="text-xs bg-muted rounded px-2 py-1 text-muted-foreground">
            <strong>Provincia:</strong> {selectedComune.provincia} ({selectedComune.sigla_provincia})
          </span>
          <span className="text-xs bg-muted rounded px-2 py-1 text-muted-foreground">
            <strong>Regione:</strong> {selectedComune.regione}
          </span>
          {selectedComune.piano_tipo && (
            <span className="text-xs bg-muted rounded px-2 py-1 text-muted-foreground">
              <strong>Piano:</strong> {selectedComune.piano_tipo}
            </span>
          )}
        </div>
      )}
    </div>
  );
}