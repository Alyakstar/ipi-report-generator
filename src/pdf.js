import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Original TMMIN document structure, redrawn cleanly on a true A4 page.
export const PDF_W = 595.28, PDF_H = 841.89;
const PW = PDF_W, PH = PDF_H;
export const PDF_ZONES = {
  assumption: { x: 47, top: 272, w: 500, h: 208 },
  temporary: { x: 47, top: 552, w: 232, h: 143 },
  fixed: { x: 300, top: 552, w: 247, h: 143 },
  next: { x: 47, top: 750, w: 500, h: 68 },
};
const ink = rgb(0.09, 0.10, 0.12), muted = rgb(0.30, 0.33, 0.38);
const red = rgb(0.82, 0.12, 0.14), white = rgb(1, 1, 1), lineColor = rgb(0.20, 0.22, 0.25);
const dataString = x => String(x ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/[^\x20-\x7E]/g, '?');

export async function generatePdf(data = {}) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PW, PH]);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const f = data.fields || {};
  const Y = t => PH - t;
  const rect = (x, top, w, h, opts = {}) => page.drawRectangle({ x, y: Y(top + h), width: w, height: h, borderColor: opts.border || lineColor, borderWidth: opts.stroke ?? 0.65, color: opts.fill || white });
  const stroke = (x1, t1, x2, t2, width = 0.65) => page.drawLine({ start: { x: x1, y: Y(t1) }, end: { x: x2, y: Y(t2) }, thickness: width, color: lineColor });
  const txt = (s, x, top, size = 9, font = regular, color = ink) => { const value = dataString(s); if (!value.trim()) return; page.drawText(value, { x, y: Y(top + size), size, font, color }); };
  const measure = (s, font, size) => font.widthOfTextAtSize(dataString(s), size);
  function wrap(s, font, size, width) { const out = []; for (const para of String(s ?? '').split('\n')) { if (!para.trim()) { out.push(''); continue; } let row = ''; for (const word of dataString(para).split(/\s+/).filter(Boolean)) { let trial = row ? row + ' ' + word : word; if (measure(trial, font, size) <= width) { row = trial; continue; } if (row) { out.push(row); row = ''; } if (measure(word, font, size) <= width) { row = word; continue; } let chunk = ''; for (const c of word) { if (chunk && measure(chunk + c, font, size) > width) { out.push(chunk); chunk = ''; } chunk += c; } row = chunk; } out.push(row); } return out; }
  function fitText(value, x, top, w, h, preferred = 9, min = 5.5, options = {}) {
    if (!String(value ?? '').trim()) return;
    const font = options.bold ? bold : regular, pad = options.pad ?? 0;
    let size = preferred, lines = [];
    while (size >= min) { lines = wrap(value, font, size, Math.max(3, w - pad * 2)); if (lines.length * size * 1.24 <= h - pad * 2) break; size -= 0.25; }
    size = Math.max(min, size); lines = wrap(value, font, size, Math.max(3, w - pad * 2));
    const maxLines = Math.max(1, Math.floor((h - pad * 2) / (size * 1.24)));
    // Avoid drawing outside the designated cell; never overlap a neighbor.
    if (lines.length > maxLines) { lines = lines.slice(0, maxLines); const last = lines.length - 1; while (lines[last].length && measure(lines[last] + '...', font, size) > w - pad * 2) lines[last] = lines[last].slice(0, -1); lines[last] += '...'; }
    lines.forEach((s, i) => { let xx = x + pad; if (options.center) xx = x + (w - measure(s, font, size)) / 2; txt(s, xx, top + pad + i * size * 1.24, size, font); });
  }
  function section(s, y) { txt(s, 27, y, 9.6, bold); }
  async function loadImage(src) { if (!src) return null; try { const response = await fetch(src); if (!response.ok) return null; const bytes = new Uint8Array(await response.arrayBuffer()); if (/^data:image\/jpe?g/i.test(src)) return await doc.embedJpg(bytes); if (/^data:image\/png/i.test(src)) return await doc.embedPng(bytes); if (typeof document === 'undefined') return null; const bitmap = await createImageBitmap(new Blob([bytes])); const canvas = document.createElement('canvas'); canvas.width = Math.min(bitmap.width, 900); canvas.height = Math.round(bitmap.height * canvas.width / bitmap.width); canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close(); const png = canvas.toDataURL('image/png'); const b = new Uint8Array(await (await fetch(png)).arrayBuffer()); return await doc.embedPng(b); } catch (e) { console.warn('Could not embed image', e); return null; } }
  function drawContain(img, x, top, w, h) { const dims = img.scaleToFit(w, h); page.drawImage(img, { x: x + (w - dims.width) / 2, y: Y(top + h) + (h - dims.height) / 2, width: dims.width, height: dims.height }); }

  // Boxed Daily Report-style header, adapted for Initial Problem Information.
  rect(25, 12, 545, 75, { stroke: 1.15 });
  stroke(154, 12, 154, 87, 1);
  txt('PT TMMIN', 47, 23, 15, bold, red);
  txt('EPSD SUNTER II', 44, 48, 9.5, bold);
  txt('Maintenance Department', 32, 63, 9, bold);
  fitText('INITIAL PROBLEM INFORMATION', 166, 21, 285, 23, 15, 11, { center: true, bold: true });
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const dateParts = String(f.date || '').split('-');
  const headerDate = dateParts.length === 3 && Number(dateParts[1]) >= 1 && Number(dateParts[1]) <= 12
    ? `${Number(dateParts[2])} ${monthNames[Number(dateParts[1]) - 1]} ${dateParts[0]}`
    : (f.date || '-');
  fitText(`${headerDate}  |  ${f.shift || '-'} Shift`, 175, 52, 262, 17, 10.5, 8, { center: true, bold: true });
  // Both approval cells remain in the header; accept uploaded or drawn signatures.
  const sigX = 455, sigY = 17, sigW = 54, sigH = 64;
  for (const [i, k] of ['sh', 'gl'].entries()) {
    const x = sigX + i * sigW;
    rect(x, sigY, sigW, sigH);
    stroke(x, sigY + 19, x + sigW, sigY + 19);
    fitText(k.toUpperCase(), x, sigY + 3, sigW, 14, 10, 9, { center: true });
    const image = await loadImage(data.signatures?.[k]);
    if (image) drawContain(image, x + 3, sigY + 23, sigW - 6, sigH - 27);
  }
  stroke(25, 90, 570, 90, 1.3);

  // I. GENERAL INFORMATION
  section('I.', 94);
  txt('GENERAL INFORMATION', 38, 94, 10, bold);
  const infoLeft = [['Hari / tanggal', f.date], ['Machine name', f.machine], ['Line', f.line]];
  const infoRight = [['PIC', f.pic], ['Shift', f.shift], ['Initial Problem', f.problem]];
  for (let i = 0; i < 3; i++) {
    const t = 111 + i * 16;
    txt(infoLeft[i][0], 38, t, 8.5); txt(':', 119, t, 8.5);
    fitText(infoLeft[i][1], 136, t, 194, 15, 8.6, 7);
    txt(infoRight[i][0], 345, t, 8.5); txt(':', 432, t, 8.5);
    fitText(infoRight[i][1], 447, t, 120, 15, 8.6, 6.5);
  }

  // II. ANALYSIS: one full-width Why-Why diagram, except the TIME box.
  section('II. PROBLEM ANALYSIS & ROOTCAUSE', 170);
  const ax = 38, ay = 190, aw = 519, ah = 294;
  rect(ax, ay, aw, ah);
  txt('Problem Assumption / Why-Why Analysis', 50, 198, 9, bold);
  stroke(50, 211, 232, 211, 0.7);

  const zones = PDF_ZONES;
  const images = (data.images || []).filter(x => x && x.data);
  async function drawImages(zoneName) {
    const z = zones[zoneName];
    if (!z) return;
    const arr = images.filter(i => i.zone === zoneName || (zoneName === 'assumption' && i.zone === 'action'));
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      const image = await loadImage(item.data);
      if (!image) continue;
      const size = Math.max(12, Math.min(130, Number(item.size) || 28));
      const side = Math.min(size, z.w, z.h);
      const px = Number.isFinite(Number(item.x)) ? Number(item.x) : 35;
      const py = Number.isFinite(Number(item.y)) ? Number(item.y) : 70;
      const x = z.x + Math.max(0, Math.min(100, px)) / 100 * (z.w - side);
      const top = z.top + Math.max(0, Math.min(100, py)) / 100 * (z.h - side);
      drawContain(image, x, top, side, side);
    }
  }
  // Time summary occupies the upper-right corner of Section II.
  const tx = 411, ty = 198, tw = 138, th = 54;
  rect(tx, ty, tw, th);
  stroke(tx + tw / 2, ty, tx + tw / 2, ty + th);
  stroke(tx, ty + 21, tx + tw, ty + 21);
  fitText('Estimation time', tx + 2, ty + 4, tw / 2 - 4, 14, 7.2, 6, { center: true });
  fitText('Actual Time', tx + tw / 2 + 2, ty + 4, tw / 2 - 4, 14, 7.2, 6, { center: true });
  fitText(f.estimation, tx + 3, ty + 27, tw / 2 - 6, 19, 9, 6, { center: true });
  fitText(f.actual, tx + tw / 2 + 3, ty + 27, tw / 2 - 6, 19, 9, 6, { center: true });

  // Bounded TOP-DOWN tree. Every box and connector stays inside the left cell.
  const root = data.tree || { label: '', children: [] };
  const valid = n => n && (String(n.label || '').trim() || (n.children || []).some(valid));
  if (valid(root)) {
    let leaves = 0, maxDepth = 0;
    function build(n, depth = 0) {
      maxDepth = Math.max(maxDepth, depth);
      const kids = (n.children || []).filter(valid).map(k => build(k, depth + 1));
      const node = { label: String(n.label || 'Why?'), depth, kids, x: 0 };
      if (!kids.length) node.leaf = leaves++;
      return node;
    }
    const tree = build(root);
    function assign(n) { if (!n.kids.length) n.x = n.leaf; else { n.kids.forEach(assign); n.x = (n.kids[0].x + n.kids[n.kids.length - 1].x) / 2; } }
    assign(tree);
    const area = { x: 49, top: 268, w: 496, h: 195 };
    const rowGap = maxDepth ? Math.min(58, (area.h - 28) / maxDepth) : 0;
    const slot = area.w / Math.max(1, leaves);
    const bw = Math.max(3, Math.min(94, slot - 5));
    const bh = Math.max(4, Math.min(26, maxDepth ? rowGap * .42 : 26));
    const cx = n => area.x + (n.x + .5) * slot;
    const cy = n => area.top + bh / 2 + n.depth * rowGap;
    const edges = n => {
      if (n.kids.length) {
        const parentBottom = cy(n) + bh / 2;
        const childTop = cy(n.kids[0]) - bh / 2;
        const junction = (parentBottom + childTop) / 2;
        stroke(cx(n), parentBottom, cx(n), junction, .6);
        const centers = n.kids.map(cx);
        stroke(Math.min(cx(n), ...centers), junction, Math.max(cx(n), ...centers), junction, .6);
        for (const ch of n.kids) { stroke(cx(ch), junction, cx(ch), cy(ch) - bh / 2, .6); edges(ch); }
      }
    };
    const boxes = n => {
      const x = cx(n) - bw / 2, t = cy(n) - bh / 2;
      rect(x, t, bw, bh, { stroke: .6 });
      fitText(n.label, x + 2, t + 1, bw - 4, bh - 2, Math.min(7.3, bw / 9), 4.2, { center: true });
      n.kids.forEach(boxes);
    };
    edges(tree); boxes(tree);
  }
  await drawImages('assumption');

  // III. ACTION
  section('III. ACTION (Problem Countermeasure)', 497);
  const rx = 38, ry = 515, rw = 519, rh = 190, half = rw / 2;
  rect(rx, ry, rw, rh); stroke(rx + half, ry, rx + half, ry + rh); stroke(rx, ry + 29, rx + rw, ry + 29);
  fitText('Temporary Action', rx, ry + 7, half, 16, 9, 8, { center: true, bold: true });
  fitText('Fixed Action', rx + half, ry + 7, half, 16, 9, 8, { center: true, bold: true });
  fitText(f.temporary, rx + 9, ry + 37, half - 18, 86, 9, 6.2);
  fitText(f.fixed, rx + half + 9, ry + 37, half - 18, 86, 9, 6.2);
  await drawImages('temporary'); await drawImages('fixed');

  // IV. NEXT ACTION
  section('IV. NEXT ACTION', 718);
  rect(38, 738, 519, 90);
  fitText(f.next, 48, 746, 498, 45, 9, 6.4);
  await drawImages('next');

  return new Blob([await doc.save()], { type: 'application/pdf' });
}
