canvas.addEventListener('mousedown', e => {
  if(e.button===1||(e.button===0&&spaceDown)||tool==='pan') {
    isPanning=true; panStart={x:e.clientX,y:e.clientY,px:panX,py:panY};
    cw.style.cursor='grabbing'; return;
  }
  if(e.button===0&&(tool==='paint'||tool==='erase')) {
    isPainting=true; lastKey=null; lastPaintCell=null; strokeSnapshot=snap(); strokeChanged=false;
    paintMode = tool==='erase'?'remove':'add';
    const [sx,sy] = getPos(e); paintAt(sx,sy);
  }
});
canvas.addEventListener('mousemove', e => {
  const [sx,sy] = getPos(e);
  const [bx,by] = s2w(sx,sy);
  const changedHover = !hoverCell || hoverCell[0] !== bx || hoverCell[1] !== by;
  hoverCell = [bx, by];
  cbEl.textContent = `x: ${bx}  z: ${by}`; cbEl.style.opacity='1';
  if(isPanning) { panX=panStart.px+(e.clientX-panStart.x); panY=panStart.py+(e.clientY-panStart.y); draw(); return; }
  if(isPainting) paintAt(sx,sy);
  else if(changedHover) draw();
});
function endStroke() {
  isPainting=false; lastKey=null; lastPaintCell=null; strokeSnapshot=null; strokeChanged=false;
}

canvas.addEventListener('mouseup', () => { endStroke(); isPanning=false; cw.style.cursor=tool==='pan'?'grab':'crosshair'; draw(); });
canvas.addEventListener('mouseleave', () => { cbEl.style.opacity='0'; hoverCell=null; endStroke(); draw(); });
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const [sx,sy] = getPos(e);
  setZoom(zoom*(e.deltaY<0?1.12:1/1.12),sx,sy);
}, {passive:false});

canvas.addEventListener('touchstart', e => { if(e.touches.length===1){isPainting=true;lastKey=null;lastPaintCell=null;strokeSnapshot=snap();strokeChanged=false;paintMode='add';const [sx,sy]=getPos(e);paintAt(sx,sy);} }, {passive:true});
canvas.addEventListener('touchmove', e => { if(e.touches.length===1&&isPainting){const [sx,sy]=getPos(e);paintAt(sx,sy);} }, {passive:true});
canvas.addEventListener('touchend', () => { endStroke(); });

document.addEventListener('keydown', e => {
  if((e.ctrlKey||e.metaKey)&&e.key==='z'&&!e.shiftKey){e.preventDefault();document.getElementById('undoBtn').click()}
  if((e.ctrlKey||e.metaKey)&&(e.key==='y'||(e.key==='z'&&e.shiftKey))){e.preventDefault();document.getElementById('redoBtn').click()}
  if(e.code==='Space'&&!spaceDown){spaceDown=true;cw.style.cursor='grab'}
});
document.addEventListener('keyup', e => { if(e.code==='Space'){spaceDown=false;cw.style.cursor=tool==='pan'?'grab':'crosshair';} });

const sideToggle = document.getElementById('sideToggle');
sideToggle.addEventListener('click', () => {
  sidebarOpen = !sidebarOpen;
  document.querySelector('.app').classList.toggle('sidebar-closed', !sidebarOpen);
  sideToggle.textContent = sidebarOpen ? 'v' : '^';
  sideToggle.title = sidebarOpen ? 'Close panel' : 'Open panel';
  setTimeout(draw, 230);
});
