document.getElementById('dlBtn').addEventListener('click', () => {
  if(viewMode === '3d') {
    if(typeof rebuild3d === 'function' && dirty3d) {
      rebuild3d();
      dirty3d = false;
    }
    if(renderer3d && scene3d && camera3d) renderer3d.render(scene3d, camera3d);
    const shape_ = shape3d;
    const r_ = getR() + (shape3d === 'cylinder' ? 'xh' + cylHeight : '');
    const a = document.createElement('a');
    a.download = `mcircle_${shape_}_r${r_}_3d.png`;
    a.href = mc3d.toDataURL('image/png');
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }

  const rx = getR(), ry = getHR();
  const quarter = document.getElementById('quarterMode').checked;
  const showGrid = document.getElementById('showGrid').checked;
  const showCenter = document.getElementById('showCenter').checked;
  const showCoords = document.getElementById('showCoords').checked;

  const filled_ = shape === 'filled';
  const genBlocks_ = genCircle(rx, ry, filled_);
  const allKeys = new Set();
  genBlocks_.forEach(([x,y]) => { const k=x+','+y; if(!customErased.has(k)) allKeys.add(k); });
  customBlocks.forEach((_,k) => allKeys.add(k));

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  allKeys.forEach(k => {
    const [bx, by] = k.split(',').map(Number);
    if (quarter && (bx < 0 || by < 0)) return;
    if (bx < minX) minX = bx; if (bx > maxX) maxX = bx;
    if (by < minY) minY = by; if (by > maxY) maxY = by;
  });

  const pad = 2;
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;

  const CELL = 14;
  const W = (maxX - minX + 1) * CELL;
  const H = (maxY - minY + 1) * CELL;

  const oc = document.createElement('canvas');
  oc.width = W; oc.height = H;
  const ctx = oc.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = lightBg ? '#f5f5f5' : '#0a0a0c';
  ctx.fillRect(0, 0, W, H);

  if (showGrid) {
    ctx.strokeStyle = lightBg ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5;
    for (let gx = minX; gx <= maxX + 1; gx++) {
      const px = (gx - minX) * CELL;
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
    }
    for (let gy = minY; gy <= maxY + 1; gy++) {
      const py = (gy - minY) * CELL;
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke();
    }
  }

  allKeys.forEach(k => {
    const [bx, by] = k.split(',').map(Number);
    if (quarter && (bx < 0 || by < 0)) return;
    if (bx < minX || bx > maxX || by < minY || by > maxY) return;
    const ci = customBlocks.has(k) ? customBlocks.get(k) : circleBlock;
    const sx = (bx - minX) * CELL, sy = (by - minY) * CELL;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.drawImage(blockCanvases[ci], 0, 0, CELL, CELL);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = Math.max(0.5, CELL * 0.055);
    ctx.strokeRect(0.5, 0.5, CELL - 1, CELL - 1);
    if (CELL >= 10) {
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(1, 1, CELL * 0.38, CELL * 0.16);
    }
    ctx.restore();
    if (showCoords && CELL >= 22) {
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.font = `${Math.max(7, CELL * .24)}px 'Space Mono',monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(bx + ',' + by, sx + CELL / 2, sy + CELL / 2);
    }
  });

  if (showCenter) {
    const cx2 = (0 - minX) * CELL + CELL / 2;
    const cy2 = (0 - minY) * CELL + CELL / 2;
    const arm = CELL * 1.8;
    ctx.strokeStyle = 'rgba(240,80,80,.8)'; ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(cx2 - arm, cy2); ctx.lineTo(cx2 + arm, cy2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx2, cy2 - arm); ctx.lineTo(cx2, cy2 + arm); ctx.stroke();
    ctx.setLineDash([]);
  }

  const shape_ = shape, r_ = rx + (shape === 'ellipse' ? 'x' + ry : '');
  const a = document.createElement('a');
  a.download = `mcircle_${shape_}_r${r_}.png`;
  a.href = oc.toDataURL('image/png');
  document.body.appendChild(a);
  a.click();
  a.remove();
});
