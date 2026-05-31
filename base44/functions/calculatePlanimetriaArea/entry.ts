import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Jimp from 'npm:jimp@0.22.12';
import { Buffer } from 'node:buffer';

// Short-side dimensions per format (mm)
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
    if (!imgRes.ok) return Response.json({ error: "Impossibile scaricare l'immagine" }, { status: 400 });
    const arrayBuf = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    // Load with Jimp, resize to max 1200px on long side for performance
    let image = await Jimp.read(buffer);
    const MAX_PX = 1200;
    if (image.getWidth() > MAX_PX || image.getHeight() > MAX_PX) {
      image = image.scaleToFit(MAX_PX, MAX_PX);
    }
    image.greyscale();

    const width = image.getWidth();
    const height = image.getHeight();
    const bitmapData = image.bitmap.data; // Uint8Array/Buffer, 4 bytes per pixel (RGBA)

    console.log(`Image processed: ${width}x${height}px, format: ${formato}`);

    // mm per pixel using the short side of the image = short side of paper
    const shortSidePx = Math.min(width, height);
    const mmPerPx = paperShortMm / shortSidePx;
    const realMmPerPx = mmPerPx * 200; // 1:200 scale

    // Build grayscale flat array (1 byte per pixel)
    const total = width * height;
    const gray = new Uint8Array(total);
    for (let i = 0; i < total; i++) {
      gray[i] = bitmapData[i * 4]; // R channel (same as G=B after greyscale)
    }

    // Threshold: >= 220 = white background candidate
    const THRESHOLD = 220;
    const isWhite = new Uint8Array(total);
    for (let i = 0; i < total; i++) {
      isWhite[i] = gray[i] >= THRESHOLD ? 1 : 0;
    }

    // BFS flood fill from all edges to identify exterior background
    const exterior = new Uint8Array(total);
    const queue = new Int32Array(total); // pre-allocated queue
    let qHead = 0, qTail = 0;

    const seed = (idx) => {
      if (isWhite[idx] && !exterior[idx]) {
        exterior[idx] = 1;
        queue[qTail++] = idx;
      }
    };

    // Seed from all edge pixels
    for (let x = 0; x < width; x++) {
      seed(x);
      seed((height - 1) * width + x);
    }
    for (let y = 1; y < height - 1; y++) {
      seed(y * width);
      seed(y * width + width - 1);
    }

    while (qHead < qTail) {
      const idx = queue[qHead++];
      const x = idx % width;
      const y = (idx - x) / width;
      if (x > 0)          seed(idx - 1);
      if (x < width - 1)  seed(idx + 1);
      if (y > 0)          seed(idx - width);
      if (y < height - 1) seed(idx + width);
    }

    // Count non-exterior pixels = floor plan interior
    let interiorPx = 0;
    for (let i = 0; i < total; i++) {
      if (!exterior[i]) interiorPx++;
    }

    // Convert to m²
    const areaM2 = interiorPx * Math.pow(realMmPerPx / 1000, 2);
    const superficieMq = Math.round(areaM2 * 10) / 10;

    console.log(`Interior pixels: ${interiorPx}/${total}, area: ${superficieMq} m²`);

    return Response.json({
      superficie_mq: superficieMq,
      formato,
      scala: '1:200',
      disclaimer: "Stima automatica ±5% — basata sul formato foglio selezionato dall'utente",
    });
  } catch (error) {
    console.error('calculatePlanimetriaArea error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});