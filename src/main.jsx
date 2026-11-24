import React, { useEffect, useRef, useState } from 'react';

import { createRoot } from 'react-dom/client';

import { createClient } from '@supabase/supabase-js';

import { generatePdf, getWhyTreeLayout, PDF_ZONES, PDF_W, PDF_H } from './pdf';

import './style.css';

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;



const url = import.meta.env.VITE_SUPABASE_URL, key = import.meta.env.VITE_SUPABASE_ANON_KEY;

const db = url && key ? createClient(url, key) : null;



const empty = () => ({ id: crypto.randomUUID(), status: 'INITIAL', created_at: new Date().toISOString(), fields: { date: new Date().toISOString().slice(0, 10), machine: '', line: '', pic: '', shift: '', problem: '', action: '', temporary: '', fixed: '', estimation: '', actual: '', next: '' }, tree: { id: crypto.randomUUID(), label: '', children: [] }, images: [], signatures: {} });



const getLocal = () => { try { return JSON.parse(localStorage.getItem('ipi-reports') || '[]') } catch { return [] } };



const title = r => r.fields.problem.trim() || `Untitled IPI - ${r.fields.date}`;



const monthNames = [

  'January', 'February', 'March', 'April', 'May', 'June',

  'July', 'August', 'September', 'October', 'November', 'December',

];



function formatReportDate(value) {

  const parts = String(value || '').split('-');

  const month = Number(parts[1]);



  if (parts.length !== 3 || month < 1 || month > 12) {

    return value || '-';

  }



  return `${Number(parts[2])} ${monthNames[month - 1]} ${parts[0]}`;

}





function Signature({ value, onChange, label }) {

  const ref = useRef(null);

  const active = useRef(false);

  const [mode, setMode] = useState('draw');



  useEffect(() => {

    const canvas = ref.current;

    const ctx = canvas?.getContext('2d');

    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!value) return;

    const image = new Image();

    image.onload = () => ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    image.src = value;

  }, [value, mode]);



  function point(event) {

    const canvas = ref.current;

    const box = canvas.getBoundingClientRect();

    return {

      x: (event.clientX - box.left) * canvas.width / box.width,

      y: (event.clientY - box.top) * canvas.height / box.height,

    };

  }



  function uploadSignature(event) {

    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => onChange(String(reader.result));

    reader.readAsDataURL(file);

  }



  return (

    <div className="sig">

      <strong>{label} Approval</strong>

      <div className="signature-options">

        <button type="button" className={mode === 'draw' ? 'selected' : 'ghost'} onClick={() => setMode('draw')}>

          Draw Online

        </button>

        <button type="button" className={mode === 'upload' ? 'selected' : 'ghost'} onClick={() => setMode('upload')}>

          Upload Image

        </button>

      </div>

      {mode === 'upload' && (

        <label>

          Upload {label} signature (PNG/JPG)

          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadSignature} />

        </label>

      )}

      {mode === 'draw' ? (

        <canvas

          ref={ref}

          width="320"

          height="110"

          onPointerDown={event => {

            active.current = true;

            event.currentTarget.setPointerCapture(event.pointerId);

            const pos = point(event);

            const ctx = ref.current.getContext('2d');

            ctx.beginPath();

            ctx.moveTo(pos.x, pos.y);

          }}

          onPointerMove={event => {

            if (!active.current) return;

            const pos = point(event);

            const ctx = ref.current.getContext('2d');

            ctx.lineWidth = 2;

            ctx.lineCap = 'round';

            ctx.lineTo(pos.x, pos.y);

            ctx.stroke();

          }}

          onPointerUp={() => {

            active.current = false;

            onChange(ref.current.toDataURL('image/png'));

          }}

        />

      ) : (

        <div className="signature-preview">

          {value ? <img src={value} alt={`${label} signature`} /> : <span>No signature uploaded</span>}

        </div>

      )}

      <button type="button" className="ghost" onClick={() => onChange('')}>

        Clear signature

      </button>

    </div>

  );

}



function TreeNode({ node, onUpdate, onRemove, depth = 0 }) {

  return <div className="tree-node" style={{ marginLeft: Math.min(depth, 7) * 16 }}>

    <div className="tree-line">

      <span className="tree-branch">{depth ? '↳' : '●'}</span>

      <input value={node.label} placeholder={depth ? 'Why? / Possible cause' : 'Main problem'} onChange={e => onUpdate({ ...node, label: e.target.value })} />

      <button type="button" className="small" onClick={() => onUpdate({ ...node, children: [...node.children, { id: crypto.randomUUID(), label: '', children: [] }] })}>+ Why</button>{depth > 0 && <button type="button" className="small danger" onClick={onRemove}>×</button>}</div>{node.children.map(ch => <TreeNode key={ch.id} node={ch} depth={depth + 1} onUpdate={next => onUpdate({ ...node, children: node.children.map(x => x.id === ch.id ? next : x) })} onRemove={() => onUpdate({ ...node, children: node.children.filter(x => x.id !== ch.id) })} />)}</div>

}

const imageZones = [['assumption', 'II. Problem Assumption'], ['temporary', 'III. Temporary Action'], ['fixed', 'III. Fixed Action'], ['next', 'IV. Next Action']];



function LayoutEditor({ report, onChange, onClose }) {

  const [selected, setSelected] = useState(report.images[0]?.id || null);



  const [drag, setDrag] = useState(null);



  const board = useRef(null);



  const images = report.images || [];

  const treeLayout = getWhyTreeLayout(report.tree);
  const [showTree, setShowTree] = useState(true);



  const chosen = images.find(i => i.id === selected);



  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));



  const getBox = (item) => {

    const z = PDF_ZONES[item.zone] || PDF_ZONES.assumption;

    const size = clamp(Number(item.size) || 28, 12, Math.min(130, z.w, z.h));

    return { z, size, x: z.x + clamp(Number(item.x) || 0, 0, 100) / 100 * (z.w - size), y: z.top + clamp(Number(item.y) || 0, 0, 100) / 100 * (z.h - size) }

  };



  const update = (id, patch) => onChange(images.map(i => i.id === id ? { ...i, ...patch } : i));



  const toPoint = e => {

    const b = board.current.getBoundingClientRect();

    return { x: (e.clientX - b.left) / b.width * PDF_W, y: (e.clientY - b.top) / b.height * PDF_H }

  };



  const start = (e, item, mode) => {

    e.preventDefault();

    e.stopPropagation();

    setSelected(item.id);

    const p = toPoint(e);

    const b = getBox(item);

    setDrag({ id: item.id, mode, p, box: b, zone: item.zone });

    e.currentTarget.setPointerCapture(e.pointerId)

  };



  const move = e => {

    if (!drag) return;

    const p = toPoint(e), dx = p.x - drag.p.x, dy = p.y - drag.p.y;

    const item = images.find(i => i.id === drag.id);

    if (!item) return;

    const b = drag.box;

    if (drag.mode === 'resize') {

      const size = clamp(b.size + Math.max(dx, dy), 12, Math.min(130, b.z.w - (b.x - b.z.x), b.z.h - (b.y - b.z.top)));



      update(item.id, { size, x: (b.x - b.z.x) / Math.max(1, b.z.w - size) * 100, y: (b.y - b.z.top) / Math.max(1, b.z.h - size) * 100 });



    } else {

      // Drag into a different permitted cell;

      // keep the entire image within the destination.

      const cx = b.x + b.size / 2 + dx, cy = b.y + b.size / 2 + dy;



      const candidate = Object.entries(PDF_ZONES).find(([k, z]) => cx >= z.x && cx <= z.x + z.w && cy >= z.top && cy <= z.top + z.h);



      const zoneName = candidate?.[0] || (PDF_ZONES[drag.zone] ? drag.zone : 'assumption'), z = PDF_ZONES[zoneName], size = Math.min(b.size, z.w, z.h);



      const left = clamp(cx - size / 2, z.x, z.x + z.w - size), top = clamp(cy - size / 2, z.top, z.top + z.h - size);



      update(item.id, { zone: zoneName, size, x: (left - z.x) / Math.max(1, z.w - size) * 100, y: (top - z.top) / Math.max(1, z.h - size) * 100 });



    }

  };



  const close = () => {

    setDrag(null);

    onClose()

  };



  const pct = (n, total) => `${n / total * 100}%`;



  return <div className="overlay layout-overlay" role="dialog" aria-modal="true" aria-label="Edit PDF image layout">

    <div className="layout-dialog">

      <div className="layout-head">

        <div>

          <b>Edit PDF Layout</b>

          <small>Drag photos between allowed cells · Drag bottom-right handle to resize · A4 proportions</small>

        </div>

        <button type="button" onClick={close}>✓ Save Layout</button>

      </div>

      <div className="layout-body">

        <div className="layout-paper-wrap">

          <div className="layout-paper" ref={board} onPointerMove={move} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}>

            <svg viewBox={`0 0 ${PDF_W} ${PDF_H}`} preserveAspectRatio="none" className="layout-paper-svg" aria-hidden="true">

              <rect width={PDF_W} height={PDF_H} fill="white" />

              <rect x="25" y="12" width="545" height="75" fill="none" stroke="#333" />

              <path d="M154 12V87 M25 90H570" stroke="#333" strokeWidth="1" />

              <text x="47" y="38" fontSize="15" fontWeight="bold" fill="#cc2430">PT TMMIN</text>

              <text x="44" y="60" fontSize="9" fontWeight="bold">EPSD SUNTER II</text>

              <text x="32" y="76" fontSize="9">Maintenance Department</text>

              <text x="176" y="37" fontSize="12" fontWeight="bold">INITIAL PROBLEM INFORMATION</text>

              <text x="207" y="68" fontSize="10">{formatReportDate(report.fields.date)} | {report.fields.shift || '-'} Shift</text>

              <rect x="455" y="17" width="108" height="64" fill="white" stroke="#333" />

              <path d="M509 17V81 M455 36H563" stroke="#333" />

              <text x="475" y="31" fontSize="10">SH</text>

              <text x="529" y="31" fontSize="10">GL</text>

              {['sh', 'gl'].map((key, i) => report.signatures?.[key] ? <image key={key} href={report.signatures[key]} x={459 + i * 54} y="40" width="46" height="37" preserveAspectRatio="xMidYMid meet" /> : null)}

              <text x="27" y="104" fontSize="10" fontWeight="bold">I. GENERAL INFORMATION</text>

              {['Hari / tanggal', 'Machine name', 'Line'].map((v, i) => <text key={v} x="27" y={121 + i * 16} fontSize="8.5">{v}</text>)}

              {[report.fields.date, report.fields.machine, report.fields.line].map((v, i) => <text key={`left-value-${i}`} x="136" y={121 + i * 16} fontSize="8.5">{String(v || '').slice(0, 30)}</text>)}

              {[0, 1, 2].map(i => <text key={`left-colon-${i}`} x="119" y={121 + i * 16} fontSize="8.5">:</text>)}

              {['PIC', 'Shift', 'Initial Problem'].map((v, i) => <text key={v} x="345" y={121 + i * 16} fontSize="8.5">{v}</text>)}

              {[report.fields.pic, report.fields.shift, report.fields.problem].map((v, i) => <text key={`right-value-${i}`} x="447" y={121 + i * 16} fontSize="8.5">{String(v || '').slice(0, 23)}</text>)}

              {[0, 1, 2].map(i => <text key={`right-colon-${i}`} x="432" y={121 + i * 16} fontSize="8.5">:</text>)}

              <text x="27" y="181" fontSize="10" fontWeight="bold">II. PROBLEM ANALYSIS &amp;

                ROOTCAUSE</text>

              <rect x="38" y="190" width="519" height="294" fill="none" stroke="#333" strokeWidth=".7" />



              <text x="50" y="208" fontSize="9" fontWeight="bold">Problem Assumption / Why-Why Analysis</text>

              <rect x="411" y="198" width="138" height="54" fill="white" stroke="#333" strokeWidth=".7" />

              <path d="M480 198V252 M411 219H549" stroke="#333" strokeWidth=".7" />

              <text x="416" y="212" fontSize="7">Estimation time</text>

              <text x="488" y="212" fontSize="7">Actual Time</text>

              <text x="420" y="239" fontSize="8">{report.fields.estimation}</text>

              <text x="489" y="239" fontSize="8">{report.fields.actual}</text>

              <text x="27" y="508" fontSize="10" fontWeight="bold">III. ACTION (Problem Countermeasure)</text>

              <rect x="38" y="515" width="519" height="190" fill="none" stroke="#333" strokeWidth=".7" />

              <path d="M297.5 515V705 M38 544H557" stroke="#333" strokeWidth=".7" />

              <text x="95" y="533" fontSize="9">Temporary Action</text>

              <text x="400" y="533" fontSize="9">Fixed Action</text>

              <text x="27" y="729" fontSize="10" fontWeight="bold">IV. NEXT ACTION</text>

              <rect x="38" y="738" width="519" height="90" fill="none" stroke="#333" strokeWidth=".7" />

                            {showTree && treeLayout && (
                  <g aria-label="Why-Why Tree Diagram preview">
                    {treeLayout.lines.map((l, i) => (
                      <line key={`tree-line-${i}`} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]}
                        stroke="#2563eb" strokeWidth="0.85" />
                    ))}
                    {treeLayout.nodes.map(n => (
                      <g key={n.id}>
                        <rect x={n.x} y={n.top} width={n.w} height={n.h}
                          fill="#eff6ff" stroke="#2563eb" strokeWidth="0.8" />
                        <foreignObject x={n.x + 1} y={n.top + 1} width={Math.max(1,n.w-2)} height={Math.max(1,n.h-2)}>
                          <div xmlns="http://www.w3.org/1999/xhtml" style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', fontFamily:'Arial,sans-serif', fontSize:`${Math.max(4.2,Math.min(7.3,n.w/9))}px`, lineHeight:1.05, color:'#1e40af', overflow:'hidden', overflowWrap:'anywhere' }}>{n.label}</div>
                        </foreignObject>
                      </g>
                    ))}
                  </g>
                )}
</svg>

            {Object.entries(PDF_ZONES).map(([key, z]) => <div key={key} className="layout-drop-zone" style={{ left: pct(z.x, PDF_W), top: pct(z.top, PDF_H), width: pct(z.w, PDF_W), height: pct(z.h, PDF_H) }}>

              <span>{key}</span>

            </div>)}

            {images.map(item => {

              const b = getBox(item);

              return <div key={item.id} className={'layout-image ' + (selected === item.id ? 'active' : '')} style={{ left: pct(b.x, PDF_W), top: pct(b.y, PDF_H), width: pct(b.size, PDF_W), height: pct(b.size, PDF_H) }} onPointerDown={e => start(e, item, 'move')}>

                <img src={item.data} alt={item.name} draggable="false" />

                <div className="layout-resize" onPointerDown={e => start(e, item, 'resize')} />

              </div>

            })}

          </div>

        </div>

        <div className="layout-side">

          <h3>Images ({images.length})</h3>
            <label style={{display:'flex',alignItems:'center',gap:8,margin:'10px 0'}}>
              <input type="checkbox" checked={showTree} onChange={e => setShowTree(e.target.checked)} />
              Show Why-Why Tree Diagram guide
            </label>
            <p style={{fontSize:12,color:'#64748b'}}>Blue boxes and connectors are a placement guide. Move photos away from them; photos may cover the diagram in the exported PDF.</p>

          <p>Click an image, drag it to another cell, or resize from the red corner. Touchscreen works too.</p>{images.map(item => <button key={item.id} className={'layout-image-choice ' + (selected === item.id ? 'active' : '')} onClick={() => setSelected(item.id)}>

            <img src={item.data} alt="" />

            <span>{item.name}<small>{item.zone}</small>

            </span>

          </button>)}{chosen && <>

            <label>Selected image section<select value={chosen.zone} onChange={e => update(chosen.id, { zone: e.target.value, x: 35, y: 35 })}>{imageZones.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>

            </label>

            <button type="button" className="danger small" onClick={() => {

              onChange(images.filter(i => i.id !== chosen.id));

              setSelected(null)

            }}>Delete selected image</button>

          </>}<p className="layout-tip">Only images are movable. The Why-Why diagram remains automatically arranged within Problem Assumption. The exported PDF uses the same saved coordinates.</p>

        </div>

      </div>

    </div>

  </div>

}

function PdfCanvasPreview({ src }) {
  const canvasRef = useRef(null);

  const [zoom, setZoom] = useState(100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let loadingTask;
    let renderTask;

    async function renderPdf() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(src);

        if (!response.ok) {
          throw new Error('Failed to load PDF');
        }

        const buffer = await response.arrayBuffer();

        if (cancelled) return;

        loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(buffer)
        });

        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        if (cancelled) return;

        const viewport = page.getViewport({
          scale: 2
        });

        const canvas = document.createElement('canvas');

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        renderTask = page.render({
          canvasContext: canvas.getContext('2d'),
          viewport
        });

        await renderTask.promise;

        if (cancelled) return;

        const target = canvasRef.current;

        target.width = canvas.width;
        target.height = canvas.height;

        target.getContext('2d').drawImage(canvas, 0, 0);

        setLoading(false);

      } catch (err) {
        if (!cancelled) {
          console.error('PDF Preview Error:', err);
          setError(err.message);
          setLoading(false);
        }
      }
    }

    renderPdf();

    return () => {
      cancelled = true;
      renderTask?.cancel();
      loadingTask?.destroy().catch(() => {});
    };

  }, [src]);

  return (
    <div className="pdf-viewer">

      <div className="pdf-toolbar">

        <button
          type="button"
          className="secondary"
          disabled={zoom <= 50}
          onClick={() =>
            setZoom(z => Math.max(50, z - 25))
          }
        >
          −
        </button>

        <span>{zoom}%</span>

        <button
          type="button"
          className="secondary"
          disabled={zoom >= 300}
          onClick={() =>
            setZoom(z => Math.min(300, z + 25))
          }
        >
          +
        </button>

        <button
          type="button"
          className="secondary"
          onClick={() => setZoom(100)}
        >
          Fit to Width
        </button>

      </div>

      <div className="pdf-scroll">

        {loading && (
          <div className="pdf-loading">
            Loading PDF...
          </div>
        )}

        {error && (
          <div className="pdf-loading">
            <p>Unable to preview PDF.</p>
            <small>{error}</small>

            <p>
              <a
                href={src}
                target="_blank"
                rel="noreferrer"
              >
                Open PDF
              </a>
            </p>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="pdf-canvas"
          style={{
            display: loading || error ? 'none' : 'block',
            width: `${zoom}%`,
            height: 'auto',
            maxWidth: 'none'
          }}
        />

      </div>

    </div>
  );
}

function App() {

  const [layoutOpen, setLayoutOpen] = useState(false), [page, setPage] = useState('search'), [menu, setMenu] = useState(false), [report, setReport] = useState(empty), [reports, setReports] = useState([]), [query, setQuery] = useState(''), [dateFilter, setDateFilter] = useState(''), [modal, setModal] = useState(false), [notice, setNotice] = useState(''), [preview, setPreview] = useState(null), [busy, setBusy] = useState(false), [savedSnapshot, setSavedSnapshot] = useState(null), [leaveDialog, setLeaveDialog] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const notify = s => {

    setNotice(s);

    setTimeout(() => setNotice(''), 5000)

  };



  const load = async () => {

    if (db) {

      try {

        const { data, error } = await db.from('ipi_reports').select('*').order('created_at', { ascending: false });

        if (error) throw error;

        setReports(data.map(x => ({ ...x.payload, id: x.id, created_at: x.created_at })));

      } catch (e) { notify('Database error: ' + e.message) }

    } else setReports(getLocal())

  };

  useEffect(() => { load() }, []);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview]);



  const isDirty = page === 'edit' && savedSnapshot !== null && JSON.stringify(report) !== savedSnapshot;



  function requestBack() {

    if (isDirty) {

      setLeaveDialog(true);

    } else {

      setPage('search');

      setMenu(false);

      load();

    }

  }

  function discardAndBack() {

    setLeaveDialog(false);

    setReport(empty());

    setSavedSnapshot(null);

    setPreview(null);

    setPage('search');

    setMenu(false);

    load();

  }

  const field = (name, val) => setReport(r => ({ ...r, fields: { ...r.fields, [name]: val } }));

  const change = (k, v) => setReport(r => ({ ...r, [k]: v }));



  async function save() {

    if (!report.fields.date) {

      notify('Hari / tanggal harus diisi.');

      return

    } setBusy(true);

    try {

      const next = { ...report, updated_at: new Date().toISOString() };

      if (db) {

        const { error } = await db.from('ipi_reports').upsert({ id: next.id, title: title(next), report_date: next.fields.date, status: next.status, payload: next, created_at: next.created_at, updated_at: next.updated_at });

        if (error) throw error;

      } else {

        const all = getLocal().filter(x => x.id !== next.id);

        try { localStorage.setItem('ipi-reports', JSON.stringify([next, ...all])) } catch { throw Error('Browser storage penuh. Kurangi gambar atau sambungkan Supabase.') }

      } setReport(next);

      setSavedSnapshot(JSON.stringify(next));

      await load();

      setModal(true);

      notify('Report saved successfully!')

    } catch (e) { notify('Save failed: ' + e.message) } finally { setBusy(false) }

  }



  async function removeReport(r) {

    if (!r || busy) return;



    setBusy(true);



    try {

      if (db) {

        const { error } = await db

          .from('ipi_reports')

          .delete()

          .eq('id', r.id);



        if (error) throw error;

      } else {

        const remainingReports = getLocal().filter(

          (item) => item.id !== r.id

        );



      localStorage.setItem(

        'ipi-reports',

        JSON.stringify(remainingReports)

      );

    }



    if (report.id === r.id) {

      setReport(empty());

      setSavedSnapshot(null);

      setPreview(null);

    }



    await load();

    setDeleteTarget(null);



    notify('Report deleted successfully.');

  } catch (error) {

    notify('Delete failed: ' + error.message);

  } finally {

    setBusy(false);

  }

}



async function downloadReport(selectedReport) {

  if (busy) return;



  setBusy(true);



  try {

    // Generate PDF dari laporan yang dipilih di Search Reports.

    const blob = await generatePdf(selectedReport);

    const url = URL.createObjectURL(blob);



    const filename = title(selectedReport)

      .replace(/[^a-z0-9-_ ]/gi, '')

      .replace(/\s+/g, '_')

      .slice(0, 60);



    const link = document.createElement('a');



    link.href = url;

    link.download = `IPI_${filename || 'Report'}.pdf`;



    document.body.appendChild(link);

    link.click();

    link.remove();



    setTimeout(() => {

      URL.revokeObjectURL(url);

    }, 30000);

  } catch (error) {

    notify('Download failed: ' + error.message);

  } finally {

    setBusy(false);

  }

}

  async function pdf(download = false) {

    setBusy(true);

    try {

      const blob = await generatePdf(report), object = URL.createObjectURL(blob);

      if (download) {

        const a = document.createElement('a');

        a.href = object;

        a.download = `IPI_${title(report).replace(/[^a-z0-9-_ ]/gi, '').replace(/\s+/g, '_').slice(0, 60)}.pdf`;

        a.click();

        setTimeout(() => URL.revokeObjectURL(object), 30000);

        setModal(false)

      } else {

        if (preview) URL.revokeObjectURL(preview);

        setPreview(object)

      }

    } catch (e) { notify('PDF error: ' + e.message) } finally { setBusy(false) }

  }

  const addImages = async files => {

    for (const file of [...files]) {

      if (!file.type.startsWith('image/')) continue;

      const img = await createImageBitmap(file);

      const canvas = document.createElement('canvas');

      const max = 600, ratio = Math.min(1, max / Math.max(img.width, img.height));

      canvas.width = Math.round(img.width * ratio);

      canvas.height = Math.round(img.height * ratio);

      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

      const data = canvas.toDataURL('image/png');

      setReport(r => ({ ...r, images: [...r.images, { id: crypto.randomUUID(), name: file.name, zone: 'assumption', data, x: 35, y: 45, size: 55 }] }));

      img.close()

    }

  };



  return <>

  {deleteTarget && (

  <div

    className="delete-modal-overlay"

    role="presentation"

    onMouseDown={(event) => {

      if (event.target === event.currentTarget && !busy) {

        setDeleteTarget(null);

      }

    }}

  >

    <div

      className="delete-modal"

      role="alertdialog"

      aria-modal="true"

      aria-labelledby="delete-modal-title"

      aria-describedby="delete-modal-description"

    >

      <div className="delete-modal-icon">🗑</div>



      <h2 id="delete-modal-title">

        Delete Report?

      </h2>



      <p id="delete-modal-description">

        Are you sure you want to delete

        <strong> "{title(deleteTarget)}"</strong>?

      </p>



      <p className="delete-warning">

        This action cannot be undone.

      </p>



      <div className="delete-modal-actions">

        <button

          type="button"

          className="secondary"

          disabled={busy}

          onClick={() => setDeleteTarget(null)}

        >

          Cancel

        </button>



        <button

          type="button"

          className="delete-confirm-button"

          disabled={busy}

          onClick={() => removeReport(deleteTarget)}

        >

          {busy ? 'Deleting...' : 'Delete Report'}

        </button>

      </div>

    </div>

  </div>

)}

    <header>

      <div className="brand">

        <span className="brand-icon">IPI</span>

        <div>

          <b>IPI Report Generator</b>

          <small>PT TMMIN · Maintenance Dept</small>

        </div>

      </div>

      <nav className={menu ? 'open' : ''}>

        <button className={page === 'search' ? 'selected' : ''} onClick={() => {

          if (page === 'edit') { requestBack() } else {

            load();

            setMenu(false)

          }

        }}>Search Reports</button>

        <button className={page === 'edit' ? 'selected' : ''} onClick={() => {

          if (page === 'edit') { setMenu(false) } else {

            const fresh = empty();

            setReport(fresh);

            setSavedSnapshot(JSON.stringify(fresh));

            setPage('edit');

            setMenu(false)

          }

        }}>Create New IPI</button>

      </nav>

      <button className="hamburger" aria-label="Toggle menu" onClick={() => setMenu(!menu)}>{menu ? '✕' : '☰'}</button>

    </header>

    <main>{notice && <div className="notice">{notice}</div>}{page === 'search' ? <>

      <div className="page-title">

        <div>

          <h1>Search & Edit IPI</h1>

          <p>Find a report by Initial Problem title or creation date.</p>

        </div>

        <button onClick={() => {

          const fresh = empty();

          setReport(fresh);

          setSavedSnapshot(JSON.stringify(fresh));

          setPage('edit')

        }}>+ Create New IPI</button>

      </div>

      <div className="panel search-bar">

        <label>Search Initial Problem<input value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. HSB 006 CT Over" />

        </label>

        <label>Created date<input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />

        </label>

      </div>

      <div className="panel">{reports.filter(r => title(r).toLowerCase().includes(query.toLowerCase()) && (!dateFilter || r.created_at.slice(0, 10) === dateFilter)).map(r => <div className="report-row" key={r.id}>

        <div>

          <b>{title(r)}</b>

          <small>Created {new Date(r.created_at).toLocaleDateString('id-ID')} · Report date {r.fields.date}</small>

        </div>

        <span className={'status ' + r.status.toLowerCase()}>{r.status}</span>

        <button className="secondary" onClick={() => {

          setReport(r);

          setSavedSnapshot(JSON.stringify(r));

          setPage('edit')

        }}>Edit</button>

        <button

  type="button"

  className="secondary"

  disabled={busy}

  onClick={() => downloadReport(r)}

>

  Download

</button>

        <button

  className="secondary report-delete-button"

  disabled={busy}

  onClick={() => setDeleteTarget(r)}

>

  Delete

</button>

      </div>)}{!reports.length && <p>No reports yet. Create your first IPI.</p>}</div>

    </> : <>

      <div className="editor-back-bar">

        <button type="button" className="secondary" onClick={requestBack}>← Back to Search Reports</button>

      </div>

      <div className="page-title">

        <div>

          <h1>{reports.some(r => r.id === report.id) ? 'Edit Initial Problem Information' : 'Create Initial Problem Information'}</h1>

          <p>Original TMMIN template · A4 PDF · All fields optional except report date.</p>

        </div>

        <span className={'status ' + report.status.toLowerCase()}>{report.status}</span>

      </div>

      <div className="editor-grid">

        <div className="form-area">

          <section className="panel">

            <h2>I. GENERAL INFORMATION</h2>

            <div className="fields two">

              <label>Hari / Tanggal <em>*</em>

                <input type="date" value={report.fields.date} onChange={e => field('date', e.target.value)} />

              </label>

              <label>Machine Name<input value={report.fields.machine} onChange={e => field('machine', e.target.value)} placeholder="Machine name" />

              </label>

              <label>Line<input value={report.fields.line} onChange={e => field('line', e.target.value)} placeholder="Line" />

              </label>

              <label>PIC<input value={report.fields.pic} onChange={e => field('pic', e.target.value)} placeholder="PIC" />

              </label>

              <label>Shift<input value={report.fields.shift} onChange={e => field('shift', e.target.value)} placeholder="Shift" />

              </label>

              <label className="wide">Initial Problem (automatic report title)<textarea rows="2" value={report.fields.problem} onChange={e => field('problem', e.target.value)} placeholder="Describe the initial problem" />

              </label>

            </div>

            <div className="hint">Report title: <b>{title(report)}</b>

            </div>

          </section>

          <section className="panel">

            <h2>II. PROBLEM ANALYSIS & ROOTCAUSE</h2>

            <h3>Problem Assumption · Why-Why Tree</h3>

            <p className="subtext">Start with the main problem, then add as many Why branches as needed.</p>

            <TreeNode node={report.tree} onUpdate={v => change('tree', v)} />



          </section>

          <section className="panel">

            <h2>III. ACTION (Problem Countermeasure)</h2>

            <div className="fields two">

              <label>Temporary Action<textarea rows="4" value={report.fields.temporary} onChange={e => field('temporary', e.target.value)} />

              </label>

              <label>Fixed Action<textarea rows="4" value={report.fields.fixed} onChange={e => field('fixed', e.target.value)} />

              </label>

            </div>

            <h3>TIME (shown in Section II)</h3>

            <div className="fields two">

              <label>Estimation<input value={report.fields.estimation} onChange={e => field('estimation', e.target.value)} placeholder="e.g. 30 min" />

              </label>

              <label>Actual<input value={report.fields.actual} onChange={e => field('actual', e.target.value)} placeholder="e.g. 45 min" />

              </label>

            </div>

          </section>

          <section className="panel">

            <h2>IV. NEXT ACTION</h2>

            <textarea rows="4" value={report.fields.next} onChange={e => field('next', e.target.value)} />

          </section>

          <section className="panel">

            <h2>IMAGE ATTACHMENTS</h2>

            <p className="subtext">Upload photos, then use <b>Edit PDF Layout</b> to drag, drop and resize them directly on the A4 page. No sliders needed.</p>

            <input type="file" accept="image/*" multiple onChange={e => {

              addImages(e.target.files);

              e.target.value = ''

            }} />{report.images.length > 0 && <>

              <div className="image-gallery">{report.images.map(img => <div className="gallery-item" key={img.id}>

                <img src={img.data} alt={img.name} />

                <div className="gallery-name" title={img.name}>{img.name}</div>

                <button type="button" className="small danger" onClick={() => change('images', report.images.filter(x => x.id !== img.id))}>Remove</button>

              </div>)}</div>

              <button type="button" className="full" onClick={() => setLayoutOpen(true)}>✥ Edit PDF Layout (Drag & Resize)</button>

            </>}</section>

          <section className="panel">

            <h2>APPROVAL SIGNATURE</h2>

            <div className="fields two">

              <Signature label="SH" value={report.signatures.sh} onChange={v => change('signatures', { ...report.signatures, sh: v })} />

              <Signature label="GL" value={report.signatures.gl} onChange={v => change('signatures', { ...report.signatures, gl: v })} />

            </div>

          </section>

        </div>

        <aside className="sidebar">

          <section className="panel">

            <h2>REPORT SETTINGS</h2>

            <label>Status (manual)<select value={report.status} onChange={e => change('status', e.target.value)}>

              <option>INITIAL</option>

              <option>FINAL</option>

            </select>

            </label>

            <p className="subtext">INITIAL reports can be saved and exported even with blank fields.</p>

            <button className="full" disabled={busy} onClick={save}>{busy ? 'Please wait...' : 'Save Report'}</button>

            <button className="full secondary" disabled={busy} onClick={() => pdf(false)}>Preview PDF</button>

            <button className="full ghost" disabled={busy} onClick={() => pdf(true)}>Export PDF without saving</button>

            <button className="full ghost" onClick={() => {

              setReport(empty());

              setSavedSnapshot(null);

              setPreview(null)

            }}>+ New Blank Report</button>

          </section>

          

        </aside>

      </div>

    </>}{layoutOpen && <LayoutEditor report={report} onChange={images => change('images', images)} onClose={() => setLayoutOpen(false)} />} {preview && <div className="overlay" onClick={() => setPreview(null)}>

      <div className="preview-modal" onClick={e => e.stopPropagation()}>

        <div className="modal-header">

          <b>A4 PDF Preview</b>

          <button className="ghost" onClick={() => setPreview(null)}>Close ✕</button>

        </div>

        <PdfCanvasPreview src={preview} />

        <button onClick={() => pdf(true)}>Download Latest PDF</button>

      </div>

    </div>}{leaveDialog && <div className="overlay" role="dialog" aria-modal="true">

      <div className="dialog">

        <h2>Unsaved Changes</h2>

        <p>There are changes that have not been saved. Return to Search Reports?</p>

        <div className="dialog-actions">

          <button className="secondary" onClick={() => setLeaveDialog(false)}>Stay</button>

          <button className="danger" onClick={discardAndBack}>Discard &amp;

            Back</button>

          <button disabled={busy} onClick={async () => {

            await save();

            setLeaveDialog(false);

          }}>Save Report</button>

        </div>

      </div>

    </div>}{modal && <div className="overlay">

      <div className="dialog">

        <div className="check">✓</div>

        <h2>Report saved successfully!</h2>

        <p>Do you want to export the latest PDF now?</p>

        <div className="dialog-actions">

          <button

  className="secondary"

  onClick={() => {

    setModal(false);

    setPage('search');

    setMenu(false);

    load();

  }}

>

  Later

</button>

          <button onClick={() => pdf(true)}>Yes, Export PDF</button>

        </div>

      </div>

    </div>}</main>

  </>

}

createRoot(document.getElementById('root')).render(<App />);


