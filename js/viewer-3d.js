const mc3d = document.getElementById('mc3d');

let renderer3d = null, scene3d = null, camera3d = null;
let boxGeo3d = null;
const materialCache3d = new Map();
let meshes3d = [];
let rafId3d = null;
let resizeObs3d = null;

let camTarget3d = {x:0, y:0, z:0};
let camPos3d = {x:0, y:0, z:0};
let camDist3d = 40, camTheta3d = 0.7, camPhi3d = 1.1;
let isDragging3d = false, isPanning3d = false, lastX3d = 0, lastY3d = 0;
let camAnim3d = null, cameraInitialized3d = false;

function lerp3d(a, b, t) { return a + (b-a)*t; }

function animateCameraTo3d(target, dist, theta, phi, duration) {
  setMinecraftCameraPose3d(target, dist, theta, phi);
  cameraInitialized3d = true;
  camAnim3d = null;
  return;
  if(!cameraInitialized3d) {
    camTarget3d = target; camDist3d = dist; camTheta3d = theta; camPhi3d = phi;
    updateCamera3d();
    cameraInitialized3d = true;
    camAnim3d = null;
    return;
  }
  camAnim3d = {
    fromTarget: {x:camTarget3d.x, y:camTarget3d.y, z:camTarget3d.z}, toTarget: target,
    fromDist: camDist3d, toDist: dist,
    fromTheta: camTheta3d, toTheta: theta,
    fromPhi: camPhi3d, toPhi: phi,
    start: performance.now(), duration: duration || 450
  };
}

function tickCameraAnim3d() {
  if(!camAnim3d) return;
  const a = camAnim3d;
  const t = Math.min(1, (performance.now()-a.start)/a.duration);
  const e = 1 - Math.pow(1-t, 3);
  camTarget3d = {
    x: lerp3d(a.fromTarget.x, a.toTarget.x, e),
    y: lerp3d(a.fromTarget.y, a.toTarget.y, e),
    z: lerp3d(a.fromTarget.z, a.toTarget.z, e)
  };
  camDist3d = lerp3d(a.fromDist, a.toDist, e);
  camTheta3d = lerp3d(a.fromTheta, a.toTheta, e);
  camPhi3d = lerp3d(a.fromPhi, a.toPhi, e);
  updateCamera3d();
  if(t >= 1) camAnim3d = null;
}

function setMinecraftCameraPose3d(target, dist, theta, phi) {
  camTarget3d = {x: target.x, y: target.y, z: target.z};
  camDist3d = dist;
  camPos3d = {
    x: target.x + dist*Math.sin(phi)*Math.sin(theta),
    y: target.y + dist*Math.cos(phi),
    z: target.z + dist*Math.sin(phi)*Math.cos(theta)
  };
  lookAtTargetMinecraft3d(target);
}

function lookAtTargetMinecraft3d(target) {
  const dx = target.x - camPos3d.x;
  const dy = target.y - camPos3d.y;
  const dz = target.z - camPos3d.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  camPhi3d = Math.asin(dy / len);
  camTheta3d = Math.atan2(-dx, -dz);
  updateCamera3d();
}

const keysDown3d = new Set();
let lastFrameTime3d = performance.now();

function isTypingTarget3d() {
  const el = document.activeElement;
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
}

function focusMinecraftCanvas3d() {
  if(!mc3d) return;
  try { mc3d.focus({preventScroll: true}); }
  catch (_) { try { mc3d.focus(); } catch (_) {} }
}

function handleKeyDown3d(e) {
  if(viewMode !== '3d' || isTypingTarget3d()) return;
  if(e.ctrlKey || e.altKey || e.metaKey) return;
  if(e.code === 'Backspace') {
    keysDown3d.clear();
    if(document.pointerLockElement === mc3d && document.exitPointerLock) document.exitPointerLock();
    e.preventDefault();
    return;
  }
  if(['KeyW','KeyA','KeyS','KeyD','KeyQ','Space','ShiftLeft','ShiftRight'].includes(e.code)) {
    keysDown3d.add(e.code);
    e.preventDefault();
  }
}

function handleKeyUp3d(e) {
  keysDown3d.delete(e.code);
  if(e.code === 'ControlLeft' || e.code === 'ControlRight' || e.code === 'AltLeft' || e.code === 'AltRight' || e.code === 'MetaLeft' || e.code === 'MetaRight') {
    keysDown3d.clear();
  }
}

window.addEventListener('keydown', handleKeyDown3d, true);
window.addEventListener('keyup', handleKeyUp3d, true);
window.addEventListener('blur', () => keysDown3d.clear());

function updateFlyCamera3d(dt) {
  if(!keysDown3d.size) return;
  const speed = Math.max(5, Math.min(80, camDist3d * 0.55)) * dt;
  const fx = -Math.sin(camTheta3d), fz = -Math.cos(camTheta3d);
  const rx = Math.cos(camTheta3d), rz = -Math.sin(camTheta3d);
  let mx = 0, mz = 0, my = 0;
  if(keysDown3d.has('KeyW')) { mx += fx; mz += fz; }
  if(keysDown3d.has('KeyS')) { mx -= fx; mz -= fz; }
  if(keysDown3d.has('KeyD')) { mx += rx; mz += rz; }
  if(keysDown3d.has('KeyA')) { mx -= rx; mz -= rz; }
  if(keysDown3d.has('Space')) my += 1;
  if(keysDown3d.has('KeyQ')) my -= 1;
  if(!mx && !mz && !my) return;
  const len = Math.hypot(mx, mz) || 1;
  const boost = keysDown3d.has('ShiftLeft') || keysDown3d.has('ShiftRight') ? 2.25 : 1;
  camAnim3d = null;
  camPos3d.x += (mx/len) * speed * boost;
  camPos3d.z += (mz/len) * speed * boost;
  camPos3d.y += my * speed * boost;
  camTarget3d.x = camPos3d.x;
  camTarget3d.y = camPos3d.y;
  camTarget3d.z = camPos3d.z;
  updateCamera3d();
}

let warnEl3d = null;

let axesHelper3d = null, gridHelper3d = null, groundPlane3d = null, shadowBlob3d = null, layerGuide3d = null;
let gridY3d = 0;
const raycaster3d = new THREE.Raycaster();
const pointerNDC3d = new THREE.Vector2();

let isPaintDragging3d = false, paintMode3d = 'add';
let pointerX3d = 0, pointerY3d = 0;
let pointerMoved3d = false;
let hoverActive3d = false;
let hoverBoxMesh3d = null;
let lastPaintKey3d = null;
let strokeSnapshot3d = null, strokeChanged3d = false;
let strokeRaycastMeshes3d = null;

const popAnimations3d = new Map();
const POP_DURATION_3D = 220;

function pickVoxel3d(clientX, clientY) {
  const rect = mc3d.getBoundingClientRect();
  if(document.pointerLockElement === mc3d) {
    pointerNDC3d.set(0, 0);
  } else {
    pointerNDC3d.x = ((clientX-rect.left)/rect.width)*2-1;
    pointerNDC3d.y = -(((clientY-rect.top)/rect.height)*2-1);
  }
  raycaster3d.setFromCamera(pointerNDC3d, camera3d);
  const targets = (strokeRaycastMeshes3d || meshes3d).concat(groundPlane3d ? [groundPlane3d] : []);
  const hits = raycaster3d.intersectObjects(targets);
  if(!hits.length) return null;
  const hit = hits[0];
  if(hit.object === groundPlane3d) {
    const [y0] = getLayerRange(shape3d, getR(), cylHeight);
    return {ground: true, x: Math.round(hit.point.x), y: y0, z: Math.round(hit.point.z), nx:0, ny:1, nz:0};
  }
  const positions = hit.object.userData.positions;
  const [x,y,z] = positions[hit.instanceId];
  const n = hit.face.normal;
  return {ground: false, x, y, z, nx: Math.round(n.x), ny: Math.round(n.y), nz: Math.round(n.z)};
}

function makeCornerMarkerGeometry3d(size, arm) {
  const half = size / 2;
  const points = [];
  [-1, 1].forEach(x => {
    [-1, 1].forEach(y => {
      [-1, 1].forEach(z => {
        const px = x * half, py = y * half, pz = z * half;
        points.push(new THREE.Vector3(px, py, pz), new THREE.Vector3(px - x * arm, py, pz));
        points.push(new THREE.Vector3(px, py, pz), new THREE.Vector3(px, py - y * arm, pz));
        points.push(new THREE.Vector3(px, py, pz), new THREE.Vector3(px, py, pz - z * arm));
      });
    });
  });
  return new THREE.BufferGeometry().setFromPoints(points);
}

function ensureHoverBox3d() {
  if(hoverBoxMesh3d) return hoverBoxMesh3d;
  const group = new THREE.Group();

  const fill = new THREE.Mesh(
    new THREE.BoxGeometry(1.01, 1.01, 1.01),
    new THREE.MeshBasicMaterial({
      color: 0x5cff8b,
      transparent: true,
      opacity: 0.12,
      depthTest: false,
      depthWrite: false
    })
  );
  fill.renderOrder = 996;

  const glow = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.10, 1.10, 1.10)),
    new THREE.LineBasicMaterial({color: 0x5cff8b, transparent: true, opacity: 0.28, depthTest: false})
  );
  glow.renderOrder = 997;

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.035, 1.035, 1.035)),
    new THREE.LineBasicMaterial({color: 0x5cff8b, transparent: true, opacity: 0.9, depthTest: false})
  );
  edges.renderOrder = 998;

  const corners = new THREE.LineSegments(
    makeCornerMarkerGeometry3d(1.16, 0.28),
    new THREE.LineBasicMaterial({color: 0xf2fff5, transparent: true, opacity: 0.8, depthTest: false})
  );
  corners.renderOrder = 999;

  group.add(fill, glow, edges, corners);
  group.userData = {fill, glow, edges, corners};
  group.visible = false;
  hoverBoxMesh3d = group;
  scene3d.add(hoverBoxMesh3d);
  return hoverBoxMesh3d;
}

function updateHoverBox3d() {
  const box = ensureHoverBox3d();
  if(!hoverActive3d || tool === 'pan' || isDragging3d || isPanning3d || isPaintDragging3d) {
    box.visible = false;
    return;
  }
  const hit = pickVoxel3d(pointerX3d, pointerY3d);
  if(!hit || (hit.ground && tool === 'erase')) { box.visible = false; return; }
  let tx = hit.x, ty = hit.y, tz = hit.z;
  if(tool === 'paint' && !hit.ground) { tx += hit.nx; ty += hit.ny; tz += hit.nz; }
  box.position.set(tx, ty, tz);
  const erase = tool === 'erase';
  const mainColor = erase ? 0xff4f68 : 0x5cff8b;
  const cornerColor = erase ? 0xffd6dc : 0xf2fff5;
  const pulse = Math.sin(performance.now()/280) * 0.5 + 0.5;
  box.userData.fill.material.color.setHex(mainColor);
  box.userData.glow.material.color.setHex(mainColor);
  box.userData.edges.material.color.setHex(mainColor);
  box.userData.corners.material.color.setHex(cornerColor);
  box.userData.fill.material.opacity = (erase ? 0.08 : 0.1) + pulse*0.06;
  box.userData.glow.material.opacity = 0.18 + pulse*0.18;
  box.userData.edges.material.opacity = 0.74 + pulse*0.18;
  box.userData.corners.material.opacity = 0.72 + pulse*0.18;
  const s = 1.01 + pulse*0.035;
  box.scale.set(s, s, s);
  box.visible = true;
}

function applyPaint3D(x, y, z, mode) {
  const {blocks, erased} = getLayerMaps(y);
  const mirrors = getSymmetryMirrors(x, z);
  mirrors.forEach(mk => {
    if(mode === 'add') {
      blocks.set(mk, selColor);
      erased.delete(mk);
      const [mx,mz] = mk.split(',').map(Number);
      popAnimations3d.set(mx+','+y+','+mz, performance.now());
    } else {
      blocks.delete(mk);
      erased.add(mk);
    }
  });
  dirty3d = true;
}

function processPaintDrag3d() {
  const hit = pickVoxel3d(pointerX3d, pointerY3d);
  if(!hit) return;
  if(hit.ground && paintMode3d === 'erase') return;
  let tx = hit.x, ty = hit.y, tz = hit.z;
  if(paintMode3d === 'add' && !hit.ground) { tx += hit.nx; ty += hit.ny; tz += hit.nz; }
  const key = tx+','+ty+','+tz;
  if(key === lastPaintKey3d) return;
  lastPaintKey3d = key;

  if(!strokeChanged3d) {
    pushU(strokeSnapshot3d);
    strokeChanged3d = true;
  }
  applyPaint3D(tx, ty, tz, paintMode3d);
}

function initScene3d() {
  mc3d.tabIndex = 0;
  renderer3d = new THREE.WebGLRenderer({canvas: mc3d, antialias: true, preserveDrawingBuffer: true});
  renderer3d.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  scene3d = new THREE.Scene();
  updateSceneBackground3d();

  camera3d = new THREE.PerspectiveCamera(55, 1, 0.1, 5000);

  scene3d.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dl = new THREE.DirectionalLight(0xffffff, 0.7);
  dl.position.set(40, 60, 30);
  scene3d.add(dl);
  const dl2 = new THREE.DirectionalLight(0xffffff, 0.35);
  dl2.position.set(-40, 20, -30);
  scene3d.add(dl2);

  boxGeo3d = new THREE.BoxGeometry(1, 1, 1);

  axesHelper3d = new THREE.AxesHelper(1);
  scene3d.add(axesHelper3d);
  gridHelper3d = new THREE.GridHelper(1, 1, 0x888888, 0x444444);
  gridHelper3d.material.transparent = true;
  gridHelper3d.material.opacity = 0.3;
  scene3d.add(gridHelper3d);

  groundPlane3d = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false})
  );
  groundPlane3d.rotation.x = -Math.PI/2;
  scene3d.add(groundPlane3d);

  shadowBlob3d = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({map: makeShadowTexture3d(), transparent: true, depthWrite: false})
  );
  shadowBlob3d.rotation.x = -Math.PI/2;
  shadowBlob3d.renderOrder = -1;
  scene3d.add(shadowBlob3d);

  layerGuide3d = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({color: 0x76d97e, transparent: true, opacity: 0.92, depthTest: false})
  );
  layerGuide3d.renderOrder = 880;
  scene3d.add(layerGuide3d);

  mc3d.addEventListener('mousemove', () => { hoverActive3d = true; });
  mc3d.addEventListener('mouseleave', () => { hoverActive3d = false; });

  mc3d.addEventListener('mousedown', e => {
    focusMinecraftCanvas3d();
    e.preventDefault();
    if(document.pointerLockElement !== mc3d) {
      requestPointerLock3d();
      return;
    }
    if(e.button === 0 && (tool === 'paint' || tool === 'erase')) {
      isPaintDragging3d = true;
      paintMode3d = tool === 'erase' ? 'erase' : 'add';
      lastPaintKey3d = null;
      strokeSnapshot3d = cloneLayerMaps();
      strokeChanged3d = false;
      strokeRaycastMeshes3d = meshes3d;
      pointerX3d = e.clientX; pointerY3d = e.clientY;
      pointerMoved3d = false;
      processPaintDrag3d();
    }
  });
  window.addEventListener('mouseup', () => {
    isDragging3d = false; isPanning3d = false;
    isPaintDragging3d = false; lastPaintKey3d = null;
    strokeSnapshot3d = null; strokeChanged3d = false;
    strokeRaycastMeshes3d = null;
  });
  window.addEventListener('mousemove', e => {
    if(document.pointerLockElement === mc3d) {
      const rect = mc3d.getBoundingClientRect();
      pointerX3d = rect.left + rect.width/2;
      pointerY3d = rect.top + rect.height/2;
      camAnim3d = null;
      camTheta3d -= e.movementX * 0.0028;
      camPhi3d = Math.min(Math.PI/2-0.02, Math.max(-Math.PI/2+0.02, camPhi3d - e.movementY*0.0028));
      updateCamera3d();
      if(isPaintDragging3d) { pointerMoved3d = true; }
      return;
    }
    pointerX3d = e.clientX; pointerY3d = e.clientY;
    if(isPaintDragging3d) { pointerMoved3d = true; return; }
    if(!isDragging3d && !isPanning3d) return;
    const dx = e.clientX - lastX3d, dy = e.clientY - lastY3d;
    lastX3d = e.clientX; lastY3d = e.clientY;
    if(isDragging3d) {
      camTheta3d -= dx * 0.01;
      camPhi3d = Math.min(Math.PI-0.05, Math.max(0.05, camPhi3d - dy*0.01));
    } else if(isPanning3d) {
      const panScale = camDist3d * 0.0015;
      camTarget3d.x -= Math.cos(camTheta3d) * dx * panScale;
      camTarget3d.z += Math.sin(camTheta3d) * dx * panScale;
      camTarget3d.y += dy * panScale;
    }
    updateCamera3d();
  });
  mc3d.addEventListener('contextmenu', e => e.preventDefault());
  mc3d.addEventListener('wheel', e => {
    e.preventDefault();
  }, {passive:false});

  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === mc3d;
    mc3d.classList.toggle('mouse-locked', locked);
    hoverActive3d = locked || hoverActive3d;
    if(locked) {
      focusMinecraftCanvas3d();
      const rect = mc3d.getBoundingClientRect();
      pointerX3d = rect.left + rect.width/2;
      pointerY3d = rect.top + rect.height/2;
    } else {
      keysDown3d.clear();
    }
  });

  resizeObs3d = new ResizeObserver(() => resize3d());
  resizeObs3d.observe(cw);
}

function requestPointerLock3d() {
  const lock = mc3d.requestPointerLock && mc3d.requestPointerLock();
  if(lock && typeof lock.catch === 'function') lock.catch(() => {});
}

function updateSceneBackground3d() {
  const c = document.createElement('canvas');
  c.width = 2; c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  if(lightBg) {
    g.addColorStop(0, '#dcdce4');
    g.addColorStop(1, '#f5f5f5');
  } else {
    g.addColorStop(0, '#1a1a26');
    g.addColorStop(1, '#050507');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 2, 256);
  scene3d.background = new THREE.CanvasTexture(c);
  const fogColor = lightBg ? 0xf0f0f2 : 0x08080c;
  if(scene3d.fog) scene3d.fog.color.set(fogColor);
  else scene3d.fog = new THREE.Fog(fogColor, 40, 220);
}

function makeShadowTexture3d() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(0,0,0,0.45)');
  g.addColorStop(0.7, 'rgba(0,0,0,0.16)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function updateCamera3d() {
  camera3d.position.set(camPos3d.x, camPos3d.y, camPos3d.z);
  const cosPitch = Math.cos(camPhi3d);
  camera3d.lookAt(
    camPos3d.x - Math.sin(camTheta3d) * cosPitch,
    camPos3d.y + Math.sin(camPhi3d),
    camPos3d.z - Math.cos(camTheta3d) * cosPitch
  );
}

function resize3d() {
  if(!renderer3d) return;
  const rect = cw.getBoundingClientRect();
  const W = Math.max(1, Math.round(rect.width));
  const H = Math.max(1, Math.round(rect.height));
  renderer3d.setSize(W, H, true);
  camera3d.aspect = W/H;
  camera3d.updateProjectionMatrix();
}

function frameCamera3d() {
  const R = getR();
  const [y0,y1] = getLayerRange(shape3d, R, cylHeight);
  const compactViewport = cw.clientHeight < 620;
  const cameraScale = compactViewport ? 3.9 : 3.05;
  animateCameraTo3d({x:0, y:(y0+y1)/2, z:0}, Math.max(8, R*cameraScale), 0.55, compactViewport ? 1.18 : 1.1);

  const axesSize = Math.max(6, R*2.2);
  axesHelper3d.scale.set(axesSize, axesSize, axesSize);

  const worldSize = Math.max(320, Math.round(R*8));
  const divisions = worldSize;
  scene3d.remove(gridHelper3d);
  gridHelper3d.geometry.dispose();
  gridHelper3d.material.dispose();
  gridHelper3d = new THREE.GridHelper(worldSize, divisions, 0x999999, 0x555555);
  gridHelper3d.material.transparent = true;
  gridHelper3d.material.opacity = 0.3;
  gridY3d = y0-0.5;
  gridHelper3d.position.set(0.5, gridY3d, 0.5);
  scene3d.add(gridHelper3d);

  groundPlane3d.scale.set(worldSize, worldSize, 1);
  groundPlane3d.position.set(0, gridY3d, 0);

  const shadowSize = Math.max(6, R*2.3);
  shadowBlob3d.scale.set(shadowSize, shadowSize, 1);
  shadowBlob3d.position.set(0, y0-0.48, 0);

  if(scene3d.fog) { scene3d.fog.near = Math.max(20, R*3); scene3d.fog.far = Math.max(180, R*10); }
}

function updateGridFollow3d() {
  if(!gridHelper3d) return;
  const cx = Math.round(camPos3d.x), cz = Math.round(camPos3d.z);
  gridHelper3d.position.x = cx + 0.5;
  gridHelper3d.position.z = cz + 0.5;
  groundPlane3d.position.x = cx;
  groundPlane3d.position.z = cz;
}

function makeBorderedCanvas3d(srcCanvas) {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(srcCanvas, 0, 0, 16, 16);
  ctx.strokeStyle = 'rgba(0,0,0,0.48)';
  ctx.lineWidth = 1.1;
  ctx.strokeRect(0.55, 0.55, 14.9, 14.9);
  return c;
}

function getMaterial3d(blockIdx) {
  const canvas = blockCanvases[blockIdx];
  const cached = materialCache3d.get(blockIdx);
  if(cached && cached.canvas === canvas) return cached.mat;
  const tex = new THREE.CanvasTexture(makeBorderedCanvas3d(canvas));
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  const mat = new THREE.MeshLambertMaterial({map: tex});
  if(cached) {
    const oldMaterials = Array.isArray(cached.mat) ? cached.mat : [cached.mat];
    oldMaterials.forEach(m => {
      if(m.map) m.map.dispose();
      m.dispose();
    });
  }
  materialCache3d.set(blockIdx, {canvas, mat});
  return mat;
}

function ensureWarn3d() {
  if(warnEl3d) return warnEl3d;
  warnEl3d = document.createElement('div');
  warnEl3d.style.cssText = 'position:absolute;left:50%;top:12px;transform:translateX(-50%);'
    + 'background:rgba(224,90,90,.92);color:#fff;font:12px/1.4 "Space Mono",monospace;'
    + 'padding:6px 12px;border-radius:6px;display:none;z-index:5;pointer-events:none;';
  warnEl3d.textContent = 'Large structure — preview may lag';
  cw.appendChild(warnEl3d);
  return warnEl3d;
}

function updateLayerGuide3d(volume) {
  if(!layerGuide3d) return;
  const layerCells = new Set();
  volume.forEach((_, key) => {
    const [x,y,z] = key.split(',').map(Number);
    if(y === currentLayer) layerCells.add(x+','+z);
  });

  const pts = [];
  const y = currentLayer + 0.56;
  layerCells.forEach(k => {
    const [x,z] = k.split(',').map(Number);
    const left = x - 0.52, right = x + 0.52;
    const front = z - 0.52, back = z + 0.52;
    if(!layerCells.has((x-1)+','+z)) pts.push(left,y,front, left,y,back);
    if(!layerCells.has((x+1)+','+z)) pts.push(right,y,front, right,y,back);
    if(!layerCells.has(x+','+(z-1))) pts.push(left,y,front, right,y,front);
    if(!layerCells.has(x+','+(z+1))) pts.push(left,y,back, right,y,back);
  });

  layerGuide3d.geometry.dispose();
  layerGuide3d.geometry = new THREE.BufferGeometry();
  layerGuide3d.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  layerGuide3d.visible = pts.length > 0;
}

function rebuild3d() {
  const volume = computeFullVolumeBlocks();

  const groups = new Map();
  let visibleCount = 0;
  volume.forEach((blockIdx, key) => {
    const [x,y,z] = key.split(',').map(Number);
    const hidden = volume.has((x+1)+','+y+','+z) && volume.has((x-1)+','+y+','+z)
      && volume.has(x+','+(y+1)+','+z) && volume.has(x+','+(y-1)+','+z)
      && volume.has(x+','+y+','+(z+1)) && volume.has(x+','+y+','+(z-1));
    if(hidden) return;
    if(!groups.has(blockIdx)) groups.set(blockIdx, []);
    groups.get(blockIdx).push([x,y,z]);
    visibleCount++;
  });

  meshes3d.forEach(m => scene3d.remove(m));
  meshes3d = [];

  const dummy = new THREE.Object3D();
  groups.forEach((positions, blockIdx) => {
    const mat = getMaterial3d(blockIdx);
    const mesh = new THREE.InstancedMesh(boxGeo3d, mat, positions.length);
    const now = performance.now();
    positions.forEach(([x,y,z], i) => {
      const key = x+','+y+','+z;
      let s = 1;
      const startT = popAnimations3d.get(key);
      if(startT !== undefined) {
        const t = (now-startT)/POP_DURATION_3D;
        s = easeOutBack(t);
        if(t >= 1) popAnimations3d.delete(key);
      }
      dummy.position.set(x, y, z);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.userData.positions = positions;
    mesh.userData.blockIdx = blockIdx;
    scene3d.add(mesh);
    meshes3d.push(mesh);
  });

  updateLayerGuide3d(volume);
  ensureWarn3d().style.display = visibleCount > 150000 ? '' : 'none';
}

function renderLoop3d() {
  const now = performance.now();
  const dt = Math.min(0.1, (now-lastFrameTime3d)/1000);
  lastFrameTime3d = now;
  if(isPaintDragging3d && pointerMoved3d) { pointerMoved3d = false; processPaintDrag3d(); }
  if(dirty3d || popAnimations3d.size > 0) { rebuild3d(); dirty3d = false; }
  tickCameraAnim3d();
  updateFlyCamera3d(dt);
  updateGridFollow3d();
  updateHoverBox3d();
  renderer3d.render(scene3d, camera3d);
  rafId3d = requestAnimationFrame(renderLoop3d);
}

function show3D() {
  if(!renderer3d) initScene3d();
  focusMinecraftCanvas3d();
  resize3d();
  frameCamera3d();
  dirty3d = true;
  requestAnimationFrame(() => {
    resize3d();
    frameCamera3d();
    dirty3d = true;
  });
  if(!rafId3d) rafId3d = requestAnimationFrame(renderLoop3d);
}

function hide3D() {
  if(rafId3d) { cancelAnimationFrame(rafId3d); rafId3d = null; }
}
