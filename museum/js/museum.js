;(function(){
/* Gallery architecture, ornament and framed-painting assembly.
   Everything is real geometry: recessed wall panels, mitred multi-band frames,
   stretched canvas planes, brass picture lights, cornices, coffers, marble. */
'use strict';

const ROOM = {
  halfW: 8,        // side walls at x = ±8
  height: 7.4,
  zFront: 24,      // entrance wall
  zBack: -30,      // far wall
  /* slots 0-6 run deep to the far end, 7-11 hang the front half of the room */
  panelZs: [-4, -8, -12, -16, -20, -24, -28, 0, 4, 8, 12, 16],
  panelW: 2.7,
  panelH: 3.3,
  panelCY: 2.05,   // panel centre height
  wallX: 7.85      // recessed painting surface plane
};

/* the plaster each recess is finished with, handed out so the corruption can
   cut through it: one material per panel, built as the panels are */
const panelBacks = [];

/* ------------------------------------------------------------- texture util */

function canvasTexture(canvas, opts) {
  opts = opts || {};
  const t = new THREE.CanvasTexture(canvas);
  /* r160 throws inside ColorManagement.getPrimaries if colorSpace is undefined;
     non-colour maps must get an explicit linear space. */
  t.colorSpace = opts.data ? THREE.LinearSRGBColorSpace : THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = opts.wrap || THREE.ClampToEdgeWrapping;
  if (opts.repeat) { t.repeat.set(opts.repeat[0], opts.repeat[1]); }
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.anisotropy = opts.anisotropy || 1;
  return t;
}

function noiseCanvas(W, H, base, amp, rnd, blobs) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);
  for (let i = 0; i < W * H; i++) {
    const v = base + (rnd() - 0.5) * amp;
    const b = Math.max(0, Math.min(255, v * 255));
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = b;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  if (blobs) {
    for (let i = 0; i < blobs; i++) {
      const x = rnd() * W, y = rnd() * H, r = W * (0.03 + rnd() * 0.18);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const up = rnd() > 0.45;
      g.addColorStop(0, up ? 'rgba(255,255,255,.30)' : 'rgba(0,0,0,.26)');
      g.addColorStop(1, 'rgba(128,128,128,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  return c;
}

/* Acanthus-scroll relief repeated along the frame moulding. */
function ornamentReliefCanvas(periodPx, H, seed) {
  const W = periodPx * 8;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const rnd = Art.mulberry32(seed);
  ctx.fillStyle = '#7a7a7a'; ctx.fillRect(0, 0, W, H);
  /* beaded inner row */
  const bead = H * 0.16;
  for (let x = periodPx * 0.5; x < W; x += periodPx) {
    const g = ctx.createRadialGradient(x, H * 0.13, 0, x, H * 0.13, bead);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, '#9a9a9a'); g.addColorStop(1, '#6f6f6f');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, H * 0.13, bead, 0, 7); ctx.fill();
  }
  /* leaf scrolls */
  for (let k = 0; k < 8; k++) {
    const x0 = k * periodPx;
    for (let i = 0; i < 26; i++) {
      const t = i / 25;
      const cx = x0 + periodPx * (0.12 + t * 0.76);
      const cy = H * (0.44 + Math.sin(t * Math.PI * 2) * 0.16);
      const r = H * (0.10 + Math.sin(t * Math.PI) * 0.09);
      const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
      g.addColorStop(0, '#f8f8f8'); g.addColorStop(0.6, '#a5a5a5'); g.addColorStop(1, '#6b6b6b');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(cx, cy, r * 1.5, r, (t - 0.5) * 1.1 + rnd() * 0.2, 0, 7); ctx.fill();
    }
    /* egg-and-dart between scrolls */
    const ex = x0 + periodPx * 0.5;
    const g2 = ctx.createRadialGradient(ex, H * 0.82, 0, ex, H * 0.82, H * 0.13);
    g2.addColorStop(0, '#ffffff'); g2.addColorStop(1, '#747474');
    ctx.fillStyle = g2;
    ctx.beginPath(); ctx.ellipse(ex, H * 0.82, H * 0.1, H * 0.13, 0, 0, 7); ctx.fill();
  }
  /* top and bottom flat fillets */
  ctx.fillStyle = '#d2d2d2'; ctx.fillRect(0, 0, W, H * 0.045);
  ctx.fillStyle = '#8e8e8e'; ctx.fillRect(0, H * 0.95, W, H * 0.05);
  return c;
}

/* Warm grey marble with veins, built as a 2x2 tile block. */
function marbleCanvases(seed, rnd) {
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, '#cfc6b2'); g.addColorStop(0.5, '#c0b7a2'); g.addColorStop(1, '#aca391');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  /* tonal blotches */
  for (let i = 0; i < 90; i++) {
    const x = rnd() * S, y = rnd() * S, r = S * (0.04 + rnd() * 0.2);
    const bg = ctx.createRadialGradient(x, y, 0, x, y, r);
    const light = rnd() > 0.45;
    bg.addColorStop(0, light ? 'rgba(226,219,201,.42)' : 'rgba(126,118,100,.34)');
    bg.addColorStop(1, 'rgba(170,162,144,0)');
    ctx.fillStyle = bg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  /* veins */
  for (let i = 0; i < 34; i++) {
    ctx.strokeStyle = rnd() > 0.5 ? 'rgba(84,76,64,.34)' : 'rgba(224,218,202,.30)';
    ctx.lineWidth = 0.6 + rnd() * 3.2;
    ctx.beginPath();
    let x = rnd() * S, y = rnd() * S;
    ctx.moveTo(x, y);
    const dir = rnd() * Math.PI;
    for (let k = 0; k < 26; k++) {
      x += Math.cos(dir) * S * 0.04 + (rnd() - 0.5) * S * 0.03;
      y += Math.sin(dir) * S * 0.04 + (rnd() - 0.5) * S * 0.03;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  /* grain */
  ctx.globalAlpha = 0.16;
  ctx.drawImage(noiseCanvas(512, 512, 0.5, 0.7, rnd, 0), 0, 0, S, S);
  ctx.globalAlpha = 1;
  /* grout lines make a 1.35 m tile grid (2x2 tiles per texture repeat) */
  ctx.strokeStyle = 'rgba(46,42,36,.55)'; ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, S / 2, S / 2);
  ctx.strokeRect(S / 2, 0, S / 2, S / 2);
  ctx.strokeRect(0, S / 2, S / 2, S / 2);
  ctx.strokeRect(S / 2, S / 2, S / 2, S / 2);

  const rough = noiseCanvas(512, 512, 0.24, 0.3, rnd, 60);
  const rctx = rough.getContext('2d');
  rctx.globalCompositeOperation = 'source-over';
  rctx.fillStyle = 'rgba(255,255,255,.34)';
  /* polished sheen over the tile faces, matt along the grout */
  rctx.fillRect(0, 0, S, S);
  rctx.globalCompositeOperation = 'multiply';
  rctx.drawImage(c, 0, 0, 512, 512);
  return { color: c, rough: rough };
}

/* Plaster with a picture-light wash baked into the recess. */
function panelBackCanvas(wPx, hPx, seed) {
  const c = document.createElement('canvas');
  c.width = wPx; c.height = hPx;
  const ctx = c.getContext('2d');
  const rnd = Art.mulberry32(seed);
  const g = ctx.createLinearGradient(0, 0, 0, hPx);
  g.addColorStop(0, '#d8d2c6'); g.addColorStop(0.35, '#cdc6b8'); g.addColorStop(1, '#a9a294');
  ctx.fillStyle = g; ctx.fillRect(0, 0, wPx, hPx);
  /* light pool from the fixture above */
  ctx.globalCompositeOperation = 'lighter';
  const cx = wPx * 0.5, cy = -hPx * 0.06, r = wPx * 0.95;
  const pg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  pg.addColorStop(0, 'rgba(255,224,168,.42)');
  pg.addColorStop(0.45, 'rgba(255,214,158,.14)');
  pg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = pg; ctx.fillRect(0, 0, wPx, hPx);
  ctx.globalCompositeOperation = 'source-over';
  /* shadow cast by the frame */
  ctx.globalCompositeOperation = 'multiply';
  const fw = wPx * 0.62, fh = hPx * 0.78;
  const fx = (wPx - fw) / 2, fy = (hPx - fh) / 2;
  const sg = ctx.createLinearGradient(0, fy, 0, fy + hPx * 0.2);
  sg.addColorStop(0, 'rgba(255,255,255,1)'); sg.addColorStop(1, 'rgba(190,182,170,1)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, fy, wPx, hPx * 0.2);
  /* soft drop under and to the right of the frame */
  const dg = ctx.createLinearGradient(fx + fw, 0, fx + fw + wPx * 0.12, 0);
  dg.addColorStop(0, 'rgba(120,112,100,1)'); dg.addColorStop(1, 'rgba(255,255,255,1)');
  ctx.fillStyle = dg; ctx.fillRect(fx + fw, fy - hPx * 0.05, wPx * 0.12, fh + hPx * 0.15);
  const bg = ctx.createLinearGradient(0, fy + fh, 0, fy + fh + hPx * 0.14);
  bg.addColorStop(0, 'rgba(118,110,98,1)'); bg.addColorStop(1, 'rgba(255,255,255,1)');
  ctx.fillStyle = bg; ctx.fillRect(fx - wPx * 0.06, fy + fh, fw + wPx * 0.12, hPx * 0.14);
  ctx.globalCompositeOperation = 'source-over';
  /* plaster tooth */
  ctx.globalAlpha = 0.10;
  ctx.drawImage(noiseCanvas(256, 256, 0.5, 0.8, rnd, 0), 0, 0, wPx, hPx);
  ctx.globalAlpha = 1;
  return c;
}

function wallCanvas(seed, wPx, hPx, tone) {
  const c = document.createElement('canvas');
  c.width = wPx; c.height = hPx;
  const ctx = c.getContext('2d');
  const rnd = Art.mulberry32(seed);
  const g = ctx.createLinearGradient(0, 0, 0, hPx);
  g.addColorStop(0, tone[0]); g.addColorStop(0.55, tone[1]); g.addColorStop(1, tone[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, wPx, hPx);
  for (let i = 0; i < 22; i++) {
    const x = rnd() * wPx, y = rnd() * hPx, r = wPx * (0.03 + rnd() * 0.12);
    const bg = ctx.createRadialGradient(x, y, 0, x, y, r);
    bg.addColorStop(0, rnd() > 0.5 ? 'rgba(255,250,238,.10)' : 'rgba(96,88,76,.07)');
    bg.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = bg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 0.09;
  ctx.drawImage(noiseCanvas(384, 384, 0.5, 0.9, rnd, 0), 0, 0, wPx, hPx);
  ctx.globalAlpha = 1;
  return c;
}

/* ---------------------------------------------------------------- materials */

function buildMaterials(renderer, rnd) {
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const marble = marbleCanvases(1, rnd);
  const marbleMap = canvasTexture(marble.color, { repeat: [16 / 2.7, 54 / 2.7], anisotropy: maxAniso });
  marbleMap.wrapS = marbleMap.wrapT = THREE.RepeatWrapping;
  const marbleRough = canvasTexture(marble.rough, { data: true, repeat: [16 / 2.7, 54 / 2.7] });
  marbleRough.wrapS = marbleRough.wrapT = THREE.RepeatWrapping;

  const floor = new THREE.MeshStandardMaterial({
    map: marbleMap, roughnessMap: marbleRough, roughness: 0.26, metalness: 0.0,
    envMapIntensity: 0.8, color: 0xffffff
  });

  /* repeat 1 vertically so the plaster gradient runs floor -> cornice once */
  const wallTone = ['#d3ccbe', '#c8c0b0', '#a49a88'];
  const wallMat = new THREE.MeshStandardMaterial({
    map: canvasTexture(wallCanvas(7, 1024, 512, wallTone), { repeat: [6, 1] }),
    roughness: 0.92, metalness: 0, envMapIntensity: 0.5
  });
  wallMat.map.wrapS = wallMat.map.wrapT = THREE.RepeatWrapping;

  const trimTone = ['#d6cfc2', '#cdc5b6', '#b3aa99'];
  const trimMat = new THREE.MeshStandardMaterial({
    map: canvasTexture(wallCanvas(11, 512, 512, trimTone)),
    roughness: 0.85, metalness: 0, envMapIntensity: 0.55
  });

  /* Downward-facing plaster catches no direct light; this stands in for the
     bounce the lantern feeds into the upper volume. */
  const ceilingMat = new THREE.MeshStandardMaterial({
    map: canvasTexture(wallCanvas(23, 512, 512, ['#ded8cb', '#d3ccbe', '#bdb5a6'])),
    roughness: 0.95, metalness: 0, envMapIntensity: 0.45,
    emissive: 0x6a5c48, emissiveIntensity: 0.5
  });

  /* three frame finishes, all with real relief */
  const relief = ornamentReliefCanvas(128, 96, 5);
  const reliefN = Art.normalFromHeight(relief, 1.7);

  function frameMaterial(cfg) {
    const rough = noiseCanvas(256, 256, cfg.rough, cfg.roughVar, rnd, 70);
    const m = new THREE.MeshStandardMaterial({
      color: cfg.color, metalness: cfg.metalness, roughness: 1,
      roughnessMap: canvasTexture(rough, { data: true, wrap: THREE.RepeatWrapping }),
      normalMap: canvasTexture(reliefN, { data: true, wrap: THREE.RepeatWrapping }),
      normalScale: new THREE.Vector2(cfg.relief, cfg.relief),
      envMapIntensity: cfg.env
    });
    /* The swept ring hands back real dimensions: one texture unit is one
       moulding tile, so the carving is the same size on a miniature panel as on
       a monumental canvas. Only the grain wants tiling finer than the leaf. */
    m.roughnessMap.repeat.set(3.5, 3.5);
    return m;
  }

  const frames = {
    gilt: frameMaterial({ color: 0xa8842f, metalness: 0.92, rough: 0.34, roughVar: 0.30, relief: 1.35, env: 1.15 }),
    darkGilt: frameMaterial({ color: 0x6d5223, metalness: 0.82, rough: 0.44, roughVar: 0.26, relief: 1.2, env: 0.9 }),
    ebonized: frameMaterial({ color: 0x241a12, metalness: 0.15, rough: 0.5, roughVar: 0.22, relief: 0.85, env: 0.5 }),
    bronze: frameMaterial({ color: 0x5b4a33, metalness: 0.7, rough: 0.4, roughVar: 0.3, relief: 1.1, env: 0.85 })
  };

  const brass = new THREE.MeshStandardMaterial({
    color: 0x9c7f45, metalness: 0.95, roughness: 0.3, envMapIntensity: 1.1
  });
  const brassHot = new THREE.MeshStandardMaterial({
    color: 0xd9b878, metalness: 0.9, roughness: 0.24, emissive: 0xffcf8a, emissiveIntensity: 0.9
  });

  /* Carved stone for the sculptures. The floor's marble at a repeat that reads
     on a 30 cm head, over a chisel-facet normal so no surface is perfectly
     smooth — polished plaster is what gives procedural sculpture its look. */
  const sculptMap = canvasTexture(marbleCanvases(3, rnd).color, { repeat: [1.6, 1.6], anisotropy: maxAniso });
  sculptMap.wrapS = sculptMap.wrapT = THREE.RepeatWrapping;
  const chisel = canvasTexture(Art.normalFromHeight(noiseCanvas(256, 256, 0.5, 0.3, rnd, 110), 0.6),
    { data: true, wrap: THREE.RepeatWrapping, repeat: [3, 3] });
  const bustMat = new THREE.MeshPhysicalMaterial({
    map: sculptMap, color: 0xf1ebdf, roughness: 0.44, metalness: 0,
    normalMap: chisel, normalScale: new THREE.Vector2(0.32, 0.32),
    clearcoat: 0.3, clearcoatRoughness: 0.5, envMapIntensity: 0.9,
    sheen: 0.3, sheenColor: new THREE.Color(0xd9cdb6)
  });
  const bronzeMat = new THREE.MeshStandardMaterial({
    color: 0x6a5233, metalness: 0.9, roughness: 0.4,
    normalMap: chisel, normalScale: new THREE.Vector2(0.26, 0.26),
    envMapIntensity: 1.15
  });
  const stoneTrim = new THREE.MeshStandardMaterial({ color: 0x9c937f, roughness: 0.5, metalness: 0, envMapIntensity: 0.5 });

  return { floor, wallMat, trimMat, ceilingMat, frames, brass, brassHot, bustMat, bronzeMat, stoneTrim, maxAniso, reliefN };
}

/* ------------------------------------------------------------- environment */

function makeEnvironment(renderer) {
  /* A miniature warm-gallery HDR: bright skylight band above, dim bounce below,
     baked with PMREM so gilt and varnish get believable specular reflections. */
  const W = 128, H = 64;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#8e8676'); g.addColorStop(0.3, '#4c4840');
  g.addColorStop(0.52, '#3a3630'); g.addColorStop(1, '#191713');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  /* skylight band */
  ctx.fillStyle = 'rgba(255,240,210,.95)';
  ctx.fillRect(0, H * 0.02, W, H * 0.09);
  /* warm picture lights around the horizon */
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 12; i++) {
    const x = (i + 0.5) * W / 12, y = H * 0.42;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, W * 0.055);
    rg.addColorStop(0, 'rgba(255,196,124,.8)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(x - W * 0.06, y - H * 0.3, W * 0.12, H * 0.6);
  }
  ctx.globalCompositeOperation = 'source-over';
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const env = pmrem.fromEquirectangular(tex);
  pmrem.dispose();
  tex.dispose();
  return env.texture;
}

/* ------------------------------------------------------------- architecture */

function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = false; m.receiveShadow = true;
  return m;
}

function buildSideWall(matWall, matTrim, side) {
  /* side: -1 = left wall (normal +x), +1 = right wall (normal -x) */
  const g = new THREE.Group();
  const x = side * ROOM.halfW;
  const len = ROOM.zFront - ROOM.zBack;
  const zc = (ROOM.zFront + ROOM.zBack) / 2;

  /* continuous wall plane (the recess fronts sit in front of it) */
  const back = box(0.3, ROOM.height, len, matWall, x + side * 0.15, ROOM.height / 2, zc);
  g.add(back);

  /* pilasters between panels + at both ends */
  const zs = ROOM.panelZs;
  const pilasterZs = [ROOM.zFront - 1.2];
  for (let i = 0; i < zs.length - 1; i++) pilasterZs.push((zs[i] + zs[i + 1]) / 2);
  pilasterZs.push(ROOM.zBack + 1.2);
  for (const pz of pilasterZs) {
    g.add(box(0.16, ROOM.height, 0.62, matTrim, x - side * 0.08, ROOM.height / 2, pz));
    g.add(box(0.24, 0.34, 0.78, matTrim, x - side * 0.12, ROOM.height - 0.6, pz));
    g.add(box(0.22, 0.26, 0.74, matTrim, x - side * 0.11, 0.13, pz));
  }

  /* skirting and picture rail runs */
  g.add(box(0.22, 0.5, len, matTrim, x - side * 0.11, 0.25, zc));
  g.add(box(0.1, 0.12, len, matTrim, x - side * 0.05, 0.52, zc));
  g.add(box(0.14, 0.22, len, matTrim, x - side * 0.07, ROOM.height - 0.5, zc));
  return g;
}

function buildPanel(matTrim, matWall, side, z, seed) {
  /* raised recessed surround standing proud of the wall plane */
  const g = new THREE.Group();
  const x = side * (ROOM.halfW - 0.08);
  const pw = ROOM.panelW, ph = ROOM.panelH, cy = ROOM.panelCY;
  const front = ROOM.wallX;
  const depth = x - front; /* how far the recess front stands off the painting plane */

  /* back plane with baked picture light + cast shadow */
  const backTex = canvasTexture(panelBackCanvas(512, 640, seed));
  const backMat = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.94, metalness: 0, envMapIntensity: 0.35 });
  panelBacks.push(backMat);
  const bp = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), backMat);
  bp.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
  bp.position.set(front, cy, z);
  bp.receiveShadow = true;
  g.add(bp);

  /* recess reveal frames (four boards with a window cut out) */
  const surround = new THREE.Group();
  const t = 0.34;
  const ox = side * (depth);
  surround.position.set(x, cy, z);
  const mk = (w, h, px, py) => {
    const m = box(0.16, h, w, matTrim, 0, 0, 0);
    m.scale.set(1, 1, 1);
    m.position.set(ox, py, px);
    m.geometry = new THREE.BoxGeometry(0.16, h, w);
    return m;
  };
  surround.add(mk(pw + t * 2, t, 0, (ph + t) / 2));
  surround.add(mk(pw + t * 2, t, 0, -(ph + t) / 2));
  surround.add(mk(t, ph, (pw + t) / 2, 0));
  surround.add(mk(t, ph, -(pw + t) / 2, 0));
  /* shadow line bead just inside the reveal */
  g.add(surround);
  return g;
}

function buildEndWalls(matWall, matTrim) {
  const g = new THREE.Group();
  const len = ROOM.halfW * 2;
  /* entrance wall with a tall portal opening */
  const zf = ROOM.zFront;
  const openW = 4.6, openH = 5.2;
  g.add(box(len, ROOM.height, 0.5, matWall, 0, ROOM.height / 2, zf + 0.25));
  /* portal: reveal jambs + lintel in front of the wall, dark passage beyond */
  g.add(box(openW + 1.1, 0.42, 0.34, matTrim, 0, openH + 0.2, zf - 0.17));
  g.add(box(0.44, openH, 0.34, matTrim, -(openW / 2 + 0.22), openH / 2, zf - 0.17));
  g.add(box(0.44, openH, 0.34, matTrim, (openW / 2 + 0.22), openH / 2, zf - 0.17));
  g.add(box(0.7, 0.5, 0.4, matTrim, 0, openH + 0.62, zf - 0.2));
  /* passage beyond the portal, softly lit */
  const passageMat = new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.95, emissive: 0x3a2f22, emissiveIntensity: 0.55 });
  g.add(box(openW, openH, 0.2, passageMat, 0, openH / 2, zf + 1.6));
  g.add(box(0.3, openH, 2.2, matWall, -openW / 2, openH / 2, zf + 1.1));
  g.add(box(0.3, openH, 2.2, matWall, openW / 2, openH / 2, zf + 1.1));

  /* far wall with a central monumental painting panel */
  const zb = ROOM.zBack;
  g.add(box(len, ROOM.height, 0.5, matWall, 0, ROOM.height / 2, zb - 0.25));
  g.add(box(len - 1.0, 0.5, 0.3, matTrim, 0, 0.25, zb + 0.16));
  g.add(box(len, 0.6, 0.34, matTrim, 0, ROOM.height - 0.7, zb + 0.17));
  /* pilasters on the end wall */
  for (const px of [-6.4, -3.6, 3.6, 6.4]) {
    g.add(box(0.5, ROOM.height - 1.2, 0.18, matTrim, px, (ROOM.height - 1.2) / 2 + 0.3, zb + 0.1));
  }
  /* A flush backboard behind the end-wall picture, so the destination piece is
     not tacked straight onto the plaster. Two plates rather than four mitred
     bars: overlapping bars meet coplanar at the corners and fight in the depth
     buffer. Sized to the canvas that hangs here, plus its frame and plaque. */
  g.add(box(2.5, 3.15, 0.06, matTrim, 0, 2.0, zb + 0.07));
  g.add(box(2.12, 2.78, 0.06, matTrim, 0, 2.0, zb + 0.13));
  return g;
}

function buildCeiling(matCeil, matTrim) {
  const g = new THREE.Group();
  const len = ROOM.zFront - ROOM.zBack, zc = (ROOM.zFront + ROOM.zBack) / 2;
  const y = ROOM.height;
  /* main slab */
  const slab = box(ROOM.halfW * 2, 0.4, len, matCeil, 0, y + 0.2, zc);
  g.add(slab);
  /* coffer grid, leaving a central light slot */
  const slotW = 2.4;
  for (let ix = 0; ix < 6; ix++) {
    const cxs = -6.6 + ix * 2.64;
    if (Math.abs(cxs) < slotW) continue;
    for (let iz = 0; iz < 11; iz++) {
      const cz = ROOM.zFront - 2.6 - iz * 4.8;
      const beam1 = box(2.4, 0.34, 0.34, matTrim, cxs, y - 0.17, cz - 2.07);
      const beam2 = box(0.34, 0.34, 4.14, matTrim, cxs - 1.03, y - 0.17, cz);
      const beam3 = box(0.34, 0.34, 4.14, matTrim, cxs + 1.03, y - 0.17, cz);
      const beam4 = box(2.4, 0.34, 0.34, matTrim, cxs, y - 0.17, cz + 2.07);
      g.add(beam1, beam2, beam3, beam4);
    }
  }
  /* skylight slot: a glazed lantern over the central void. Deliberately below
     the tone-map knee so it blooms as daylight instead of clipping to white. */
  const skyMat = new THREE.MeshBasicMaterial({ color: 0xc9bda6 });
  g.add(box(4.0, 0.06, len - 4, skyMat, 0, y - 0.05, zc));
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xa89d88 });
  g.add(box(4.6, 0.04, len - 3.6, glowMat, 0, y - 0.12, zc));
  /* the coda has to reach these two: they are unlit, so the plaster's emissive
     lift does nothing for them and they would stay grey in a white ceiling */
  g.userData.lantern = [skyMat, glowMat];
  /* lantern curbs, then glazing bars on the coffer bay spacing */
  for (const s of [-1, 1]) g.add(box(0.26, 0.3, len - 3.4, matTrim, s * 2.25, y - 0.15, zc));
  for (let iz = 0; iz < 12; iz++) {
    g.add(box(4.7, 0.2, 0.24, matTrim, 0, y - 0.16, ROOM.zFront - 0.2 - iz * 4.5));
  }
  /* cove strip around the room */
  g.add(box(ROOM.halfW * 2, 0.42, 0.42, matTrim, 0, y - 0.2, ROOM.zFront - 0.6));
  g.add(box(ROOM.halfW * 2, 0.42, 0.42, matTrim, 0, y - 0.2, ROOM.zBack + 0.6));
  for (const s of [-1, 1]) g.add(box(0.42, 0.42, len, matTrim, s * (ROOM.halfW - 0.6), y - 0.2, zc));
  return g;
}

/* -------------------------------------------------------------- sculpture */

/**
 * Turned vessel. A human figure cannot be modelled from primitives without
 * reading as a snowman, so the gallery's freestanding pieces are the objects a
 * lathe profile genuinely renders well: foot, stem, shoulder, neck, everted
 * rim, thrown hollow, with applied handles and a lid.
 * Origin at the foot of the vessel, ~1.0 m to the finial.
 */
function buildUrn(mat, o) {
  o = o || {};
  const g = new THREE.Group();
  const add = (m) => { m.receiveShadow = true; g.add(m); return m; };
  const P = (x, y) => new THREE.Vector2(x, y);

  /* the wall is thrown down the outside and back up the inside, so the mouth
     has a true thickness and the hollow catches light */
  const body = [
    P(0, 0), P(0.185, 0), P(0.2, 0.035), P(0.152, 0.07), P(0.1, 0.115),
    P(0.092, 0.175), P(0.14, 0.245), P(0.207, 0.335), P(0.238, 0.44),
    P(0.24, 0.53), P(0.216, 0.63), P(0.166, 0.705), P(0.122, 0.755),
    P(0.108, 0.815), P(0.112, 0.86), P(0.15, 0.9), P(0.162, 0.93),
    P(0.15, 0.942), P(0.128, 0.94), P(0.114, 0.9), P(0.098, 0.84),
    P(0.094, 0.77), P(0.12, 0.7), P(0.15, 0.62), P(0.02, 0.6), P(0, 0.58)
  ];
  add(new THREE.Mesh(new THREE.LatheGeometry(body, 44), mat));

  /* an applied band at the shoulder breaks the silhouette the way turning does */
  const band = add(new THREE.Mesh(new THREE.TorusGeometry(0.236, 0.013, 8, 44), mat));
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.505;

  for (const s of [-1, 1]) {
    const handle = add(new THREE.Mesh(new THREE.TorusGeometry(0.086, 0.021, 8, 22, Math.PI * 1.15), mat));
    handle.position.set(s * 0.225, 0.63, 0);
    handle.rotation.set(0, Math.PI / 2, s * 0.62 - 0.32);
  }

  if (o.lid !== false) {
    const lid = [
      P(0, 0.945), P(0.14, 0.945), P(0.132, 0.965), P(0.098, 0.99),
      P(0.062, 1.012), P(0.04, 1.03), P(0.03, 1.055), P(0.036, 1.075),
      P(0.024, 1.085), P(0.022, 1.115), P(0.032, 1.135), P(0.026, 1.15),
      P(0, 1.158)
    ];
    add(new THREE.Mesh(new THREE.LatheGeometry(lid, 40), mat));
  }
  return g;
}

function buildPlinth(matTrim, matStone, round, h) {
  const g = new THREE.Group();
  if (round) {
    g.add(box(0.78, 0.08, 0.78, matStone, 0, 0.04, 0));
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.33, h - 0.16, 24), matTrim);
    stem.position.y = (h - 0.16) / 2 + 0.08;
    stem.receiveShadow = true;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.31, 0.08, 24), matStone);
    cap.position.y = h - 0.04;
    cap.receiveShadow = true;
    g.add(stem, cap);
  } else {
    g.add(box(0.62, 0.09, 0.62, matStone, 0, 0.045, 0));
    g.add(box(0.5, h - 0.22, 0.5, matTrim, 0, (h - 0.22) / 2 + 0.09, 0));
    g.add(box(0.58, 0.06, 0.58, matStone, 0, h - 0.12, 0));
    g.add(box(0.52, 0.03, 0.52, matStone, 0, h - 0.075, 0));
  }
  return g;
}

function buildFurniture(mats) {
  const g = new THREE.Group();
  /* benches */
  for (const bz of [-9.5, -21.5]) {
    const b = new THREE.Group();
    b.add(box(0.9, 0.16, 3.4, mats.stoneTrim, 0, 0.46, 0));
    b.add(box(0.7, 0.4, 0.5, mats.trimMat, 0, 0.2, -1.3));
    b.add(box(0.7, 0.4, 0.5, mats.trimMat, 0, 0.2, 1.3));
    b.position.set(0, 0, bz);
    g.add(b);
  }
  /* Freestanding pieces sit on the gallery's centre line and at its two ends.
     The walk stays within ~1.3 m of the walls while it studies a picture, so
     nothing between the visitor and a canvas, and nothing in a picture shot. */
  const set = [
    { x: -2.6, z: -14, mat: mats.bustMat, plinth: 0.55, round: true, scale: 0.78 },
    { x: 2.6, z: -14, mat: mats.bronzeMat, plinth: 0.55, round: true, scale: 0.78 },
    { x: -5.3, z: -27.6, mat: mats.bronzeMat, plinth: 0.95 },
    { x: 5.3, z: -27.6, mat: mats.bustMat, plinth: 0.95 }
  ];
  for (const s of set) {
    const stand = new THREE.Group();
    stand.add(buildPlinth(mats.trimMat, mats.stoneTrim, s.round, s.plinth));
    const work = buildUrn(s.mat);
    work.position.y = s.plinth;
    if (s.scale) work.scale.setScalar(s.scale);
    stand.add(work);
    stand.position.set(s.x, 0, s.z);
    g.add(stand);
  }
  /* Stanchions ring the two pieces that stand in the middle of the walk, which is
     what they are for in a real gallery; the pairs against the end wall need none.
     Each ring is narrower than the gap between the sculpture island and the
     visitor's lane, so no rope ever crosses a picture shot. */
  const post = (x, z) => {
    for (const [geo, y] of [
      [new THREE.CylinderGeometry(0.035, 0.05, 0.72, 10), 0.36],
      [new THREE.SphereGeometry(0.05, 12, 8), 0.75],
      [new THREE.CylinderGeometry(0.11, 0.13, 0.025, 14), 0.013]
    ]) {
      const m = new THREE.Mesh(geo, mats.brass);
      m.position.set(x, y, z);
      g.add(m);
    }
  };
  const span = (ax, az, bx, bz) => {
    const dir = new THREE.Vector3(bx - ax, 0, bz - az);
    const rope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, dir.length(), 8), mats.brass);
    /* a cylinder is built along +y, so swing it onto the span rather than
       guessing at euler order */
    rope.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    rope.position.set((ax + bx) / 2, 0.56, (az + bz) / 2);
    g.add(rope);
  };
  for (const s of [-1, 1]) {
    const q = 0.95, cx = s * 2.6, cz = -14;
    for (const [px, pz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) post(cx + px * q, cz + pz * q);
    span(cx - q, cz - q, cx + q, cz - q);
    span(cx + q, cz - q, cx + q, cz + q);
    span(cx + q, cz + q, cx - q, cz + q);
    span(cx - q, cz + q, cx - q, cz - q);
  }
  return g;
}

/* ------------------------------------------------------------------- frames */

/**
 * A frame is a moulding, not a stack of steps. One cross-section is swept
 * around the opening in four mitred lengths, the way a framer cuts it: each
 * length is the same section extruded along its own axis, so two of them
 * meeting at a corner share one 45° face, the joint is exact, and the profile
 * turns the corner with the timber instead of sliding round it. That corner is
 * the whole tell -- a flat texture over a box says *printed*, four mitres say
 * *carved from one length of wood*.
 *
 * A section is a closed loop of [u, z]: u stands out from the sight edge in
 * metres, z runs along the depth as a fraction of the frame's own depth, 0 at
 * the panel and 1 at the front. Walk it from the inner back corner, out along
 * the front, round the outer edge and home again along the wall.
 */

/* Chaikin corner-cutting, on the closed loop: two passes take the dozen ruled
   lines a framer's profile gauge gives him and leave the cyma and the ovolo a
   gouge actually cuts, at four times the points and no more authoring. */
function chaikin(p) {
  const o = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25],
           [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
  }
  return o;
}

/* The four lengths, each written so its (along, out, depth) basis has the same
   handedness as the section's own -- otherwise two sides of the ring come out
   inside out and no amount of normal fixing hides it. */
function sidePoint(s, a, u, y, hw, hh, zz) {
  if (s === 0) return [a, hh + u, zz];
  if (s === 1) return [-a, -(hh + u), zz];
  if (s === 2) return [hw + u, -a, zz];
  return [-(hw + u), a, zz];
}

/** The ring: four swept lengths, each closed at both mitre faces. */
function ringGeometry(hw, hh, secIn, D) {
  /* Walk the section counter-clockwise, whatever order the preset was authored
     in. The swept band's normal comes out (dz, -du), which is the outward one
     for a counter-clockwise loop and the inward one for a clockwise one -- so
     one reversal here fixes the winding of every side at once, and leaves the
     texture coordinates turned the same way as the wood they sit on. */
  let area = 0;
  for (let i = 0; i < secIn.length; i++) {
    const p = secIn[i], q = secIn[(i + 1) % secIn.length];
    area += p[0] * q[1] - q[0] * p[1];
  }
  const sec = area > 0 ? secIn : secIn.slice().reverse();
  const v = [], t = [];
  const n = sec.length;
  let arc = 0;
  const arcs = [0];
  for (let i = 1; i <= n; i++) {
    const p = sec[i - 1], q = sec[i % n];
    arc += Math.hypot(q[0] - p[0], (q[1] - p[1]) * D);
    arcs.push(arc);
  }
  /* One copy of the carving laid across the whole section, measured from the
     sight edge whichever way the loop ended up being walked: the bead row falls
     on the canvas, the leaf on the crest, the egg-and-dart at the wall. Along
     the length it repeats at a period tied to the timber's own depth, so a slim
     modern section carries a small leaf and a monumental one a big one. */
  const vv = area > 0 ? (i => arcs[i] / arc) : (i => 1 - arcs[i] / arc);
  const RUN = 3 * D;
  for (let s = 0; s < 4; s++) {
    const half = u => (s < 2 ? hw + u : hh + u);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const [u0, z0] = sec[i], [u1, z1] = sec[j];
      const L0 = half(u0), L1 = half(u1);
      const A = sidePoint(s, -L0, u0, z0, hw, hh, z0 * D);
      const B = sidePoint(s, L0, u0, z0, hw, hh, z0 * D);
      const C = sidePoint(s, -L1, u1, z1, hw, hh, z1 * D);
      const E = sidePoint(s, L1, u1, z1, hw, hh, z1 * D);
      v.push(...A, ...C, ...B, ...B, ...C, ...E);
      const a0 = vv(i), a1 = vv(j);
      t.push(-L0, a0, -L1, a1, L0, a0, L0, a0, -L1, a1, L1, a1);
    }
    /* the mitre faces. Both lengths of a pair carry one, so each corner is
       plugged exactly once and the two faces that meet there are the same
       plane -- invisible from anywhere the eye can get to. They look out of
       opposite ends of the length, though, so one of the two fans has to run
       backwards or that corner gets plugged inside out. */
    let cu = 0, cz = 0;
    for (const [u, z] of sec) { cu += u / n; cz += z / n; }
    for (const sign of [-1, 1]) {
      const m = sidePoint(s, sign * half(cu), cu, cz, hw, hh, cz * D);
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const [u0, z0] = sec[i], [u1, z1] = sec[j];
        const A = sidePoint(s, sign * half(u0), u0, z0, hw, hh, z0 * D);
        const B = sidePoint(s, sign * half(u1), u1, z1, hw, hh, z1 * D);
        const [p, q] = sign > 0 ? [A, B] : [B, A];
        const [ap, aq] = sign > 0 ? [vv(i), vv(j)] : [vv(j), vv(i)];
        v.push(...m, ...p, ...q);
        t.push(0, ap, 0, ap, 0, aq);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(v), tex = new Float32Array(t);
  for (let i = 0; i < tex.length; i += 2) tex[i] /= RUN;
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(tex, 2));
  g.computeVertexNormals();
  return g;
}

/**
 * One picture's frame: the moulding and the panel it hangs on. Cut to the size
 * of the picture -- a small panel gets a proportionally narrower frame than a
 * monumental canvas.
 */
function buildFrame(matFrame, w, h, cfg) {
  const g = new THREE.Group();
  const scale = Math.max(0.6, Math.min(1.25, (w + h) / 3.4));
  const D = (cfg.depth || 0.13) * scale;
  const hw = w / 2, hh = h / 2;
  const sec = sectionOf(cfg.section, scale, cfg.smooth);
  const U = sec.reduce((m, p) => Math.max(m, p[0]), 0);

  const ring = new THREE.Mesh(ringGeometry(hw, hh, sec, D), matFrame);
  ring.castShadow = true; ring.receiveShadow = true;
  g.add(ring);

  const bb = new THREE.Mesh(
    new THREE.BoxGeometry(2 * (hw + U), 2 * (hh + U), 0.03 * scale), matFrame);
  bb.position.z = -0.008;
  bb.receiveShadow = true;
  g.add(bb);
  return g;
}

/* Sections are authored at the size a museum frame is actually cut, in metres
   out from the sight edge; `scale` then trims the whole thing to the picture. */
function sectionOf(sec, scale, iters) {
  let p = sec;
  for (let i = 0; i < (iters === undefined ? 2 : iters); i++) p = chaikin(p);
  return p.map(([u, z]) => [u * scale, z]);
}

const FRAME_PRESETS = {
  /* A carved giltwood section: a bead at the sight edge, a cyma recta rising to
     the crest, and an ovolo falling away to a rounded back. The crest sits at
     the front, so the light runs up the moulding and stops. */
  ornate: {
    depth: 0.135,
    section: [
      [0, 0.00], [0, 0.30], [0.010, 0.50], [0.026, 0.72], [0.046, 0.90],
      [0.070, 1.00], [0.094, 0.93], [0.112, 0.76], [0.126, 0.55],
      [0.134, 0.32], [0.136, 0.14], [0.130, 0.04], [0.118, 0.00]
    ]
  },
  /* Imperial: a broad flat fillet band running around the room, and the front
     edge standing higher at the outside than at the picture, so the canvas
     sits down in a well and the sight edge throws it into shadow. */
  roman: {
    depth: 0.12,
    section: [
      [0, 0.00], [0, 0.26], [0.012, 0.46], [0.030, 0.56], [0.075, 0.58],
      [0.120, 0.62], [0.146, 0.78], [0.158, 1.00], [0.162, 0.70],
      [0.160, 0.30], [0.152, 0.10], [0.140, 0.00]
    ]
  },
  /* A slim flat section with the outer corner taken off square: what a modern
     hang uses, and the only one here that does not pretend to be carved. */
  plain: {
    depth: 0.085,
    section: [
      [0, 0.00], [0, 0.52], [0.008, 0.86], [0.022, 1.00], [0.048, 1.00],
      [0.066, 0.92], [0.074, 0.66], [0.075, 0.30], [0.072, 0.08], [0.062, 0.00]
    ]
  },
  /* The monumental: a double ogee, two crests with a channel cut between them,
     deep enough that the second one is in shadow by the time you have walked
     past it. Big canvas, big timber. */
  baroque: {
    depth: 0.16,
    section: [
      [0, 0.00], [0, 0.34], [0.014, 0.52], [0.022, 0.74], [0.038, 0.92],
      [0.062, 1.00], [0.084, 0.88], [0.098, 0.70], [0.112, 0.86],
      [0.132, 1.00], [0.156, 0.86], [0.170, 0.58], [0.175, 0.30],
      [0.170, 0.10], [0.156, 0.00]
    ]
  }
};

/* ------------------------------------------------------- painting surfaces */

function buildPaintingMesh(painting, material) {
  /* stretched canvas: scalloped edges, slight overall buckle */
  const { w, h } = painting;
  const geo = new THREE.PlaneGeometry(w, h, Math.max(8, Math.round(w * 12)), Math.max(8, Math.round(h * 12)));
  const pos = geo.attributes.position;
  const rnd = Art.mulberry32(painting.seed || 1);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const ex = Math.max(0, Math.abs(x) - w / 2 + 0.03) / 0.03;
    const ey = Math.max(0, Math.abs(y) - h / 2 + 0.03) / 0.03;
    const edge = Math.pow(Math.max(ex, ey), 2);
    pos.setZ(i, -edge * 0.012 + Math.sin(x * 30 + y * 21) * 0.0007 + (rnd() - 0.5) * 0.0004);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

/* Brass picture light centered above a frame. */
/* Additive spill card for the picture fixtures: a square canvas whose radial
   gradient reaches alpha 0 at its inscribed ellipse, so scaling the plane
   non-uniformly cannot leave a hard rectangular edge. */
let _poolTex = null;
function lightPoolTexture() {
  if (_poolTex) return _poolTex;
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(S / 2, S * 0.34, 0, S / 2, S * 0.34, S * 0.5);
  g.addColorStop(0, 'rgba(255,226,176,0.15)');
  g.addColorStop(0.35, 'rgba(255,214,158,0.075)');
  g.addColorStop(0.72, 'rgba(232,186,126,0.022)');
  g.addColorStop(1, 'rgba(200,150,90,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  _poolTex = new THREE.CanvasTexture(c);
  _poolTex.colorSpace = THREE.SRGBColorSpace;
  return _poolTex;
}

/* Built in the picture's own space: +z leaves the wall, the tube runs along the
   frame's width. The painting group already carries the wall rotation, so
   rotating this one too would send the arm sideways along the plaster. */
function buildPictureLight(matBrass, matBrassHot, w, topY) {
  const g = new THREE.Group();
  const arm = 0.22;
  const len = Math.min(0.9, w * 0.7);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, arm, 8), matBrass);
  rod.rotation.x = Math.PI / 2;
  rod.position.set(0, 0.1, arm / 2);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, len, 12, 1, true), matBrass);
  shade.rotation.z = Math.PI / 2;
  shade.position.set(0, 0.02, arm);
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, len, 12, 1, false), matBrassHot);
  lip.rotation.z = Math.PI / 2;
  lip.scale.set(1, 0.22, 1);
  lip.position.set(0, 0.005, arm);
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.max(1.6, w * 2.4), 1.75),
    new THREE.MeshBasicMaterial({
      map: lightPoolTexture(), transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide
    })
  );
  pool.position.set(0, -0.34, 0.13);
  pool.renderOrder = 3;
  /* the pool hangs in front of the frame, so anything that eats the picture has
     to eat the pool with it -- handed up rather than hunted for by name */
  g.userData.lightPool = pool;
  g.userData.lightPool = pool;
  g.add(rod, shade, lip, pool);
  g.position.set(0, topY, 0.02);
  return g;
}

window.Museum = {
  ROOM, buildMaterials, makeEnvironment, buildSideWall, buildPanel, buildEndWalls,
  buildCeiling, buildFurniture, buildFrame, buildPictureLight, FRAME_PRESETS,
  buildPaintingMesh, canvasTexture, noiseCanvas, wallCanvas, panelBackCanvas,
  marbleCanvases, ornamentReliefCanvas, panelBacks
};

})();
