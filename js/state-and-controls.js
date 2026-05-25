let lightBg = false;
document.getElementById('themeToggle').onclick = () => {
  lightBg = !lightBg;
  document.body.classList.toggle('light-bg', lightBg);
  draw();
};

let shape = 'circle';
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
['radius','hradius'].forEach(id => {
  document.getElementById(id).addEventListener('input', e => {
    document.getElementById(id==='radius'?'rv':'hrv').textContent = e.target.value;
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

function snap() { return {c: new Map(customBlocks), e: new Set(customErased)} }
function pushU(s) { undoStack.push(s); if(undoStack.length>80) undoStack.shift(); redoStack=[]; updateUndoRedo(); }
document.getElementById('undoBtn').onclick = () => {
  if(!undoStack.length) return;
  redoStack.push(snap()); const s = undoStack.pop();
  customBlocks = new Map(s.c); customErased = new Set(s.e); draw(); updateUndoRedo();
};
document.getElementById('redoBtn').onclick = () => {
  if(!redoStack.length) return;
  undoStack.push(snap()); const s = redoStack.pop();
  customBlocks = new Map(s.c); customErased = new Set(s.e); draw(); updateUndoRedo();
};
document.getElementById('clearBtn').onclick = () => {
  pushU(snap()); customBlocks.clear(); customErased.clear(); draw();
};

const zslider = document.getElementById('zslider');
zslider.addEventListener('input', e => { setZoom(parseInt(e.target.value)/100); });
document.getElementById('zin').onclick = () => setZoom(zoom*1.25);
document.getElementById('zout').onclick = () => setZoom(zoom/1.25);
document.getElementById('zreset').onclick = () => resetView();
