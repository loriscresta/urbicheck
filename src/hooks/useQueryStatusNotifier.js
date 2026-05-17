/**
 * Sottoscrive in real-time le CadastralQuery dell'utente corrente
 * e mostra un toast quando una passa a "completed".
 */
import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export function useQueryStatusNotifier(userEmail) {
  const prevStatuses = useRef({});

  useEffect(() => {
    if (!userEmail) return;

    const unsubscribe = base44.entities.CadastralQuery.subscribe((event) => {
      if (event.type !== "update") return;
      const q = event.data;
      if (!q) return;
      // Only care about queries belonging to this user
      if (q.created_by !== userEmail) return;

      const prev = prevStatuses.current[event.id];
      const curr = q.status;

      if (prev && prev !== "completed" && curr === "completed") {
        toast.success(
          `✅ Report completato — ${q.comune || ""} F.${q.foglio} P.${q.particella}`,
          {
            description: "Il tuo report è pronto. Clicca per visualizzarlo.",
            action: {
              label: "Apri report",
              onClick: () => { window.location.href = `/report/${event.id}`; },
            },
            duration: 8000,
          }
        );
      }
      prevStatuses.current[event.id] = curr;
    });

    return () => unsubscribe();
  }, [userEmail]);
}