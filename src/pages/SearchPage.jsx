import { ENRICHMENT_API_URL } from '@/lib/config';
import React, { useState, useEffect } from "react";

import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { appParams } from "@/lib/app-params";
import { catasto_resolver } from "@/functions/catasto_resolver";
import CadastralSearchForm from "@/components/search/CadastralSearchForm.jsx";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Shield, Info, Search, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { trackEvent } from "@/lib/metaPixel";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { calculatePlanimetriaArea } from '@/functions/calculatePlanimetriaArea';
import { fetchParcelFromAgent } from '@/functions/fetchParcelFromAgent';
import PublicSearchPreview from "@/components/search/PublicSearchPreview";
import CreditTierBanner from "@/components/credits/CreditTierBanner";
import { logSearch } from "@/functions/logSearch";
import { chargeReport } from "@/functions/chargeReport";
import { createAnonymousReport } from "@/functions/createAnonymousReport";
import GeoWaitlistCapture from "@/components/search/GeoWaitlistCapture";

const BETA_REGIONS = ['piemonte', 'liguria', 'lombardia'];

export default function SearchPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null);
  const [geoBlockError, setGeoBlockError] = useState(null);
  const [unlockingFree, setUnlockingFree] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [publicPreview, setPublicPreview] = useState(null); // anteprima per utenti non loggati
  const [pendingFormData, setPendingFormData] = useState(null);
  const [pendingBatchData, setPendingBatchData] = useState(null); // salvato prima del redirect a /credits
  const [exampleData, setExampleData] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialAddress = searchParams.get("address");

  // Recupera batch salvato prima del redirect a /credits (dopo ricarica)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('urbicheck_pending_batch');
      if (saved) {
        const parsed = JSON.parse(saved);
        sessionStorage.removeItem('urbicheck_pending_batch');
        setPendingBatchData(parsed);
      }
    } catch (_) {}
  }, []);

  // Recupera la ricerca salvata prima del login (utente appena autenticato)
  useEffect(() => {
    const shouldRestore = searchParams.get("restore") === "1";
    if (!shouldRestore) return;
    try {
      const saved = sessionStorage.getItem("urbicheck_pending_search");
      if (saved) {
        const parsedForm = JSON.parse(saved);
        sessionStorage.removeItem("urbicheck_pending_search");
        // Esegui la ricerca completa automaticamente
        handleSearch(parsedForm);
      }
    } catch (_) {}
  }, []);

  // Anonimo (nessun token) = nessuna chiamata auth.me() (eviterebbe 401 nel webview FB).
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    enabled: !!appParams.token,
    retry: false,
  });

  const isAuthenticated = !!currentUser;

  const { data: credits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      const user = await base44.auth.me();
      const list = await base44.entities.UserCredits.filter({ user_email: user.email });
      return list[0] || { balance: 0 };
    },
    enabled: isAuthenticated,
  });

  const handleSearch = async (formData) => {
    setGeoBlockError(null);
    setPaymentError(null);
    setPublicPreview(null);
    // Geographic block: beta only covers Piemonte, Liguria, Lombardia
    const regioneLower = (formData.regione || '').toLowerCase();
    const isBetaRegion = BETA_REGIONS.some(r => regioneLower.includes(r));
    if (!isBetaRegion && formData.regione) {
      setGeoBlockError(formData.regione);
      return;
    }
    setIsLoading(true);
    const searchString = formData.indirizzo_immobile
      ? formData.indirizzo_immobile
      : [formData.comune, formData.foglio && `F.${formData.foglio}`, formData.particella && `P.${formData.particella}`].filter(Boolean).join(' ');
    trackEvent('Search', { customData: { search_string: searchString }, email: currentUser?.email });

    // ── Flusso pubblico: solo anteprima senza login ─────────────────────────
    if (!isAuthenticated && !formData._batch) {
      await handlePublicPreview(formData);
      setIsLoading(false);
      return;
    }

    if (formData._batch) {
      await handleBatchSearch(formData);
    } else {
      await handleSingleSearch(formData);
    }
    setIsLoading(false);
  };

  // Ricerca pubblica: recupera solo dati minimi (catasto WFS) senza creare record
  const handlePublicPreview = async (formData) => {
    setPendingFormData(formData);
    try {
      // Chiama catasto_resolver in modalità "preview" — non salva in DB (no query_id)
      // Usa fetchParcelFromAgent per ottenere geometria e coordinate
      const [resolverRes, agentRes] = await Promise.allSettled([
        catasto_resolver({
          nome_comune: formData.comune,
          regione: formData.regione,
          foglio: formData.foglio,
          particella: formData.particella,
          sezione: formData.sezione_catastale || undefined,
          indirizzo_immobile: formData.indirizzo_immobile || undefined,
          preview_only: true, // flag per non salvare su DB
        }),
        fetchParcelFromAgent({
          comune: formData.comune,
          foglio: formData.foglio,
          particella: formData.particella,
          preview_only: true,
        }),
      ]);

      const resolverData = resolverRes.status === "fulfilled" ? resolverRes.value?.data : null;
      const agentData = agentRes.status === "fulfilled" ? agentRes.value?.data : null;

      const previewResult = {
        comune: formData.comune,
        foglio: formData.foglio,
        particella: formData.particella,
        subalterno: formData.subalterno || null,
        regione: formData.regione,
        provincia: formData.provincia,
        categoria: resolverData?.categoria_catastale || agentData?.categoria || null,
        superficie_mq: resolverData?.superficie_mq || agentData?.superficie_mq || null,
        centroid_lat: agentData?.centroid_lat || resolverData?.centroid_lat || null,
        centroid_lng: agentData?.centroid_lng || resolverData?.centroid_lng || null,
        geometry_geojson: agentData?.geometry_geojson || resolverData?.geometry_geojson || null,
      };
      const trovata = !!(previewResult.centroid_lat || previewResult.categoria);
      logSearch({ comune: formData.comune, foglio: formData.foglio, particella: formData.particella, regione: formData.regione || '', esito: trovata ? 'trovata' : 'non_trovata', user_email: '' }).catch(() => {});
      setPublicPreview(previewResult);
    } catch (err) {
      logSearch({ comune: formData.comune, foglio: formData.foglio, particella: formData.particella, regione: formData.regione || '', esito: 'non_trovata', user_email: '' }).catch(() => {});
      // Anche se fallisce, mostra comunque l'anteprima con i dati inseriti dall'utente
      setPublicPreview({
        comune: formData.comune,
        foglio: formData.foglio,
        particella: formData.particella,
        subalterno: formData.subalterno || null,
        regione: formData.regione,
        provincia: formData.provincia,
        categoria: null,
        superficie_mq: null,
        centroid_lat: null,
        centroid_lng: null,
        geometry_geojson: null,
      });
    }
  };

  // Sblocca il report completo per utente ANONIMO (senza registrazione), free-tier per IP.
  const handleUnlockFree = async () => {
    if (unlockingFree) return;
    const fd = pendingFormData || {};
    setUnlockingFree(true);
    setPaymentError(null);
    try {
      const res = await createAnonymousReport({
        formData: {
          ...fd,
          prefill_lat: publicPreview?.centroid_lat ?? undefined,
          prefill_lon: publicPreview?.centroid_lng ?? undefined,
          geometry_geojson: publicPreview?.geometry_geojson ?? undefined,
        },
      });
      const data = res?.data || res;
      if (data?.ok && data?.report_url) {
        window.fbq?.('track', 'Lead');
        // CAPI server-side: nel webview FB/IG fbq e' disattivato, quindi il Lead del
        // report gratuito anonimo (la conversione chiave del funnel free) arriva a Meta
        // SOLO da qui. Prima non veniva tracciato affatto per l'~88% del traffico.
        trackEvent("Lead", { customData: { content_name: fd.comune || '', currency: "EUR" } });
        try {
          const u = new URL(data.report_url);
          window.location.href = u.pathname + u.search;
        } catch (_) {
          window.location.href = data.report_url;
        }
        return;
      }
      setUnlockingFree(false);
      if (data?.limit_reached) {
        setPaymentError(data.message || 'Hai usato le 3 analisi gratuite. Accedi per continuare.');
      } else {
        setPaymentError('Generazione non riuscita. Riprova tra poco.');
      }
    } catch (err) {
      console.error('createAnonymousReport failed:', err);
      setUnlockingFree(false);
      setPaymentError('Generazione non riuscita. Riprova tra poco.');
    }
  };

  const handleSingleSearch = async (formData) => {
    // NEW FEATURE: process planimetria if uploaded
    let planimetriaData = null;
    let superficieEffettiva = formData.superficie_manuale || null;
    if (formData.planimetriaFile) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: formData.planimetriaFile });
        // Usa Railway /pdf-area (stesso endpoint del report) — preciso per planimetrie AdE
        const result = await calculatePlanimetriaArea({ file_url, query_id: null });
        const resData = result?.data;
        if (resData?.area_mq && resData.area_mq > 5) {
          planimetriaData = {
            superficie_mq: resData.area_mq,
            method: resData.method,
            scale: resData.scale_px_per_m,
            confidence: resData.confidence,
            source: 'planimetria_upload',
            file_url,
            was_uploaded: true,
          };
          if (!superficieEffettiva) superficieEffettiva = resData.area_mq;
        } else {
          planimetriaData = { leggibile: false, file_url, source: 'planimetria_upload', was_uploaded: true };
        }
      } catch (e) {
        console.warn('Planimetria processing failed:', e);
      }
    }
    // Inject actual surface into formData for financial analysis
    const enrichedFormData = superficieEffettiva
      ? { ...formData, superficie: String(superficieEffettiva) }
      : formData;
    const { prezzo_acquisto, superficie, stato_conservativo, destinazione_obiettivo, spese_accessorie,
      categoria_catastale, superficie_mq, rendita_catastale, vani, indirizzo_catastale,
      visura_uploaded, intestatari_visura, _snap_info, _aruba_geometry,
      prefill_lat: _pfLatRaw, prefill_lon: _pfLonRaw, ...cadastralData } = enrichedFormData;
    const fin_data = { prezzo_acquisto, superficie, stato_conservativo, destinazione_obiettivo, spese_accessorie };

    const enrichment = await callUrbiCheckEnrichment(enrichedFormData);
    const reportData = await generateReport(enrichedFormData, enrichment);

    // Punto preciso dalla ricerca per indirizzo (geocode Google + particella WFS): ha PRIORITA'
    // sul geocoding Nominatim dell'enrichment, che su Foglio/Particella ambigui cade sul comune.
    const _pfLat = Number(_pfLatRaw), _pfLon = Number(_pfLonRaw);
    const hasSearchPoint = isFinite(_pfLat) && isFinite(_pfLon) && isValidItalianCoord(_pfLat, _pfLon);
    const _geoLat = hasSearchPoint ? _pfLat : enrichment?.geocoding?.lat;
    const _geoLon = hasSearchPoint ? _pfLon : (enrichment?.geocoding?.lon ?? enrichment?.geocoding?.lng ?? null);
    const geocodingCoords = (_geoLat && isValidItalianCoord(_geoLat, _geoLon)) ? {
      centroid_lat: _geoLat,
      centroid_lng: _geoLon,
    } : {};

    const query = await base44.entities.CadastralQuery.create({
      ...cadastralData,
      status: "pending",
      report_data: { ...reportData, fin_data, planimetria_data: planimetriaData, ...(_snap_info ? { snap_info: _snap_info } : {}) },
      cost: 9.90,
      ...geocodingCoords,
      ...(_aruba_geometry ? { geometry_geojson: _aruba_geometry } : {}),
      ...(superficieEffettiva ? { superficie_mq: superficieEffettiva } : {}),
      ...(visura_uploaded ? { categoria_catastale, superficie_mq, rendita_catastale, vani, indirizzo_catastale, visura_uploaded: true } : {}),
    });

    // Override geocoding — sovrascrive solo se le coordinate sono valide (dentro Italia)
    if (_geoLat && _geoLon && isValidItalianCoord(_geoLat, _geoLon)) {
      await base44.entities.CadastralQuery.update(query.id, {
        centroid_lat: _geoLat,
        centroid_lng: _geoLon,
      });
    }

    // ── Pagamento immediato: crea la query SOLO se il pagamento va a buon fine ──
    window.fbq?.('track', 'InitiateCheckout');
    let chargeResult = null;
    try {
      const cr = await chargeReport({ query_id: query.id });
      chargeResult = cr.data;
    } catch (err) {
      // Pagamento fallito — elimina la query e mostra errore
      console.error('chargeReport failed, deleting query:', err);
      await base44.entities.CadastralQuery.delete(query.id).catch(() => {});
      const data = err?.response?.data;
      const msg = data?.error === 'insufficient_credits'
        ? `Credito insufficiente (€${(data.balance || 0).toFixed(2)} disponibili, servono €${(data.required || 9.90).toFixed(2)}). Ricarica il saldo e riprova.`
        : 'Pagamento non riuscito. Riprova.';
      setGeoBlockError(null); // clear any previous error
      setPaymentError(msg);
      setIsLoading(false);
      return;
    }

    // Pagamento riuscito — avvia enrichments server-side in background
    logSearch({ comune: formData.comune, foglio: formData.foglio, particella: formData.particella, regione: formData.regione || '', esito: 'trovata', user_email: currentUser?.email || '' }).catch(() => {});

    catasto_resolver({
      nome_comune: formData.comune, regione: formData.regione,
      foglio: formData.foglio, particella: formData.particella,
      sezione: formData.sezione_catastale || undefined,
      indirizzo_immobile: formData.indirizzo_immobile || undefined,
      query_id: query.id,
    }).catch(() => {});

    fetchParcelFromAgent({
      query_id: query.id,
      comune: formData.comune,
      foglio: formData.foglio,
      particella: formData.particella,
    }).catch(() => {});

    // Store charge result for toast on report page
    if (chargeResult) {
      sessionStorage.setItem('urbicheck_last_charge', JSON.stringify(chargeResult));
    }

    // Meta Pixel — Lead (report generato con successo, anche gratuiti)
    trackEvent("Lead", { customData: { content_name: formData.comune, currency: "EUR" }, email: currentUser?.email });
    // Meta Pixel — Purchase SOLO se il report ha un costo reale (non gratuito)
    const realAmount = chargeResult?.amount_charged ?? 0;
    if (realAmount > 0) {
      const purchaseEventId = crypto.randomUUID();
      window.fbq?.('track', 'Purchase', { value: realAmount, currency: 'EUR' }, { eventID: purchaseEventId });
      trackEvent("Purchase", { customData: { value: realAmount, currency: "EUR" }, email: currentUser?.email, _event_id: purchaseEventId });
    }

    navigate(`/report/${query.id}`);
  };

  const handleBatchSearch = async (formData) => {
    const { units, _batch, bulkPricing, prezzo_acquisto, superficie, stato_conservativo, destinazione_obiettivo,
      spese_accessorie, categoria_catastale, superficie_mq, rendita_catastale, vani, indirizzo_catastale,
      visura_uploaded, intestatari_visura, ...sharedCadastral } = formData;

    // ── Pre-check: insufficient balance → redirect to credits page ─────────
    const effectiveCost = formData._batchPertinenze
      ? getBulkPricingBeta(1).totalPrice
      : (bulkPricing?.totalPrice || getBulkPricingBeta(units.length).totalPrice);
    if ((credits?.balance || 0) < effectiveCost) {
      // Save batch state before redirecting to credits
      try {
        const serializable = { ...formData };
        delete serializable.planimetriaFile; // File object can't be serialized
        sessionStorage.setItem('urbicheck_pending_batch', JSON.stringify(serializable));
      } catch (_) {}
      navigate('/credits');
      setIsLoading(false);
      return;
    }

    const pricePerUnit = bulkPricing?.pricePerUnit || 2.99;
    const fin_data = { prezzo_acquisto, superficie, stato_conservativo, destinazione_obiettivo, spese_accessorie };
    const visuraExtra = visura_uploaded ? { categoria_catastale, superficie_mq, rendita_catastale, vani, indirizzo_catastale, visura_uploaded: true } : {};

    // Build label — use explicit label if provided (e.g. from multi-sub visura)
    const batchLabel = formData.label ||
      (units.every(u => u.foglio === units[0].foglio && u.particella === units[0].particella)
        ? `Palazzina ${sharedCadastral.comune} F.${units[0].foglio} P.${units[0].particella} — ${units.length} subalterni`
        : `${sharedCadastral.comune} — ${units.length} unità`);

    const batchRecord = await base44.entities.BatchQuery.create({
      comune: sharedCadastral.comune,
      comune_id: sharedCadastral.comune_id,
      regione: sharedCadastral.regione,
      provincia: sharedCadastral.provincia,
      total_units: units.length,
      completed_units: 0,
      failed_units: 0,
      status: "processing",
      finalita: sharedCadastral.finalita,
      label: batchLabel,
      query_ids: [],
    });

    // Per-unit price allocation from total acquisition price — pertinenze ESCLUSE da sommatoria
    const totalAcquisitionPrice = parseFloat(formData.total_acquisition_price) || 0;
    const nonPertinenzaUnits = units.filter(u => !u.is_pertinenza);
    const pertinenzaUnits = units.filter(u => u.is_pertinenza);
    const unitSurfaces = units.map(u => (u.is_pertinenza ? 0 : parseFloat(u.superficie_mq) || (parseFloat(u.vani) * 27) || 0));
    const totalSupBatch = unitSurfaces.reduce((s, v) => s + v, 0);
    const pertinenzaTotalMq = pertinenzaUnits.reduce((s, u) => s + (parseFloat(u.superficie_mq) || 0), 0);
    const getAllocatedPrice = (i) => {
      if (!totalAcquisitionPrice) return null;
      if (totalSupBatch > 0 && unitSurfaces[i] > 0)
        return +(totalAcquisitionPrice * (unitSurfaces[i] / totalSupBatch)).toFixed(2);
      return +(totalAcquisitionPrice / units.length).toFixed(2); // equal fallback
    };

    // Chiama il microservizio una volta per il batch (livello edificio)
    const batchEnrichment = await callUrbiCheckEnrichment(sharedCadastral);
    const _bLat = batchEnrichment?.geocoding?.lat;
    const _bLon = batchEnrichment?.geocoding?.lon ?? batchEnrichment?.geocoding?.lng ?? null;

    window.fbq?.('track', 'InitiateCheckout');
    const queryIds = [];
    const results = [];
    setBatchProgress({ current: 0, total: units.length, results: [] });

    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      setBatchProgress(prev => ({
        ...prev,
        current: i + 1,
        label: `Elaborazione ${i + 1}/${units.length} — F.${unit.foglio} P.${unit.particella}${unit.subalterno ? ` Sub.${unit.subalterno}` : ''}`,
      }));

      try {
        const reportData = await generateReport({ ...sharedCadastral, ...unit }, batchEnrichment);

        // Per-unit catastral data from visura — SOLO dati reali di QUESTO sub, mai dal primo sub
        const hasOwnData = unit.categoria_catastale || unit.superficie_mq || unit.rendita_catastale || unit.vani;
        const unitCatastral = hasOwnData
          ? {
              categoria_catastale: unit.categoria_catastale || undefined,
              superficie_mq: unit.superficie_mq || undefined,
              rendita_catastale: unit.rendita_catastale || undefined,
              vani: unit.vani || undefined,
              visura_uploaded: true,
            }
          : { visura_uploaded: false, _dati_mancanti: true };

        const prezzoUnitaAllocato = getAllocatedPrice(i);
        const batchGeoCoords = (_bLat && isValidItalianCoord(_bLat, _bLon)) ? {
          centroid_lat: _bLat,
          centroid_lng: _bLon,
        } : {};

        const query = await base44.entities.CadastralQuery.create({
          ...sharedCadastral, ...unit,
          status: "pending",
          report_data: {
            ...reportData, fin_data,
            ...(prezzoUnitaAllocato ? { prezzo_acquisto_unita: prezzoUnitaAllocato } : {}),
          },
          cost: pricePerUnit,
          batch_id: batchRecord.id,
          ...unitCatastral,
          ...batchGeoCoords,
        });

        // Override geocoding batch — solo se coordinate valide (dentro Italia)
        if (batchGeoCoords.centroid_lat) {
          await base44.entities.CadastralQuery.update(query.id, batchGeoCoords);
        }

        queryIds.push(query.id);
        results.push({ queryId: query.id, unit, success: true });

        catasto_resolver({
          nome_comune: sharedCadastral.comune, regione: sharedCadastral.regione,
          foglio: unit.foglio, particella: unit.particella,
          sezione: unit.sezione_catastale || undefined,
          indirizzo_immobile: unit.indirizzo_immobile || undefined,
          query_id: query.id,
        }).catch(() => {});

        fetchParcelFromAgent({
          query_id: query.id,
          comune: sharedCadastral.comune,
          foglio: unit.foglio,
          particella: unit.particella,
        }).catch(() => {});

      } catch (err) {
        console.error(`Batch unit ${i + 1} failed:`, err);
        results.push({ unit, success: false, error: err.message });
      }

      setBatchProgress(prev => ({ ...prev, results: [...results] }));
    }

    const completedCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    // Geocoding BatchQuery — solo se coordinate valide
    const batchUpdateGeo = (_bLat && isValidItalianCoord(_bLat, _bLon)) ? {
      centroid_lat: _bLat,
      centroid_lng: _bLon,
      geocoding_source: batchEnrichment?.geocoding?.source || null,
    } : {};

    await base44.entities.BatchQuery.update(batchRecord.id, {
      query_ids: queryIds,
      completed_units: completedCount,
      failed_units: failedCount,
      status: failedCount === units.length ? 'failed' : failedCount > 0 ? 'partial' : 'completed',
      ...(totalAcquisitionPrice > 0 ? { total_acquisition_price: totalAcquisitionPrice } : {}),
      ...(totalSupBatch > 0 ? { total_superficie_mq: totalSupBatch } : {}),
      ...batchUpdateGeo,
    });

    // ── Charge batch using tier system (same logic as chargeReport) ──────
    // Pertinenze (C/2, C/6, C/7) NON consumano report/crediti — solo unità residenziali
    // batchPertinenze flag: user answered "yes" on pertinenze question → charge only 1 report
    const billableQueryIds = formData._batchPertinenze
      ? queryIds.slice(0, 1)
      : queryIds.filter((qid, i) => !units[i]?.is_pertinenza);
    const billableCount = formData._batchPertinenze ? 1 : billableQueryIds.length;
    if (billableCount > 0) {
      try {
        const user = await base44.auth.me();
        const creditsList = await base44.entities.UserCredits.filter({ user_email: user.email });
        let credits = creditsList?.[0];

        // Create UserCredits if missing (new user, no welcome credit)
        if (!credits) {
          credits = await base44.entities.UserCredits.create({
            user_email: user.email,
            balance: 0,
            total_spent: 0,
            total_queries: 0,
            free_reports_used: 0,
            beta_paid_reports_used: 0,
          });
        }

        const FREE_REPORTS = 3;
        const LAUNCH_PAID_REPORTS = 3;
        const LAUNCH_PRICE = 2.99;
        const STANDARD_PRICE = 9.90;

        let freeUsed = credits.free_reports_used || 0;
        let launchUsed = credits.beta_paid_reports_used || 0;
        let freeIncrements = 0;
        let launchIncrements = 0;
        let totalCost = 0;

        // Assign tier to each billable query
        for (let j = 0; j < billableCount; j++) {
          if (freeUsed + freeIncrements < FREE_REPORTS) {
            freeIncrements++;
          } else if (launchUsed + launchIncrements < LAUNCH_PAID_REPORTS) {
            launchIncrements++;
            totalCost += LAUNCH_PRICE;
          } else {
            totalCost += STANDARD_PRICE;
          }
        }

        if (totalCost > 0 && (credits.balance || 0) < totalCost) {
          // Not enough balance — delete all queries and show error
          await Promise.all(queryIds.map(qid => base44.entities.CadastralQuery.delete(qid).catch(() => {})));
          await base44.entities.BatchQuery.delete(batchRecord.id).catch(() => {});
          setPaymentError(`Credito insufficiente per il batch (€${(credits.balance || 0).toFixed(2)} disponibili, servono €${totalCost.toFixed(2)}). Ricarica il saldo e riprova.`);
          setIsLoading(false);
          setBatchProgress(null);
          return;
        }

        // All good — update counters and set paid
        await base44.entities.UserCredits.update(credits.id, {
          free_reports_used: freeUsed + freeIncrements,
          beta_paid_reports_used: launchUsed + launchIncrements,
          balance: +((credits.balance || 0) - totalCost).toFixed(2),
          total_spent: +((credits.total_spent || 0) + totalCost).toFixed(2),
          total_queries: (credits.total_queries || 0) + billableCount,
        });

        await base44.entities.CreditTransaction.create({
          user_email: user.email,
          type: 'query_charge',
          amount: -totalCost,
          description: formData._batchPertinenze
            ? `1 report (pertinenze incluse) — ${sharedCadastral.comune} — ${units.length} unità totali (${freeIncrements} gratis, ${launchIncrements} a €${LAUNCH_PRICE.toFixed(2)}, ${billableCount - freeIncrements - launchIncrements} a €${STANDARD_PRICE.toFixed(2)})`
            : `Batch ${billableCount} unità${pertinenzaUnits.length > 0 ? ` (+${pertinenzaUnits.length} pertinenze)` : ''} — ${sharedCadastral.comune} (${freeIncrements} gratis, ${launchIncrements} a €${LAUNCH_PRICE.toFixed(2)}, ${billableCount - freeIncrements - launchIncrements} a €${STANDARD_PRICE.toFixed(2)})`,
        });

        await Promise.all([
          ...queryIds.map(qid => base44.entities.CadastralQuery.update(qid, { paid: true })),
          base44.entities.BatchQuery.update(batchRecord.id, { paid: true }),
        ]);

        // Meta Pixel — Lead (batch completato, anche gratuiti)
        trackEvent("Lead", { customData: { content_name: sharedCadastral.comune, currency: "EUR" }, email: user.email });
        // Meta Pixel — Purchase SOLO se il batch ha un costo reale (non gratuito)
        if (totalCost > 0) {
          const batchPurchaseEventId = crypto.randomUUID();
          window.fbq?.('track', 'Purchase', { value: totalCost, currency: 'EUR' }, { eventID: batchPurchaseEventId });
          trackEvent("Purchase", { customData: { value: totalCost, currency: "EUR" }, email: user.email, _event_id: batchPurchaseEventId });
        }
      } catch (e) {
        console.error('Batch charge error:', e);
        setPaymentError('Errore durante il pagamento batch. Riprova.');
        setIsLoading(false);
        setBatchProgress(null);
        return;
      }
    }

    logSearch({ comune: sharedCadastral.comune, foglio: units[0]?.foglio || '', particella: units[0]?.particella || '', regione: sharedCadastral.regione || '', esito: completedCount > 0 ? 'trovata' : 'non_trovata', user_email: currentUser?.email || '' }).catch(() => {});

    navigate(`/batch/${batchRecord.id}`);
  };

  // Batch progress overlay
  if (batchProgress && isLoading) {
    return (
      <div className="p-6 lg:p-10 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white border border-border rounded-xl p-8 text-center space-y-6">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ background: '#1A3A6B' }}>
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#1A3A6B', fontFamily: "'Libre Baskerville', serif" }}>
              Analisi batch in corso
            </h2>
            <p className="text-sm text-muted-foreground mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {batchProgress.label || `Elaborazione ${batchProgress.current}/${batchProgress.total}...`}
            </p>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%`, background: '#1A3A6B' }} />
          </div>
          <p className="text-xs text-muted-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {batchProgress.current} / {batchProgress.total} unità elaborate
          </p>
          {batchProgress.results.length > 0 && (
            <div className="text-left space-y-1 max-h-40 overflow-y-auto">
              {batchProgress.results.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {r.success
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    : <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                  <span className={r.success ? 'text-emerald-700' : 'text-red-600'}>
                    F.{r.unit.foglio} P.{r.unit.particella}{r.unit.subalterno ? ` Sub.${r.unit.subalterno}` : ''}
                    {!r.success && ` — ${r.error}`}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground italic" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            Non chiudere questa finestra. L'analisi AI impiega 30–60s per unità.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-1" style={{ color: '#1A3A6B', fontFamily: "'Libre Baskerville', serif", fontStyle: 'italic' }}>
          {publicPreview ? "Anteprima risultato" : "Analisi Urbanistica"}
        </h1>
        {!publicPreview && isAuthenticated && <CreditTierBanner variant="search" />}
        {!publicPreview && !isAuthenticated && (
          <div className="mb-6 flex items-center gap-2 px-3 py-2 text-xs" style={{ background: '#f0fdf4', border: '1px solid #86efac', fontFamily: "'IBM Plex Mono', monospace", color: '#15803d' }}>
            🚀 <strong>Beta attiva</strong> — Prime 3 analisi gratuite · poi €2,99/report (offerta lancio, max 3) · poi €9,90 · Solo Piemonte, Liguria, Lombardia
          </div>
        )}
        {paymentError && (
          <div className="mb-5 p-4 flex flex-col gap-2" style={{ background: '#fef2f2', border: '2px solid #ef4444', fontFamily: "'IBM Plex Mono', monospace" }}>
            <p className="text-sm font-semibold" style={{ color: '#991b1b' }}>
              {paymentError}
            </p>
            <a href="/credits" className="text-xs underline font-semibold" style={{ color: '#991b1b' }}>Ricarica crediti →</a>
          </div>
        )}
        {geoBlockError && (
          <div className="mb-5 p-4 flex flex-col gap-2" style={{ background: '#fff8f0', border: '2px solid #f59e0b', fontFamily: "'IBM Plex Mono', monospace" }}>
            <p className="text-sm font-semibold" style={{ color: '#92400e' }}>
              ⚠️ La fase beta è disponibile solo per immobili in Piemonte, Liguria e Lombardia.
            </p>
            <p className="text-xs" style={{ color: '#78350f' }}>
              Hai selezionato: <strong>{geoBlockError}</strong>. Sei interessato ad altre regioni?
            </p>
            <GeoWaitlistCapture regione={geoBlockError} />
          </div>
        )}
      </motion.div>

      {/* Anteprima pubblica — mostrata dopo la ricerca per utenti non loggati */}
      {publicPreview ? (
        <div className="space-y-4">
          <PublicSearchPreview
            previewData={publicPreview}
            formData={pendingFormData}
            onUnlockFree={handleUnlockFree}
            unlocking={unlockingFree}
          />
          <button
            onClick={() => { setPublicPreview(null); setPendingFormData(null); }}
            className="text-xs underline text-muted-foreground"
            style={{ fontFamily: "'IBM Plex Mono', monospace", background: "none", border: "none", cursor: "pointer" }}
          >
            ← Nuova ricerca
          </button>
        </div>
      ) : (
        <>
          {pendingBatchData && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-5 rounded-lg border-2 border-emerald-500 bg-emerald-50 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <p className="text-sm font-bold text-emerald-800" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  Acquisto completato! Riprendi la tua analisi:
                </p>
              </div>
              <div className="text-xs text-emerald-700 space-y-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                <p><strong>{pendingBatchData.units?.length || 1} unità</strong> — {pendingBatchData.comune}</p>
                <p>Prezzo totale: <strong>€{(pendingBatchData.bulkPricing?.totalPrice || pendingBatchData.units?.length * 2.99).toFixed(2)}</strong></p>
              </div>
              <p className="text-[10px] text-emerald-600 italic">
                I dati sono stati pre-compilati. Verifica e clicca "Conferma e Analizza" per procedere.
              </p>
            </motion.div>
          )}

          {/* Prova con un esempio */}
          <button
            type="button"
            onClick={() => setExampleData({ comune: "Torino", foglio: "15", particella: "342", finalita: "acquisto_privato" })}
            className="w-full mb-4 py-2.5 px-4 border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors flex items-center justify-center gap-2"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#1A3A6B' }}>
              Prova con un esempio →
            </span>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              Torino · F.15 · P.342 · Acquisto privato
            </span>
          </button>

          <div className="bg-white p-6 lg:p-8" style={{ border: '1px solid #C4BAA8' }}>
            <ErrorBoundary>
              <CadastralSearchForm
                onSubmit={handleSearch}
                isLoading={isLoading}
                submitLabel={isAuthenticated ? "Analizza →" : "Cerca particella — gratis →"}
                userBalance={credits?.balance ?? null}
                initialBatchData={pendingBatchData}
                prefillData={exampleData}
                initialAddress={initialAddress}
              />
            </ErrorBoundary>
          </div>

          {!isAuthenticated && (
            <div className="mt-4 px-4 py-3 text-xs text-center" style={{ background: '#f0fdf4', border: '1px solid #86efac', fontFamily: "'IBM Plex Mono', monospace", color: '#15803d' }}>
              🔍 Cerca e ottieni il report completo — gratis, senza registrarti. Prime 3 analisi incluse.
            </div>
          )}

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-8">
            <h2 className="text-[10px] font-semibold uppercase tracking-[2px] mb-4" style={{ color: '#B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}>Come funziona</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { n: "1", icon: Search, title: "Cerca senza login", desc: "Inserisci comune, foglio e particella — gratis, senza registrazione." },
                { n: "2", icon: Shield, title: "Vedi la mappa + dati base", desc: "Confermi subito che la particella esiste con mappa e dati catastali." },
                { n: "3", icon: Info, title: "Ottieni il report — gratis", desc: "Un clic e vedi il report completo, senza registrarti. Prime 3 analisi gratuite." },
              ].map(({ n, icon: Icon, title, desc }) => (
                <div key={n} className="bg-white p-5 flex gap-4" style={{ border: '1px solid #C4BAA8' }}>
                  <div className="w-8 h-8 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                    style={{ background: '#1A3A6B', color: '#B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {n}
                  </div>
                  <div>
                    <p className="font-semibold text-xs uppercase tracking-[1px]" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>{title}</p>
                    <p className="text-xs mt-1" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="mt-10 pt-6 border-t border-border text-center text-xs text-muted-foreground">
            urbicheck.it — Dati aggiornati da fonti GIS ufficiali regionali
          </div>
        </>
      )}
    </div>
  );
}

// Validate geocoding coords are inside Italy bounding box
function isValidItalianCoord(lat, lon) {
  if (!lat || !lon || !isFinite(lat) || !isFinite(lon)) return false;
  return lat >= 36 && lat <= 47.5 && lon >= 6 && lon <= 18.5;
}

// ── Microservizio UrbiCheck enrichment ─────────────────────────────────────
async function callUrbiCheckEnrichment(formData, lat = null, lon = null) {
  try {
    const res = await Promise.race([
      fetch(`${ENRICHMENT_API_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comune: formData.comune,
          provincia: formData.provincia || null,
          regione: formData.regione || null,
          indirizzo: formData.indirizzo_immobile || null,
          lat: lat || null,
          lon: lon || null,
        }),
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
    ]);
    if (!res.ok) return null;
    return await res.json();
  } catch (_e) {
    console.warn('UrbiCheck microservice unavailable, using fallback');
    return null;
  }
}

// ── Merge enrichment vincoli into report data ────────────────────────────────
function mergeEnrichment(reportData, enrichment) {
  if (!enrichment) return reportData;
  const vincoli = { ...(reportData.vincoli || {}) };

  if (enrichment.vincolo_sismico) {
    vincoli.vincolo_sismico = {
      presente: true,
      zona: String(enrichment.vincolo_sismico.zona || ''),
      dettagli: enrichment.vincolo_sismico.descrizione || '',
      fonte: enrichment.vincolo_sismico.fonte || 'Microservizio UrbiCheck',
    };
  }

  if (enrichment.vincolo_ferroviario) {
    vincoli.vincolo_ferroviario = {
      presente: enrichment.vincolo_ferroviario.presente || false,
      distanza_m: enrichment.vincolo_ferroviario.distanza_m || null,
      ferrovia: enrichment.vincolo_ferroviario.ferrovia || null,
      tipo: enrichment.vincolo_ferroviario.tipo || 'assente',
      legge: enrichment.vincolo_ferroviario.legge || 'DPR 753/1980',
      dettagli: enrichment.vincolo_ferroviario.tipo === 'assoluta'
        ? `Fascia assoluta 30m — edificazione vietata (DPR 753/1980 art. 49). Distanza: ${enrichment.vincolo_ferroviario.distanza_m}m`
        : enrichment.vincolo_ferroviario.tipo === 'limitata'
        ? `Fascia limitata 150m — interventi soggetti ad autorizzazione RFI. Distanza: ${enrichment.vincolo_ferroviario.distanza_m}m`
        : `Nessuna ferrovia entro 200m`,
    };
  }

  if (enrichment.vincolo_pai) {
    vincoli.vincolo_pai = {
      link_verifica: enrichment.vincolo_pai.link_verifica || null,
      nota: enrichment.vincolo_pai.nota || null,
    };
  }

  if (enrichment.overpass_infra) {
    vincoli.overpass_infra = enrichment.overpass_infra;
  }

  return { ...reportData, vincoli, _enrichment_source: 'urbicheck_microservice' };
}

async function generateReport(formData, enrichment = null) {
  const finalitaMap = {
    acquisto_privato: "acquisto per uso privato/abitativo",
    investimento: "investimento immobiliare",
    sviluppo_immobiliare: "sviluppo e trasformazione immobiliare",
    asta_giudiziaria: "acquisto da asta giudiziaria (massima attenzione a CDU e conformità)",
    due_diligence: "due diligence professionale",
    valutazione_professionale: "valutazione professionale/perizia",
  };
  const finalitaDesc = finalitaMap[formData.finalita] || formData.finalita;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Sei un esperto urbanista e tecnico catastale italiano. Genera un report urbanistico-catastale per il seguente immobile.

Regione: ${formData.regione}
Provincia: ${formData.provincia || "N/D"}
Comune: ${formData.comune}
Foglio: ${formData.foglio}
Particella: ${formData.particella}
Subalterno: ${formData.subalterno || "N/D"}
Finalità analisi: ${finalitaDesc}

REGOLA ASSOLUTA — NESSUN DATO INVENTATO:
NON inventare mai dati catastali specifici come: nomi di intestatari, rendita catastale esatta, numero di vani, codici zona specifici (es. B1, C2), valori precisi di IF/RC/H max, classe catastale numerica.
Questi dati esistono solo nelle banche dati ufficiali (Catasto AdE, PRG comunale) e NON possono essere generati dall'AI.

Per i seguenti campi usa SEMPRE queste stringhe standard se non hai dati reali verificati:
- intestatari: "Richiedi visura ufficiale AdE"
- rendita_catastale: "Disponibile su visura ufficiale AdE"
- if_mc_mq: "Stima orientativa — verificare su NTA/PRG Comunale"
- rc_percentuale: "Stima orientativa — verificare su NTA/PRG Comunale"
- h_max: "Stima orientativa — verificare su NTA/PRG Comunale"
- zona_codice: usa un valore generico come "Zona residenziale" o "Zona agricola"

Per la categoria catastale puoi indicare la tipologia generale basandoti sul contesto.
Per la colore zonizzazione (verde/giallo/rosso) puoi fare una stima orientativa.
Per i vincoli puoi indicare presenza/assenza SOLO se hai informazioni certe per quella regione/comune.
${formData.finalita === "asta_giudiziaria" ? "IMPORTANTE: per asta giudiziaria aggiungi dettagli specifici sul CDU e conformità urbanistica." : ""}

REGOLA LINGUISTICA: Usa ESCLUSIVAMENTE terminologia tecnica italiana.`,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        zonizzazione: {
          type: "object",
          properties: {
            colore: { type: "string" },
            zona_codice: { type: "string" },
            descrizione: { type: "string" },
            destinazione_prevalente: { type: "string" }
          }
        },
        indici_edilizi: {
          type: "object",
          properties: {
            if_mc_mq: { type: "string" }, rc_percentuale: { type: "string" },
            h_max: { type: "string" }, distanza_confini: { type: "string" },
            distanza_fabbricati: { type: "string" }, distanza_strada: { type: "string" }
          }
        },
        fattibilita_interventi: {
          type: "array",
          items: { type: "object", properties: { tipo_intervento: { type: "string" }, fattibilita: { type: "string" }, note: { type: "string" } } }
        },
        dati_catastali: {
          type: "object",
          properties: {
            categoria: { type: "string" }, classe: { type: "string" },
            consistenza: { type: "string" }, rendita_catastale: { type: "string" },
            zona_censuaria: { type: "string" }, microzona: { type: "string" }, intestatari: { type: "string" }
          }
        },
        quadro_urbanistico: {
          type: "object",
          properties: {
            strumento_vigente: { type: "string" }, zona_urbanistica: { type: "string" },
            destinazione_uso: { type: "string" }, indice_edificabilita: { type: "string" },
            altezza_massima: { type: "string" }, distanze_minime: { type: "string" }, note_urbanistiche: { type: "string" }
          }
        },
        vincoli: {
          type: "object",
          properties: {
            vincolo_sismico: { type: "object", properties: { presente: { type: "boolean" }, zona: { type: "string" }, dettagli: { type: "string" } } },
            vincolo_idraulico: { type: "object", properties: { presente: { type: "boolean" }, classe_rischio: { type: "string" }, dettagli: { type: "string" } } },
            vincolo_paesaggistico: { type: "object", properties: { presente: { type: "boolean" }, tipo: { type: "string" }, dettagli: { type: "string" } } },
            vincolo_archeologico: { type: "object", properties: { presente: { type: "boolean" }, dettagli: { type: "string" } } },
            altri_vincoli: { type: "array", items: { type: "object", properties: { nome: { type: "string" }, presente: { type: "boolean" }, dettagli: { type: "string" } } } }
          }
        },
        pratiche_necessarie: {
          type: "array",
          items: { type: "object", properties: { tipo_intervento: { type: "string" }, pratica_richiesta: { type: "string" }, ente_competente: { type: "string" }, tempistica_stimata: { type: "string" }, costi_stimati: { type: "string" }, note: { type: "string" } } }
        },
        accesso_atti: {
          type: "object",
          properties: {
            ufficio_catasto: { type: "string" }, ufficio_urbanistica: { type: "string" }, ufficio_edilizia: { type: "string" },
            documenti_ottenibili: { type: "array", items: { type: "string" } }, modalita_accesso: { type: "string" }
          }
        },
        valutazione_sintetica: {
          type: "object",
          properties: {
            livello_complessita: { type: "string" },
            criticita_principali: { type: "array", items: { type: "string" } },
            opportunita: { type: "array", items: { type: "string" } },
            raccomandazioni: { type: "array", items: { type: "string" } }
          }
        }
      }
    }
  });

  return mergeEnrichment(result, enrichment);
}

// ── Bulk pricing helper (beta tiers) ──────────────────────────────────────
const BULK_TIERS_BETA = [
  { min: 1,  max: 1,  pricePerUnit: 2.99,  discount: 0    },
  { min: 2,  max: 4,  pricePerUnit: 2.59,  discount: 0.13 },
  { min: 5,  max: 9,  pricePerUnit: 2.39,  discount: 0.20 },
  { min: 10, max: 19, pricePerUnit: 1.99,  discount: 0.33 },
  { min: 20, max: Infinity, pricePerUnit: 1.69, discount: 0.43 },
];

function getBulkPricingBeta(unitCount) {
  const tier = BULK_TIERS_BETA.find(t => unitCount >= t.min && unitCount <= t.max);
  return {
    pricePerUnit: tier.pricePerUnit,
    totalPrice: +(tier.pricePerUnit * unitCount).toFixed(2),
  };
}