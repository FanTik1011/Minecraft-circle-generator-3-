const canvas = document.getElementById('mc');
const ctx = canvas.getContext('2d');
const cw = document.getElementById('cw');
const cbEl = document.getElementById('cb');

function w2s(wx, wy) { const c=cs(); return [panX+wx*c, panY+wy*c]; }
function s2w(sx, sy) { const c=cs(); return [Math.floor((sx-panX)/c), Math.floor((sy-panY)/c)]; }


const pop2dAnims = new Map();
let pop2dRAF = null;
const POP_DURATION_2D = 200;
function ensure2dAnimLoop() {
  if(pop2dRAF) return;
  const step = () => {
    draw();
    const now = performance.now();
    pop2dAnims.forEach((t,k) => { if(now-t >= POP_DURATION_2D) pop2dAnims.delete(k); });
    pop2dRAF = pop2dAnims.size > 0 ? requestAnimationFrame(step) : null;
  };
  pop2dRAF = requestAnimationFrame(step);
}

const patternCache = new Map();
function getPattern(idx, cellSize) {
  const key = idx + '_' + cellSize;
  if(patternCache.has(key)) return patternCache.get(key);
  const tmp = document.createElement('canvas');
  tmp.width = cellSize; tmp.height = cellSize;
  const tc = tmp.getContext('2d');
  tc.imageSmoothingEnabled = false;
  tc.drawImage(blockCanvases[idx], 0, 0, cellSize, cellSize);
  const pat = ctx.createPattern(tmp, 'no-repeat');
  patternCache.set(key, pat);
  return pat;
}

function draw() {
  const W = cw.clientWidth, H = cw.clientHeight;
  canvas.width = W; canvas.height = H;
  const rx = getR(), ry = getHR(), filled = shape === 'filled';
  const quarter = document.getElementById('quarterMode').checked;
  const showGrid = document.getElementById('showGrid').checked;
  const showCenter = document.getElementById('showCenter').checked;
  const showCoords = document.getElementById('showCoords').checked;
  const c = cs();


  ctx.fillStyle = lightBg ? '#f5f5f5' : '#0a0a0c';
  ctx.fillRect(0,0,W,H);


  const ds = Math.max(8, 40*zoom);
  ctx.fillStyle = lightBg ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.022)';
  const ox = (panX%ds+ds)%ds, oy = (panY%ds+ds)%ds;
  for(let x=ox-ds; x<W+ds; x+=ds)
    for(let y=oy-ds; y<H+ds; y+=ds) {
      ctx.beginPath(); ctx.arc(x,y,.8,0,Math.PI*2); ctx.fill();
    }

  const genBlocks = viewMode === '3d'
    ? genLayerCrossSection(shape3d, rx, cylHeight, currentLayer)
    : genCircle(rx, ry, filled);
  const genSet = new Set(genBlocks.map(([x,y]) => x+','+y));

  const {blocks: activeBlocks, erased: activeErased} = activeMaps();
  const allKeys = new Set();
  genBlocks.forEach(([x,y]) => { const k=x+','+y; if(!activeErased.has(k)) allKeys.add(k); });
  activeBlocks.forEach((_,k) => allKeys.add(k));


  if(showGrid && c >= 3) {
   
    const gridAlpha = lightBg
      ? Math.min(0.22, 0.05 + c*0.012)
      : Math.min(0.28, 0.06 + c*0.014);
    ctx.strokeStyle = lightBg
      ? `rgba(0,0,0,${gridAlpha})`
      : `rgba(255,255,255,${gridAlpha})`;
    ctx.lineWidth = 0.8;
    const bx0 = Math.floor(-panX/c)-1, bx1 = Math.ceil((W-panX)/c)+1;
    const by0 = Math.floor(-panY/c)-1, by1 = Math.ceil((H-panY)/c)+1;
    ctx.beginPath();
    for(let bx=bx0; bx<=bx1; bx++) {
      const sx = panX+bx*c;
      ctx.moveTo(sx,0); ctx.lineTo(sx,H);
    }
    for(let by=by0; by<=by1; by++) {
      const sy = panY+by*c;
      ctx.moveTo(0,sy); ctx.lineTo(W,sy);
    }
    ctx.stroke();
  }


  allKeys.forEach(k => {
    const [bx,by] = k.split(',').map(Number);
    if(quarter && (bx<0 || by<0)) return;
    const [sx,sy] = w2s(bx,by);
    if(sx+c<0||sx>W||sy+c<0||sy>H) return;
    const ci = activeBlocks.has(k) ? activeBlocks.get(k) : circleBlock;

    ctx.save();
    ctx.translate(sx, sy);
    if(pop2dAnims.has(k)) {
      const t = (performance.now()-pop2dAnims.get(k))/POP_DURATION_2D;
      const s = easeOutBack(t);
      ctx.translate(c/2, c/2); ctx.scale(s, s); ctx.translate(-c/2, -c/2);
    }

    if(c >= 6) {

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(blockCanvases[ci], 0, 0, c, c);
      
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = Math.max(0.5, c * 0.055);
      ctx.strokeRect(0.5, 0.5, c-1, c-1);
    
      if(c >= 10) {
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(1,1,c*0.38,c*0.16);
      }
    } else {
    
      ctx.fillStyle = BLOCKS[ci].pal[0];
      ctx.fillRect(0,0,c,c);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(0.5,0.5,c-1,c-1);
    }
    ctx.restore();

    if(showCoords && c >= 22) {
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.font = `${Math.max(7,c*.24)}px 'Space Mono',monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(bx+','+by, sx+c/2, sy+c/2);
    }
  });


  if(showCenter) {
    const [cx2,cy2] = w2s(0,0);
    const arm = Math.max(8, c*1.3);
    ctx.strokeStyle = 'rgba(240,80,80,.8)'; ctx.lineWidth = 1.5;
    ctx.setLineDash([4,3]);
    ctx.beginPath(); ctx.moveTo(cx2-arm,cy2+c/2); ctx.lineTo(cx2+c+arm,cy2+c/2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx2+c/2,cy2-arm); ctx.lineTo(cx2+c/2,cy2+c+arm); ctx.stroke();
    ctx.setLineDash([]);
  }

 
  if(hoverCell && !isPanning) {
    const [hx, hy] = hoverCell;
    if(!quarter || (hx >= 0 && hy >= 0)) {
      const [hsx, hsy] = w2s(hx, hy);
      if(hsx+c>=0 && hsx<=W && hsy+c>=0 && hsy<=H) {
        const markerBlock = tool === 'erase' ? null : selColor;
        ctx.save();
        ctx.translate(hsx, hsy);
        if(markerBlock !== null && c >= 6) {
          ctx.globalAlpha = 0.42;
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(blockCanvases[markerBlock], 0, 0, c, c);
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = tool === 'erase' ? 'rgba(224,90,90,.20)' : 'rgba(118,217,126,.18)';
          ctx.fillRect(0,0,c,c);
        }
        ctx.shadowColor = tool === 'erase' ? 'rgba(224,90,90,.95)' : 'rgba(118,217,126,.95)';
        ctx.shadowBlur = Math.max(8, c * 0.55);
        ctx.strokeStyle = tool === 'erase' ? '#ff6b6b' : '#76d97e';
        ctx.lineWidth = Math.max(2, Math.min(4, c * 0.12));
        ctx.strokeRect(1,1,c-2,c-2);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,.92)';
        ctx.lineWidth = 1;
        ctx.strokeRect(4,4,Math.max(0,c-8),Math.max(0,c-8));
        if(c >= 14) {
          ctx.strokeStyle = tool === 'erase'
            ? 'rgba(255,120,120,.95)'
            : 'rgba(255,255,255,.98)';

          ctx.lineWidth = Math.max(1.5, c * 0.045);

          const center = c / 2;
          const size = c * 0.24;

          ctx.beginPath();

          ctx.moveTo(center, center - size);
          ctx.lineTo(center, center + size);

          ctx.moveTo(center - size, center);
          ctx.lineTo(center + size, center);

          ctx.stroke();

          ctx.beginPath();
          ctx.arc(center, center, Math.max(1.5, c * 0.05), 0, Math.PI * 2);
          ctx.fillStyle = tool === 'erase'
            ? 'rgba(255,120,120,.98)'
            : 'rgba(255,255,255,.98)';
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  const vis = quarter
    ? [...allKeys].filter(k => { const [x,y]=k.split(',').map(Number); return x>=0&&y>=0; }).length
    : allKeys.size;

  if(viewMode === '3d') {
    volumeBlockCount = countFullVolumeBlocks();
    document.getElementById('hb').textContent = volumeBlockCount.toLocaleString();
    document.getElementById('hd').textContent = (rx*2+1)+(shape3d==='cylinder'?' × h'+cylHeight:'');
    document.getElementById('ha').textContent = Math.round(
      shape3d==='cylinder' ? Math.PI*rx*rx*cylHeight :
      shape3d==='dome' ? (2/3)*Math.PI*rx*rx*rx :
      (4/3)*Math.PI*rx*rx*rx
    ).toLocaleString();
    document.getElementById('hp').textContent = Math.round(
      shape3d==='cylinder' ? 2*Math.PI*rx*(rx+cylHeight) :
      shape3d==='dome' ? 3*Math.PI*rx*rx :
      4*Math.PI*rx*rx
    ).toLocaleString();
  } else {
    document.getElementById('hb').textContent = vis.toLocaleString();
    document.getElementById('hd').textContent = (rx*2+1)+(shape==='ellipse'?'×'+(ry*2+1):'');
    document.getElementById('ha').textContent = Math.round(Math.PI*rx*ry).toLocaleString();
    document.getElementById('hp').textContent = Math.round(2*Math.PI*Math.sqrt((rx*rx+ry*ry)/2)).toLocaleString();
  }
}

function resetView() {
  const rx = getR(), ry = getHR(), maxR = Math.max(rx,ry);
  const W = cw.clientWidth, H = cw.clientHeight;
  const total = (maxR+3)*2;
  const cellW = Math.floor(W/total), cellH = Math.floor(H/total);
  const cell = Math.max(3, Math.min(cellW,cellH));
  zoom = cell/BASE;
  const c = cs();
  panX = Math.round(W/2-c/2);
  panY = Math.round(H/2-c/2);
  syncZ();
}

function getPos(e) {
  const r = canvas.getBoundingClientRect();
  const t = e.touches ? e.touches[0] : e;
  return [t.clientX-r.left, t.clientY-r.top];
}

function cellsBetween(x0, y0, x1, y1) {
  const cells = [];
  let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;

  while (true) {
    cells.push([x0, y0]);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }

  return cells;
}

function paintCell(bx, by) {
  const k = bx+','+by;
  if(k === lastKey) return false;
  lastKey = k;
  const {blocks: activeBlocks, erased: activeErased} = activeMaps();
  const mirrors = getSymmetryMirrors(bx, by);
  const changed = mirrors.some(mk => {
    if(paintMode === 'add') return activeBlocks.get(mk) !== selColor || activeErased.has(mk);
    return activeBlocks.has(mk) || !activeErased.has(mk);
  });
  if(!changed) return false;

  if(!strokeChanged) {
    pushU(strokeSnapshot || snap());
    strokeChanged = true;
  }

  mirrors.forEach(mk => {
    if(paintMode === 'add') {
      activeBlocks.set(mk, selColor);
      activeErased.delete(mk);
      pop2dAnims.set(mk, performance.now());
    } else {
      activeBlocks.delete(mk);
      activeErased.add(mk);
    }
  });
  if(paintMode === 'add') ensure2dAnimLoop();
  if(viewMode === '3d') dirty3d = true;
  return changed;
}

function paintAt(sx, sy) {
  const [bx,by] = s2w(sx,sy);
  const cells = lastPaintCell
    ? cellsBetween(lastPaintCell[0], lastPaintCell[1], bx, by)
    : [[bx, by]];

  let changed = false;
  cells.forEach(([cx, cy]) => {
    if(paintCell(cx, cy)) changed = true;
  });

  lastPaintCell = [bx, by];
  if(!changed) return;
  draw();
}
