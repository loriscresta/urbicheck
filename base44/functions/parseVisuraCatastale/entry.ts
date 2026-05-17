/**
 * parseVisuraCatastale.js — URBICHECK
 * Estrae dati strutturati da una visura catastale AdE (PDF/immagine).
 * Usa regex + fallback AI (InvokeLLM).
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  let user;
  try { user = await base44.auth.me(); } catch (_e) {}
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await req.json(); } catch (_e) {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { file_url, file_text } = body;
  if (!file_url && !file_text) {
    return Response.json({ error: 'Richiesto file_url o file_text' }, { status: 400 });
  }

  // ── STEP 1: Estrai testo (se non già passato) ──
  let testo = file_text || '';
  if (!testo && file_url) {
    // Per PDF/immagine usiamo AI con vision direttamente
  }

  // ── STEP 2: Parsing regex ──
  const dati = testo ? parseRegex(testo) : {};

  // ── STEP 3: Fallback / arricchimento AI ──
  const campiMancanti = !dati.foglio || !dati.particella || !dati.comune;
  const needsAI = campiMancanti || file_url;

  if (needsAI) {
    try {
      const aiResult = await base44.integrations.Core.InvokeLLM({
        prompt: buildAIPrompt(testo),
        file_urls: file_url ? [file_url] : undefined,
        response_json_schema: {
          type: "object",
          properties: {
            comune: { type: "string" },
            provincia: { type: "string" },
            sezione_visura: { type: "string", description: "Codice sezione dalla visura (può essere 1-3 chars come A, PL, RM)" },
            sezione_inspire: { type: "string", description: "Sezione INSPIRE estratta dal campo Mappali Correlati (1 char: A, B, C...)" },
            foglio: { type: "string" },
            particella: { type: "string" },
            subalterno: { type: "string" },
            categoria_catastale: { type: "string", description: "es. A/3, C/6, D/1" },
            superficie_mq: { type: "number" },
            rendita_catastale: { type: "number" },
            vani: { type: "number" },
            indirizzo_catastale: { type: "string" },
            classe_catastale: { type: "string", description: "Classe catastale (es. 1, 2, 3, 4, 5, 6, 7)" },
            zona_censuaria: { type: "string", description: "Zona Censuaria (es. 1, 2A, 3B)" },
            intestatari: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nome: { type: "string" },
                  quota: { type: "string" },
                  data_inizio: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Merge: AI sovrascrive solo i campi mancanti dal regex
      if (aiResult) {
        if (!dati.comune && aiResult.comune) dati.comune = aiResult.comune;
        if (!dati.provincia && aiResult.provincia) dati.provincia = aiResult.provincia;
        if (!dati.sezione_visura && aiResult.sezione_visura) dati.sezione_visura = aiResult.sezione_visura;
        if (!dati.sezione_inspire && aiResult.sezione_inspire) dati.sezione_inspire = aiResult.sezione_inspire;
        if (!dati.foglio && aiResult.foglio) dati.foglio = aiResult.foglio;
        if (!dati.particella && aiResult.particella) dati.particella = aiResult.particella;
        if (!dati.subalterno && aiResult.subalterno) dati.subalterno = aiResult.subalterno;
        if (!dati.categoria_catastale && aiResult.categoria_catastale) dati.categoria_catastale = aiResult.categoria_catastale;
        if (!dati.superficie_mq && aiResult.superficie_mq) dati.superficie_mq = aiResult.superficie_mq;
        if (!dati.rendita_catastale && aiResult.rendita_catastale) dati.rendita_catastale = aiResult.rendita_catastale;
        if (!dati.vani && aiResult.vani) dati.vani = aiResult.vani;
        if (!dati.indirizzo_catastale && aiResult.indirizzo_catastale) dati.indirizzo_catastale = aiResult.indirizzo_catastale;
        if (!dati.intestatari && aiResult.intestatari) dati.intestatari = aiResult.intestatari;
        if (!dati.classe_catastale && aiResult.classe_catastale) dati.classe_catastale = aiResult.classe_catastale;
        if (!dati.zona_censuaria && aiResult.zona_censuaria) dati.zona_censuaria = aiResult.zona_censuaria;
      }
    } catch (aiErr) {
      console.warn('AI parsing error:', aiErr.message);
    }
  }

  // La sezione da usare nel form è: sezione_inspire (da Mappali Correlati) con fallback sezione_visura
  dati.sezione_form = dati.sezione_inspire || dati.sezione_visura || '';

  return Response.json({ success: true, dati });
});

// ── Regex parser ──
function parseRegex(testo) {
  const dati = {};

  // INSPIRE: "G605 - Sezione A - Foglio 8 - Particella 507"
  const mappaliRe = /[A-Z]\d{3,4}\s*[-–]\s*Sezione\s+([A-Z])\s*[-–]\s*Foglio\s+(\d+)\s*[-–]\s*Particella\s+(\d+)/gi;
  const mappaliMatch = mappaliRe.exec(testo);
  if (mappaliMatch) {
    dati.sezione_inspire = mappaliMatch[1].toUpperCase();
    // Non sovrascrivere foglio/particella da questo — la particella nei Mappali può essere quella del terreno
  }

  // Sezione visura
  const sezRe = /(?:Sezione|Sez\.?)\s+([A-Z]{1,3})/i;
  const sezM = sezRe.exec(testo);
  if (sezM) dati.sezione_visura = sezM[1].toUpperCase();

  // Foglio
  const foglioRe = /Foglio\s+(\d+)/i;
  const foglioM = foglioRe.exec(testo);
  if (foglioM) dati.foglio = foglioM[1];

  // Particella
  const partRe = /(?:Particella|Part\.)\s+(\d+)/i;
  const partM = partRe.exec(testo);
  if (partM) dati.particella = partM[1];

  // Subalterno
  const subRe = /Sub(?:alterno)?\s+(\d+)/i;
  const subM = subRe.exec(testo);
  if (subM) dati.subalterno = subM[1];

  // Categoria catastale (es. A/3, C/6)
  const catRe = /Categoria\s+([A-Z]\/\d+)/i;
  const catM = catRe.exec(testo);
  if (catM) dati.categoria_catastale = catM[1];

  // Rendita catastale
  const renditaRe = /Rendita\s+Catastale[^€\d]*(€\s*)?([\d.,]+)/i;
  const renditaM = renditaRe.exec(testo);
  if (renditaM) dati.rendita_catastale = parseFloat(renditaM[2].replace(',', '.'));

  // Superficie
  const surfRe = /Superficie\s+(\d+)\s*[Mm]q/i;
  const surfM = surfRe.exec(testo);
  if (surfM) dati.superficie_mq = parseInt(surfM[1], 10);

  // Classe catastale
  const classeRe = /Classe\s+(\d+)/i;
  const classeM = classeRe.exec(testo);
  if (classeM) dati.classe_catastale = classeM[1];

  // Zona censuaria
  const zonaRe = /Zona\s+Censuaria\s+([\dA-Za-z]+)/i;
  const zonaM = zonaRe.exec(testo);
  if (zonaM) dati.zona_censuaria = zonaM[1];

  // Vani
  const vaniRe = /(?:Vani|Consistenza)\s+([\d.,]+)\s*(?:vani)?/i;
  const vaniM = vaniRe.exec(testo);
  if (vaniM) dati.vani = parseFloat(vaniM[1].replace(',', '.'));

  // Indirizzo
  const indirizzoRe = /(?:Via|Corso|Piazza|Largo|Vicolo|Viale|Strada)\s+[A-Za-zÀ-ÿ\s]+\d+/i;
  const indirizzoM = indirizzoRe.exec(testo);
  if (indirizzoM) dati.indirizzo_catastale = indirizzoM[0].trim();

  return dati;
}

function buildAIPrompt(testo) {
  return `Sei un esperto catastale italiano. Analizza questa visura catastale dell'Agenzia delle Entrate ed estrai i seguenti dati strutturati.

${testo ? `TESTO VISURA:\n${testo.slice(0, 8000)}` : 'Analizza il file allegato (immagine/PDF).'}

ISTRUZIONI CRITICHE:

La visura AdE ha una sezione "DATI IDENTIFICATIVI DELL'UNITA' IMMOBILIARE" con una tabella che contiene queste colonne:
Foglio | Particella | Subalterno | Categoria | Classe | Consistenza | Superficie | Zona Censuaria | Microzona

Devi estrarre TUTTI questi campi dalla tabella:
- foglio: numero del foglio catastale (es. "268")
- particella: numero della particella (es. "5206")  
- subalterno: numero subalterno (es. "3"), null se assente
- categoria_catastale: es. "A/3", "C/6", "D/1"
- classe_catastale: il valore nella colonna "Classe" — OBBLIGATORIO estrarlo. È tipicamente un numero intero ("1","2","3") o può essere "//" o una lettera. Mettilo come stringa.
- zona_censuaria: il valore nella colonna "Zona Censuaria" — OBBLIGATORIO estrarlo. È tipicamente un numero ("1","2","3") o codice alfanumerico ("2A","3B"). Mettilo come stringa.
- superficie_mq: numero in mq dalla colonna Superficie, null se assente
- rendita_catastale: importo in € (solo il numero, senza simbolo), null se assente
- vani: numero di vani dalla colonna Consistenza, null se assente
- indirizzo_catastale: indirizzo dell'immobile riportato nella visura

Campi aggiuntivi:
1. sezione_inspire: dalla sezione "Mappali Terreni Correlati" — righe tipo "[CODICE] - Sezione [LETTERA] - Foglio [N] - Particella [N]". La LETTERA è la sezione INSPIRE (1 char: A, B, C...).
2. sezione_visura: la sezione principale della visura (es. "PL", "RM", "A").
3. comune: nome del comune dall'intestazione.
4. provincia: sigla provincia.
5. intestatari: lista oggetti {nome, quota, data_inizio} dalla sezione intestatari.

IMPORTANTE: classe_catastale e zona_censuaria sono campi PRIORITARI — devono essere estratti dalla tabella dati identificativi. Non lasciarli null se sono visibili nel documento.
Se un campo non è presente nella visura, lascia null (non inventare valori).

Restituisci JSON con tutti i campi richiesti.`;
}