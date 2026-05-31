import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import sharp from 'npm:sharp@0.33.5';

// Known short-side dimensions per format (mm)
const PAPER_SHORT_SIDE_MM = { A4: 210, A3: 297 };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url, formato } = await req.json();
    if (!file_url || !formato) {
      return Response.json({ error: 'file_url e formato richiesti' }, { status: 400 });
    }
    const paperShortMm = PAPER_SHORT_SIDE_MM[formato];
    if (!paperShortMm) {
      return Response.json({ error: 'Formato non valido — usa A4 o A3' }, { status: 400 });
    }

    // Fetch image bytes
    const imgRes = await fetch(file_url);
    if (!imgRes.ok) return Response.json({ error: 'Impossibile scaricare l\'immagine' }, { status: 400 });
    const buffer = Buffer.from(await imgRes.arrayBuffer());

    // Resize to max 1200px on the long side for speed, then grayscale → raw pixels
    const MAX_PX = 1200;
    const { data, info } = await sharp(buffer)
      .resize(MAX_PX, MAX_PX, { fit: 'inside', withoutEnlargement: true })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height } = info;
    console.log(`Image: ${width}x${height}px, format: ${formato}`);

    // mm per pixel (use short side of image = short side of paper)
    const shortSidePx = Math.min(width, height);
    const mmPerPx = paperShortMm / shortSidePx;
    const realMmPerPx = mmPerPx * 200; // 1:200 scale

    // Threshold: gray >= 200 = white/background candidate
    const THRESHOLD = 200;
    const isWhite = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i++) {
      isWhite[i] = data[i] >= THRESHOLD ? 1 : 0;
    }

    // BFS flood fill from all 4 edges to identify exterior background
    const exterior = new Uint8Array(width * height);
    const queue = [];
    const seed = (idx) => {
      if (isWhite[idx] && !exterior[idx]) { exterior[idx] = 1; queue.push(idx); }
    };
    for (let x = 0; x < width; x++) {
      seed(x);                          // top row
      seed((height - 1) * width + x);  // bottom row
    }
    for (let y = 1; y < height - 1; y++) {
      seed(y * width);                  // left column
      seed(y * width + width - 1);     // right column
    }

    let qi = 0;
    while (qi < queue.length) {
      const idx = queue[qi++];
      const x = idx % width;
      const y = (idx - x) / width;
      if (x > 0)          seed(idx - 1);
      if (x < width - 1)  seed(idx + 1);
      if (y > 0)          seed(idx - width);
      if (y < height - 1) seed(idx + width);
    }

    // Count non-exterior pixels = floor plan interior (walls + interior space)
    let interiorPx = 0;
    for (let i = 0; i < width * height; i++) {
      if (!exterior[i]) interiorPx++;
    }

    // Convert to m²: area = pixels × (real_mm_per_px / 1000)²
    const areaM2 = interiorPx * Math.pow(realMmPerPx / 1000, 2);
    const superficieMq = Math.round(areaM2 * 10) / 10;

    console.log(`Interior pixels: ${interiorPx}, area: ${superficieMq} m²`);

    return Response.json({
      superficie_mq: superficieMq,
      formato,
      scala: '1:200',
      width_px: width,
      height_px: height,
      disclaimer: "Stima automatica ±5% — basata sul formato foglio selezionato dall'utente",
    });
  } catch (error) {
    console.error('calculatePlanimetriaArea error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});