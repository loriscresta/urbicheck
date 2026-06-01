/**
 * calculatePlanimetriaArea — Analisi planimetria catastale AdE
 * Parser PDF nativo in Deno puro (zero dipendenze npm/esm) — analisi content stream
 * Trova campiture azzurre AdE e calcola area con formula di Gauss
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Colore azzurro AdE (campitura subalterno) ──
function isAdeBlueRGB(r, g, b) {
  // RGB 0-1: cielo chiaro AdE ~ (0.6-0.75, 0.78-0.88, 0.88-1.0)
  return r < 0.80 && g < 0.92 && b > 0.65 && (b - r) > 0.07 && (b - g) > 0.02;
}
function isAdeBlueCMYK(c, m, y, k) {
  // CMYK: C medio, M/Y bassi, K basso
  return c > 0.08 && m < 0.25 && y < 0.20 && k < 0.25;
}

// ── Shoelace formula ──
function shoelaceArea(pts) {
  let a = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(a) / 2;
}

// ── Decomprimi deflate (raw o zlib) ──
async function tryDecompress(bytes) {
  for (const format of ['deflate-raw', 'deflate']) {
    try {
      const ds = new DecompressionStream(format);
      const writer = ds.writable.getWriter();
      const reader = ds.readable.getReader();
      writer.write(bytes).catch(() => {});
      writer.close().catch(() => {});
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const total = chunks.reduce((s, c) => s + c.length, 0);
      const out = new Uint8Array(total);
      let off = 0;
      for (const c of chunks) { out.set(c, off); off += c.length; }
      return out;
    } catch (_e) { /* try next */ }
  }
  return null;
}

// ── Estrai content stream dal PDF binario ──
async function extractContentStreams(pdfBytes) {
  const dec = new TextDecoder('latin1');
  const pdfStr = dec.decode(pdfBytes);
  const streams = [];

  // Trova tutti i blocchi stream...endstream
  let searchFrom = 0;
  while (true) {
    const streamMarker = pdfStr.indexOf('stream', searchFrom);
    if (streamMarker === -1) break;
    // Il marker può essere "stream\r\n" o "stream\n"
    const afterMarker = streamMarker + 6;
    let dataStart = afterMarker;
    if (pdfStr[dataStart] === '\r') dataStart++;
    if (pdfStr[dataStart] === '\n') dataStart++;
    const endIdx = pdfStr.indexOf('endstream', dataStart);
    if (endIdx === -1) { searchFrom = afterMarker; continue; }
    const rawBytes = pdfBytes.slice(dataStart, endIdx);
    searchFrom = endIdx + 9;

    // Prova testo diretto (non compresso)
    const text = dec.decode(rawBytes);
    const looksLikePdfOps = /\b(rg|k|re|[fFBb]\b|m\b|l\b|cm\b|gs\b)/m.test(text);
    if (looksLikePdfOps) {
      streams.push(text);
      continue;
    }

    // Prova deflate
    const decompressed = await tryDecompress(rawBytes);
    if (decompressed) {
      const dtext = dec.decode(decompressed);
      if (/\b(rg|k|re|[fFBb]\b|m\b|l\b)/m.test(dtext)) {
        streams.push(dtext);
      }
    }
  }
  return streams;
}

// ── Scala da PDF: cerca /MediaBox e pattern 1:NNN ──
function detectScaleFromPdf(pdfStr, pageText) {
  // Scala esplicita nel testo (es. "1:200", "1/200")
  const sm = pageText.match(/1\s*[:\\/]\s*(\d{2,4})/);
  if (sm) return parseInt(sm[1]);
  // Fallback AdE standard
  return 200;
}

// ── Dimensione pagina da PDF ──
function detectPageSizePt(pdfStr) {
  const mb = pdfStr.match(/\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/);
  if (mb) {
    const w = parseFloat(mb[3]) - parseFloat(mb[1]);
    const h = parseFloat(mb[4]) - parseFloat(mb[2]);
    return { w, h };
  }
  return { w: 595, h: 842 }; // A4 default
}

// ── Analisi operatori PDF ──
function analyzeContentStreams(streams) {
  let fillR = 1, fillG = 1, fillB = 1;
  let fillC = 0, fillM = 0, fillY = 0, fillK = 0;
  let isCMYK = false;
  let stack = [];
  let pathPoints = [];
  let blueAreaPt2 = 0;
  let bluePatchCount = 0;
  const allText = [];

  const FILL_OPS = new Set(['f', 'F', 'f*', 'B', 'B*', 'b', 'b*']);
  const NOSTROKE_OPS = new Set(['n', 'S', 's', 'h']);

  for (const content of streams) {
    allText.push(content);

    // Tokenizza il content stream
    // I token PDF sono separati da whitespace; stringhe in () o <> vengono skippate
    const tokens = [];
    let i = 0;
    while (i < content.length) {
      const ch = content[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (ch === '(') {
        // Stringa PDF: salta fino alla parentesi chiusa bilanciata
        let depth = 1; i++;
        while (i < content.length && depth > 0) {
          if (content[i] === '\\') { i += 2; continue; }
          if (content[i] === '(') depth++;
          if (content[i] === ')') depth--;
          i++;
        }
        tokens.push('__STRING__');
        continue;
      }
      if (ch === '<') {
        // Hex string o dict
        const end = content.indexOf(ch === '<' && content[i+1] === '<' ? '>>' : '>', i + 1);
        i = (end === -1 ? content.length : end + 1 + (content[i+1] === '<' ? 1 : 0));
        tokens.push('__HEX__');
        continue;
      }
      if (ch === '%') {
        // Commento
        const eol = content.indexOf('\n', i);
        i = eol === -1 ? content.length : eol + 1;
        continue;
      }
      // Token normale
      let tok = '';
      while (i < content.length && !/[\s()<>%\[\]{}\/]/.test(content[i])) {
        tok += content[i++];
      }
      if (tok) tokens.push(tok);
    }

    // Processa i token
    for (let ti = 0; ti < tokens.length; ti++) {
      const t = tokens[ti];
      const n = parseFloat(t);

      if (!isNaN(n) && t !== '') {
        stack.push(n);
      } else if (t === 'rg' && stack.length >= 3) {
        // fill RGB (lowercase)
        fillB = stack.pop(); fillG = stack.pop(); fillR = stack.pop();
        isCMYK = false;
      } else if (t === 'g' && stack.length >= 1) {
        // fill gray
        const gray = stack.pop();
        fillR = gray; fillG = gray; fillB = gray; isCMYK = false;
      } else if (t === 'k' && stack.length >= 4) {
        // fill CMYK (lowercase)
        fillK = stack.pop(); fillY = stack.pop(); fillM = stack.pop(); fillC = stack.pop();
        isCMYK = true;
        fillR = (1 - fillC) * (1 - fillK);
        fillG = (1 - fillM) * (1 - fillK);
        fillB = (1 - fillY) * (1 - fillK);
      } else if ((t === 'RG' || t === 'G' || t === 'K') && stack.length >= 1) {
        // Stroke color — ignora ma svuota lo stack
        if (t === 'RG') stack.splice(-3);
        else if (t === 'K') stack.splice(-4);
        else stack.pop();
      } else if (t === 're' && stack.length >= 4) {
        // Rectangle
        const h = stack.pop(); const w = stack.pop();
        const y = stack.pop(); const x = stack.pop();
        if (w > 0 && h > 0) {
          pathPoints = [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
        }
      } else if (t === 'm' && stack.length >= 2) {
        const y = stack.pop(); const x = stack.pop();
        pathPoints = []; // inizia nuovo path
        pathPoints.push({ x, y });
      } else if (t === 'l' && stack.length >= 2) {
        const y = stack.pop(); const x = stack.pop();
        pathPoints.push({ x, y });
      } else if (t === 'c' && stack.length >= 6) {
        // Bezier C — usa solo il punto finale
        const y = stack.pop(); const x = stack.pop();
        stack.splice(-4); // rimuovi i 4 punti di controllo
        pathPoints.push({ x, y });
      } else if (t === 'v' && stack.length >= 4) {
        const y = stack.pop(); const x = stack.pop();
        stack.splice(-2);
        pathPoints.push({ x, y });
      } else if (t === 'y' && stack.length >= 4) {
        const y = stack.pop(); const x = stack.pop();
        stack.splice(-2);
        pathPoints.push({ x, y });
      } else if (t === 'h') {
        // closepath — non fa fill da solo
      } else if (FILL_OPS.has(t)) {
        const isBlue = isCMYK
          ? isAdeBlueCMYK(fillC, fillM, fillY, fillK)
          : isAdeBlueRGB(fillR, fillG, fillB);
        if (isBlue && pathPoints.length >= 3) {
          const area = shoelaceArea(pathPoints);
          if (area > 30) {
            blueAreaPt2 += area;
            bluePatchCount++;
            console.log(`[planimetria] patch #${bluePatchCount}: ${area.toFixed(0)} pt² RGB(${fillR.toFixed(2)},${fillG.toFixed(2)},${fillB.toFixed(2)})`);
          }
        }
        pathPoints = [];
        stack = [];
      } else if (NOSTROKE_OPS.has(t)) {
        pathPoints = [];
      } else if (t === 'q' || t === 'Q' || t === 'cm') {
        // Push/pop graphics state o CTM — reset stack
        if (t === 'cm' && stack.length >= 6) stack.splice(-6);
        else if (t === 'q' || t === 'Q') stack = [];
      } else if (t === '__STRING__' || t === '__HEX__' || t === 'BT' || t === 'ET') {
        // Testo — skip
        stack = [];
      } else {
        // Operatore sconosciuto: svuota stack per evitare accumulo erroneo
        stack = [];
      }
    }
  }
  return { blueAreaPt2, bluePatchCount, textContent: allText.join('\n') };
}

// ── MAIN ──
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url, query_id } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url richiesto' }, { status: 400 });

    console.log('[planimetria] start:', file_url);

    // Download PDF
    const pdfRes = await fetch(file_url);
    if (!pdfRes.ok) return Response.json({ error: 'Impossibile scaricare il PDF' }, { status: 400 });
    const pdfBytes = new Uint8Array(await pdfRes.arrayBuffer());
    console.log('[planimetria] PDF size:', pdfBytes.length, 'bytes');

    // Estrai content stream
    const streams = await extractContentStreams(pdfBytes);
    console.log('[planimetria] content streams trovati:', streams.length);

    if (streams.length === 0) {
      return Response.json({
        error: 'Nessuna campitura azzurra rilevata — verifica il PDF caricato',
        area_mq: null, method: 'visivo', blue_patches: 0,
      }, { status: 422 });
    }

    // Analisi colori
    const { blueAreaPt2, bluePatchCount, textContent } = analyzeContentStreams(streams);
    console.log(`[planimetria] blue area: ${blueAreaPt2.toFixed(0)} pt², patches: ${bluePatchCount}`);

    if (blueAreaPt2 === 0) {
      return Response.json({
        error: 'Nessuna campitura azzurra rilevata — verifica il PDF caricato',
        area_mq: null, method: 'visivo', blue_patches: 0,
      }, { status: 422 });
    }

    // Scala
    const dec = new TextDecoder('latin1');
    const pdfStr = dec.decode(pdfBytes);
    const scale = detectScaleFromPdf(pdfStr, textContent);
    console.log('[planimetria] scala:', scale);

    // pt² → m²: 1 pt = 25.4/72 mm; a scala 1:S → mm_reali = pt * 25.4/72 * S
    const mmPerPt  = scale * 25.4 / 72;
    const m2PerPt2 = (mmPerPt / 1000) ** 2;
    const areaMq   = Math.round(blueAreaPt2 * m2PerPt2 * 10) / 10;
    console.log('[planimetria] area m²:', areaMq, '(scala 1:' + scale + ')');

    // Salva su DB
    if (query_id) {
      try {
        const queries = await base44.entities.CadastralQuery.filter({ id: query_id });
        const current = queries[0];
        if (current) {
          const updateData = {
            report_data: {
              ...current.report_data,
              superficie_planimetrica_mq: areaMq,
              planimetria_data: {
                ...(current.report_data?.planimetria_data || {}),
                source: 'planimetria_upload', was_uploaded: true,
                superficie_mq: areaMq, method: 'visivo',
                scala: `1:${scale}`, blue_patches: bluePatchCount,
              },
            },
          };
          if (!current.superficie_mq) updateData.superficie_mq = areaMq;
          await base44.entities.CadastralQuery.update(query_id, updateData);
        }
      } catch (e) { console.error('[planimetria] errore DB:', e.message); }
    }

    return Response.json({ area_mq: areaMq, method: 'visivo', scala: `1:${scale}`, blue_patches: bluePatchCount });

  } catch (error) {
    console.error('[planimetria] errore:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});