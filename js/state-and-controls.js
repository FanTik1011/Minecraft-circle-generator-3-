function easeOutBack(t) {
  const c1 = 1.70158, c3 = c1 + 1;
  t = Math.min(1, Math.max(0, t));
  return 1 + c3*Math.pow(t-1,3) + c1*Math.pow(t-1,2);
}

let lightBg = false;
document.getElementById('themeToggle').onclick = () => {
  lightBg = !lightBg;
  document.body.classList.toggle('light-bg', lightBg);
  if(typeof updateSceneBackground3d === 'function') updateSceneBackground3d();
  draw();
};

let shape = 'circle';
let viewMode = '2d';
let shape3d = 'sphere';
let cylHeight = 20;
let currentLayer = 0;
let layerBlocks = new Map();
let layerErased = new Map();
let dirty3d = true;
let volumeBlockCount = 0;
let tool = 'paint';
let zoom = 1;
const BASE = 14;
const cs = () => Math.max(2, Math.round(BASE * zoom));
let panX = 0, panY = 0;
let hoverCell = null;
let sidebarOpen = true;
let spaceDown = false, isPanning = false, isPainting = false, paintMode = 'add';
let panStart = {x:0,y:0,px:0,py:0};
let customBlocks = new Map();
let customErased = new Set();
let undoStack = [], redoStack = [];
let lastKey = null;
let lastPaintCell = null;
let strokeSnapshot = null;
let strokeChanged = false;

function getLayerMaps(y) {
  if(!layerBlocks.has(y)) layerBlocks.set(y, new Map());
  if(!layerErased.has(y)) layerErased.set(y, new Set());
  return {blocks: layerBlocks.get(y), erased: layerErased.get(y)};
}
function computeFullVolumeBlocks() {
  const R = getR();
  const map = new Map();
  const [y0,y1] = getLayerRange(shape3d, R, cylHeight);
  const ys = new Set(layerBlocks.keys());
  for(let y=y0; y<=y1; y++) ys.add(y);
  ys.forEach(y => {
    const base = (y>=y0 && y<=y1) ? genLayerCrossSection(shape3d, R, cylHeight, y) : [];
    const {blocks, erased} = getLayerMaps(y);
    base.forEach(([x,z]) => {
      const k2 = x+','+z;
      if(erased.has(k2)) return;
      map.set(x+','+y+','+z, blocks.has(k2) ? blocks.get(k2) : circleBlock);
    });
    blocks.forEach((blockIdx, k2) => {
      const [x,z] = k2.split(',').map(Number);
      map.set(x+','+y+','+z, blockIdx);
    });
  });
  return map;
}

function cloneLayerMaps() {
  const blocks = new Map();
  layerBlocks.forEach((m,y) => blocks.set(y, new Map(m)));
  const erased = new Map();
  layerErased.forEach((s,y) => erased.set(y, new Set(s)));
  return {type:'full', blocks, erased};
}
function restoreLayerMaps(s) {
  layerBlocks = new Map();
  s.blocks.forEach((m,y) => layerBlocks.set(y, new Map(m)));
  layerErased = new Map();
  s.erased.forEach((set,y) => layerErased.set(y, new Set(set)));
}

function activeMaps() {
  return viewMode === '3d' ? getLayerMaps(currentLayer) : {blocks: customBlocks, erased: customErased};
}
function setActiveMaps(blocks, erased) {
  if(viewMode === '3d') { layerBlocks.set(currentLayer, blocks); layerErased.set(currentLayer, erased); }
  else { customBlocks = blocks; customErased = erased; }
}

function getSymmetryMirrors(bx, by) {
  const sx = document.getElementById('symX').checked;
  const sy = document.getElementById('symY').checked;
  const s4 = document.getElementById('sym4').checked;

  const mx = -bx;
  const my = -by;

  const pts = new Set();
  pts.add(`${bx},${by}`);

  if (sx || s4) pts.add(`${mx},${by}`);
  if (sy || s4) pts.add(`${bx},${my}`);
  if (s4 || (sx && sy)) pts.add(`${mx},${my}`);

  return [...pts];
}

function updateUndoRedo() {
  document.getElementById('undoBtn').disabled = undoStack.length === 0;
  document.getElementById('redoBtn').disabled = redoStack.length === 0;
}

document.querySelectorAll('#shape-seg button').forEach(b => {
  b.onclick = () => {
    shape = b.dataset.shape;
    document.querySelectorAll('#shape-seg button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    document.getElementById('ry-ctrl').style.display = shape === 'ellipse' ? '' : 'none';
    resetView(); draw();
  };
});
function updateLayerSlider() {
  const [y0,y1] = getLayerRange(shape3d, getR(), cylHeight);
  const sl = document.getElementById('layerSlider');
  sl.min = y0; sl.max = y1;
  currentLayer = Math.min(y1, Math.max(y0, currentLayer));
  sl.value = currentLayer;
  document.getElementById('lyv').textContent = currentLayer;
  volumeBlockCount = genVolume(shape3d, getR(), cylHeight).length;
}

document.querySelectorAll('#mode-seg button').forEach(b => {
  b.onclick = () => {
    viewMode = b.dataset.mode;
    document.querySelectorAll('#mode-seg button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    document.getElementById('shape-seg').style.display = viewMode === '3d' ? 'none' : '';
    document.getElementById('shape-seg-3d').style.display = viewMode === '3d' ? '' : 'none';
    document.getElementById('ry-ctrl').style.display = viewMode === '2d' && shape === 'ellipse' ? '' : 'none';
    document.getElementById('height-ctrl').style.display = viewMode === '3d' && shape3d === 'cylinder' ? '' : 'none';
    document.getElementById('layer-ctrl').style.display = viewMode === '3d' ? '' : 'none';
    document.getElementById('mc').style.display = viewMode === '3d' ? 'none' : '';
    document.getElementById('mc3d').style.display = viewMode === '3d' ? '' : 'none';
    document.getElementById('viewportVignette').classList.toggle('active', viewMode === '3d');
    document.getElementById('ctrlHints3d').classList.toggle('active', viewMode === '3d');
    if(viewMode === '3d') { updateLayerSlider(); show3D(); } else { hide3D(); }
    dirty3d = true;
    resetView(); draw();
  };
});
document.querySelectorAll('#shape-seg-3d button').forEach(b => {
  b.onclick = () => {
    shape3d = b.dataset.shape3d;
    document.querySelectorAll('#shape-seg-3d button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    document.getElementById('height-ctrl').style.display = shape3d === 'cylinder' ? '' : 'none';
    updateLayerSlider(); dirty3d = true; frameCamera3d(); draw();
  };
});
document.getElementById('cylHeight').addEventListener('input', e => {
  cylHeight = parseInt(e.target.value);
  document.getElementById('chv').textContent = cylHeight;
  updateLayerSlider(); dirty3d = true; frameCamera3d(); draw();
});
document.getElementById('layerSlider').addEventListener('input', e => {
  currentLayer = parseInt(e.target.value);
  document.getElementById('lyv').textContent = currentLayer;
  draw();
});
['radius','hradius'].forEach(id => {
  document.getElementById(id).addEventListener('input', e => {
    document.getElementById(id==='radius'?'rv':'hrv').textContent = e.target.value;
    if(viewMode === '3d') { updateLayerSlider(); frameCamera3d(); }
    dirty3d = true;
    resetView(); draw();
  });
});
['showGrid','showCenter','quarterMode','showCoords','symX','symY','sym4'].forEach(id =>
  document.getElementById(id).addEventListener('change', () => {
 
    draw();
  })
);
document.querySelectorAll('.tb[data-tool]').forEach(b => {
  b.onclick = () => {
    tool = b.dataset.tool;
    document.querySelectorAll('.tb[data-tool]').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    const modeLabel = document.getElementById('ml');
    if (modeLabel) modeLabel.textContent = tool.charAt(0).toUpperCase()+tool.slice(1);
    cw.style.cursor = tool === 'pan' ? 'grab' : 'crosshair';
  };
});

function snap() { const {blocks,erased} = activeMaps(); return {c: new Map(blocks), e: new Set(erased)} }
function pushU(s) { undoStack.push(s); if(undoStack.length>80) undoStack.shift(); redoStack=[]; updateUndoRedo(); }
function applySnapshot(s) {
  if(s.type === 'full') restoreLayerMaps(s);
  else setActiveMaps(new Map(s.c), new Set(s.e));
}
document.getElementById('undoBtn').onclick = () => {
  if(!undoStack.length) return;
  const s = undoStack.pop();
  redoStack.push(s.type === 'full' ? cloneLayerMaps() : snap());
  applySnapshot(s); dirty3d=true; draw(); updateUndoRedo();
};
document.getElementById('redoBtn').onclick = () => {
  if(!redoStack.length) return;
  const s = redoStack.pop();
  undoStack.push(s.type === 'full' ? cloneLayerMaps() : snap());
  applySnapshot(s); dirty3d=true; draw(); updateUndoRedo();
};
document.getElementById('clearBtn').onclick = () => {
  pushU(snap()); const {blocks,erased} = activeMaps(); blocks.clear(); erased.clear(); dirty3d=true; draw();
};

const zslider = document.getElementById('zslider');
zslider.addEventListener('input', e => { setZoom(parseInt(e.target.value)/100); });
document.getElementById('zin').onclick = () => setZoom(zoom*1.25);
document.getElementById('zout').onclick = () => setZoom(zoom/1.25);
document.getElementById('zreset').onclick = () => resetView();
