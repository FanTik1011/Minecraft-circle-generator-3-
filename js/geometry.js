function setZoom(z, cx, cy) {
  const prev = zoom;
  zoom = Math.max(0.08, Math.min(15, z));
  if(cx!=null){ panX = cx-(cx-panX)*(zoom/prev); panY = cy-(cy-panY)*(zoom/prev); }
  syncZ(); draw();
}
function syncZ() {
  const p = Math.round(zoom*100);
  document.getElementById('zp').textContent = p+'%';
  document.getElementById('zl').textContent = p+'%';
  zslider.value = Math.min(600, Math.max(10, p));
}

function getR() { return parseInt(document.getElementById('radius').value); }
function getHR() { return shape==='ellipse' ? parseInt(document.getElementById('hradius').value) : getR(); }

function getLayerRange(type, R, height) {
  if(type === 'cylinder') return [0, height-1];
  if(type === 'dome') return [0, R];
  return [-R, R];
}

function volumeInside(type, R, height, x, y, z) {
  const Rp = R+.5;
  if(type === 'cylinder') return y>=0 && y<height && (x*x+z*z)/(Rp*Rp)<=1;
  if(type === 'dome' && y<0) return false;
  return (x*x+y*y+z*z)/(Rp*Rp)<=1;
}

function genLayerCrossSection(type, R, height, y) {
  const out = [];
  for(let x=-R; x<=R; x++) {
    for(let z=-R; z<=R; z++) {
      if(volumeInside(type, R, height, x, y, z)) out.push([x,z]);
    }
  }
  return out;
}

function genVolume(type, R, height) {
  const [y0,y1] = getLayerRange(type, R, height);
  const out = [];
  for(let y=y0; y<=y1; y++) {
    genLayerCrossSection(type, R, height, y).forEach(([x,z]) => out.push([x,y,z]));
  }
  return out;
}

function genCircle(rx, ry, filled) {
  const out = [];
  for(let y=-ry; y<=ry; y++) {
    for(let x=-rx; x<=rx; x++) {
      if(filled) {
        if(x*x/((rx+.5)*(rx+.5))+y*y/((ry+.5)*(ry+.5))<=1) out.push([x,y]);
      } else {
        const c = [
          (x-.5)/rx,(x+.5)/rx
        ].flatMap(ex=>[(y-.5)/ry,(y+.5)/ry].map(ey=>ex*ex+ey*ey<=1));
        if(c.some(Boolean)&&!c.every(Boolean)) out.push([x,y]);
      }
    }
  }
  return out;
}
