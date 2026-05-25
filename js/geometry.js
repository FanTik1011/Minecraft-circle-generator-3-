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

function genCircle(rx, ry, filled) {
  const out = [];
  for(let y=-ry; y<=ry; y++) {
    for(let x=-rx; x<=rx; x++) {
      if(filled) {
        if((x+.5)*(x+.5)/(rx*rx)+(y+.5)*(y+.5)/(ry*ry)<=1) out.push([x,y]);
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
