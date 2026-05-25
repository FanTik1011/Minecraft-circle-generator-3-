let circleBlock = 0; 
let selColor = 0;   

function buildBlockPalette(containerId, selectedIndex, onSelect) {
  const palEl = document.getElementById(containerId);
  BLOCKS.forEach((b, i) => {
    const d = document.createElement('div');
    d.className = 'sw' + (i === selectedIndex ? ' sel' : '');
    d.title = b.name;
    const c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    c.getContext('2d').drawImage(blockCanvases[i], 0, 0);
    d.appendChild(c);
    d.onclick = () => {
      onSelect(i, b.name);
      palEl.querySelectorAll('.sw').forEach((s,j) => s.className = 'sw' + (j===i?' sel':''));
      draw();
    };
    palEl.appendChild(d);
  });
}

buildBlockPalette('basePal', circleBlock, (i, name) => {
  circleBlock = i;
  document.getElementById('baseBlockName').textContent = name;
  closeBaseBlockPopup();
});

buildBlockPalette('paintPal', selColor, (i, name) => {
  selColor = i;
  document.getElementById('paintBlockName').textContent = name;
});


BLOCKS.forEach((b, i) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const oc = document.createElement('canvas');
    oc.width = 16; oc.height = 16;
    const octx = oc.getContext('2d');
    octx.imageSmoothingEnabled = false;
    octx.drawImage(img, 0, 0, 16, 16);
    blockCanvases[i] = oc;

    ['basePal', 'paintPal'].forEach(id => {
      const swatch = document.getElementById(id).children[i];
      if (!swatch) return;
      const pc = swatch.querySelector('canvas').getContext('2d');
      pc.imageSmoothingEnabled = false;
      pc.clearRect(0,0,16,16);
      pc.drawImage(oc,0,0);
    });
    draw();
  };
  img.src = MC_ASSET_BASE + b.file;
});

const baseBlockPicker = document.getElementById('baseBlockPicker');
const baseBlockPopup = document.getElementById('baseBlockPopup');
const baseBlockClose = document.getElementById('baseBlockClose');

function openBaseBlockPopup() {
  baseBlockPopup.classList.add('open');
  baseBlockPopup.setAttribute('aria-hidden', 'false');
}

function closeBaseBlockPopup() {
  baseBlockPopup.classList.remove('open');
  baseBlockPopup.setAttribute('aria-hidden', 'true');
}

baseBlockPicker.addEventListener('click', e => {
  e.stopPropagation();
  baseBlockPopup.classList.toggle('open');
  baseBlockPopup.setAttribute('aria-hidden', baseBlockPopup.classList.contains('open') ? 'false' : 'true');
});

baseBlockClose.addEventListener('click', closeBaseBlockPopup);
baseBlockPopup.addEventListener('click', e => e.stopPropagation());
document.addEventListener('click', closeBaseBlockPopup);
document.addEventListener('keydown', e => {
  if(e.key === 'Escape') closeBaseBlockPopup();
});
