;(function(){
/* Procedural oil-painting surface generator.
   Paints layer-by-layer the way an academic easel picture is built — underpainting,
   sky, distance, middle ground, foreground, impasto accents — then ages the result
   with canvas weave, craquelure, glazing, vignetting and varnish pooling. */
'use strict';

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cvs(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/* ----------------------------------------------------------------- brushes */

function brush(ctx, rnd, x, y, len, angle, width, color, alpha, bristle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;
  const strands = bristle || 4;
  for (let i = 0; i < strands; i++) {
    const off = (i / strands - 0.5) * width;
    const w = width / strands * (0.7 + rnd() * 0.9);
    const bow = (rnd() - 0.5) * len * 0.18;
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(off, 0);
    ctx.quadraticCurveTo(off + bow, len * 0.5, off + bow * 0.4, len * (0.75 + rnd() * 0.4));
    ctx.stroke();
  }
  ctx.restore();
}

function strokeField(ctx, rnd, region, opts) {
  /* region: {x,y,w,h}; opts: {count, len, width, angle(s), colors, alpha, follow} */
  const { x, y, w, h } = region;
  for (let i = 0; i < opts.count; i++) {
    const px = x + rnd() * w, py = y + rnd() * h;
    let ang = opts.angle;
    if (opts.follow) ang = opts.follow(px, py, rnd);
    else if (Array.isArray(ang)) ang = ang[Math.floor(rnd() * ang.length)] + (rnd() - 0.5) * (opts.jitter || 0.25);
    else ang += (rnd() - 0.5) * (opts.jitter || 0.3);
    const len = opts.len * (0.55 + rnd() * 0.95);
    const width = opts.width * (0.55 + rnd() * 0.9);
    const color = opts.colors[Math.floor(rnd() * opts.colors.length)];
    const alpha = opts.alpha * (0.55 + rnd() * 0.7);
    brush(ctx, rnd, px, py, len, ang, width, color, Math.min(alpha, 1), opts.bristle);
  }
}

function blob(ctx, rnd, cx, cy, rx, ry, color, alpha, strokes, angle) {
  for (let i = 0; i < strokes; i++) {
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd());
    brush(ctx, rnd, cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r,
      rx * 0.35, angle === undefined ? a : angle, ry * 0.32, color, alpha, 3);
  }
}

function h渐变(ctx, x, y, w, h, stops, vertical) {
  const g = vertical
    ? ctx.createLinearGradient(x, y, x, y + h)
    : ctx.createLinearGradient(x, y, x + w, y);
  stops.forEach(([p, c]) => g.addColorStop(p, c));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

/* -------------------------------------------------------------- compositions */

const COMPOSITIONS = {

  /* Stormy romantic sea cliff — slate, ochre, pale rose */
  storm_cliffs(g, ctx, rnd, W, H) {
    const sky = ['#2b323c', '#4a525f', '#8d8578', '#c9b9a2', '#e7d4b8'];
    h渐变(ctx, 0, 0, W, H * 0.72, [[0, sky[0]], [0.35, sky[1]], [0.68, sky[3]], [1, sky[4]]], true);
    /* luminous break in the clouds */
    ctx.globalCompositeOperation = 'screen';
    const gl = ctx.createRadialGradient(W * 0.62, H * 0.42, 0, W * 0.62, H * 0.42, W * 0.42);
    gl.addColorStop(0, 'rgba(250,226,186,.85)');
    gl.addColorStop(0.4, 'rgba(206,170,132,.30)');
    gl.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 46; i++) {
      const cy = H * (0.04 + rnd() * 0.42);
      blob(ctx, rnd, rnd() * W, cy, W * (0.06 + rnd() * 0.16), H * (0.012 + rnd() * 0.03),
        rnd() > 0.5 ? '#7d7669' : '#c2b6a2', 0.20, 26, 0.06);
    }
    /* sea */
    h渐变(ctx, 0, H * 0.60, W, H * 0.40, [[0, '#6d6a5f'], [0.4, '#414a50'], [1, '#1d2229']], true);
    strokeField(ctx, rnd, { x: 0, y: H * 0.62, w: W, h: H * 0.30 }, {
      count: 900, len: W * 0.05, width: H * 0.006, angle: [0, 0.05], jitter: 0.1,
      colors: ['#8b8877', '#5e666d', '#3b4249', '#c6bda6', '#22282f'], alpha: 0.4, bristle: 5
    });
    /* breaking foam */
    for (let i = 0; i < 26; i++) {
      const cx = rnd() * W, cy = H * (0.66 + rnd() * 0.3);
      blob(ctx, rnd, cx, cy, W * (0.03 + rnd() * 0.07), H * 0.012, '#efe8dc', 0.5, 22, 0);
    }
    /* cliffs */
    ctx.fillStyle = '#20242a';
    ctx.beginPath();
    ctx.moveTo(0, H); ctx.lineTo(0, H * 0.42);
    ctx.lineTo(W * 0.10, H * 0.52); ctx.lineTo(W * 0.17, H * 0.66); ctx.lineTo(W * 0.24, H);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(W, H); ctx.lineTo(W, H * 0.50);
    ctx.lineTo(W * 0.90, H * 0.60); ctx.lineTo(W * 0.84, H * 0.74); ctx.lineTo(W * 0.79, H);
    ctx.closePath(); ctx.fill();
    strokeField(ctx, rnd, { x: 0, y: H * 0.45, w: W * 0.24, h: H * 0.55 }, {
      count: 260, len: H * 0.06, width: H * 0.008, angle: [-1.35, -1.5], jitter: 0.2,
      colors: ['#3a4048', '#5b5a52', '#171a1f', '#8c7f6a'], alpha: 0.5
    });
    strokeField(ctx, rnd, { x: W * 0.79, y: H * 0.52, w: W * 0.21, h: H * 0.48 }, {
      count: 220, len: H * 0.06, width: H * 0.008, angle: [-1.7, -1.9], jitter: 0.2,
      colors: ['#3a4048', '#6b6355', '#171a1f'], alpha: 0.5
    });
    /* boat */
    ctx.save();
    ctx.globalAlpha = 0.85; ctx.fillStyle = '#1a1d21';
    ctx.beginPath();
    ctx.moveTo(W * 0.55, H * 0.70); ctx.lineTo(W * 0.60, H * 0.70);
    ctx.lineTo(W * 0.585, H * 0.72); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#1a1d21'; ctx.lineWidth = W * 0.002;
    ctx.beginPath(); ctx.moveTo(W * 0.572, H * 0.70); ctx.lineTo(W * 0.575, H * 0.655); ctx.stroke();
    ctx.restore();
    return { castShadow: 0.7, warm: 0.10 };
  },

  /* Classical ruins at golden hour */
  classical_ruins(g, ctx, rnd, W, H) {
    h渐变(ctx, 0, 0, W, H * 0.62, [[0, '#5d7f96'], [0.45, '#b9b19a'], [0.78, '#e3c795'], [1, '#f0dcae']], true);
    for (let i = 0; i < 22; i++)
      blob(ctx, rnd, rnd() * W, H * (0.05 + rnd() * 0.25), W * 0.12, H * 0.02, '#fdf3e0', 0.35, 20, 0.03);
    /* distant hills */
    ctx.fillStyle = '#93907a';
    ctx.beginPath(); ctx.moveTo(0, H * 0.60);
    for (let x = 0; x <= W; x += W / 24) ctx.lineTo(x, H * (0.57 + Math.sin(x / W * 6.0) * 0.022 + rnd() * 0.008));
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    /* ground */
    h渐变(ctx, 0, H * 0.60, W, H * 0.40, [[0, '#a89468'], [0.5, '#87734b'], [1, '#4f4530']], true);
    strokeField(ctx, rnd, { x: 0, y: H * 0.64, w: W, h: H * 0.36 }, {
      count: 780, len: W * 0.045, width: H * 0.007, angle: [0, 0.08], jitter: 0.12,
      colors: ['#c2ab7b', '#8e7a50', '#5d5138', '#d8c99b', '#3e3626'], alpha: 0.42
    });
    /* cypresses */
    const drawCyp = (cx, base, h, w) => {
      ctx.fillStyle = '#3b4634';
      ctx.beginPath();
      ctx.moveTo(cx - w, base);
      ctx.quadraticCurveTo(cx - w * 0.9, base - h * 0.6, cx, base - h);
      ctx.quadraticCurveTo(cx + w * 0.9, base - h * 0.6, cx + w, base);
      ctx.closePath(); ctx.fill();
      strokeField(ctx, rnd, { x: cx - w, y: base - h, w: w * 2, h: h }, {
        count: 90, len: h * 0.16, width: w * 0.3, angle: [-1.57], jitter: 0.3,
        colors: ['#556447', '#2b3327', '#7a8a5e'], alpha: 0.5
      });
    };
    drawCyp(W * 0.10, H * 0.70, H * 0.34, W * 0.022);
    drawCyp(W * 0.16, H * 0.72, H * 0.28, W * 0.019);
    drawCyp(W * 0.88, H * 0.68, H * 0.30, W * 0.02);
    /* column group */
    const stone = ['#e8dcbe', '#cfbf9c', '#a8946f', '#7d6b4c'];
    const entab = H * 0.26;
    for (let i = 0; i < 5; i++) {
      const cx = W * (0.32 + i * 0.085), top = H * 0.26, base = H * 0.72;
      const w = W * 0.021;
      ctx.fillStyle = '#cbbda0';
      ctx.fillRect(cx - w, top, w * 2, base - top);
      strokeField(ctx, rnd, { x: cx - w, y: top, w: w * 2, h: base - top }, {
        count: 70, len: (base - top) * 0.22, width: w * 0.5, angle: [-1.57], jitter: 0.06,
        colors: stone, alpha: 0.5
      });
      ctx.fillStyle = '#8d7c5b';
      ctx.fillRect(cx - w * 1.5, base - H * 0.012, w * 3, H * 0.012);
      ctx.fillRect(cx - w * 1.45, top - H * 0.014, w * 2.9, H * 0.014);
    }
    ctx.fillStyle = '#d8cbaa';
    ctx.fillRect(W * 0.30, entab - H * 0.02, W * 0.42, H * 0.035);
    strokeField(ctx, rnd, { x: W * 0.30, y: entab - H * 0.02, w: W * 0.42, h: H * 0.035 }, {
      count: 200, len: W * 0.03, width: H * 0.006, angle: [0], jitter: 0.06,
      colors: stone, alpha: 0.5
    });
    /* fallen drum in the foreground */
    ctx.fillStyle = '#c3b493';
    ctx.beginPath(); ctx.ellipse(W * 0.42, H * 0.86, W * 0.09, H * 0.035, 0.06, 0, 7); ctx.fill();
    strokeField(ctx, rnd, { x: W * 0.33, y: H * 0.82, w: W * 0.18, h: H * 0.08 }, {
      count: 160, len: W * 0.02, width: H * 0.008, angle: [-1.57, 1.57], jitter: 0.4,
      colors: stone, alpha: 0.55
    });
    /* warm low light */
    ctx.globalCompositeOperation = 'screen';
    const s = ctx.createRadialGradient(W * 0.72, H * 0.55, 0, W * 0.72, H * 0.55, W * 0.5);
    s.addColorStop(0, 'rgba(255,214,150,.55)'); s.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = s; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    return { castShadow: 0.55, warm: 0.14 };
  },

  /* Nocturne village under a moonlit sky */
  nocturne(g, ctx, rnd, W, H) {
    h渐变(ctx, 0, 0, W, H * 0.7, [[0, '#0c1424'], [0.5, '#182a44'], [1, '#2f4459']], true);
    for (let i = 0; i < 240; i++) {
      const x = rnd() * W, y = rnd() * H * 0.6, r = rnd();
      ctx.globalAlpha = 0.25 + r * 0.7;
      ctx.fillStyle = r > 0.85 ? '#ffe9b0' : r > 0.6 ? '#cfe3ff' : '#eef3ff';
      ctx.beginPath(); ctx.arc(x, y, r * 2.0 + 0.4, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    /* moon */
    ctx.fillStyle = '#f6f1de';
    ctx.beginPath(); ctx.arc(W * 0.72, H * 0.2, W * 0.035, 0, 7); ctx.fill();
    ctx.globalCompositeOperation = 'screen';
    const mg = ctx.createRadialGradient(W * 0.72, H * 0.2, 0, W * 0.72, H * 0.2, W * 0.22);
    mg.addColorStop(0, 'rgba(226,222,196,.55)'); mg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mg; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    /* swirling clouds */
    for (let i = 0; i < 26; i++) {
      const cx = rnd() * W, cy = H * (0.15 + rnd() * 0.4);
      strokeField(ctx, rnd, { x: cx - W * 0.1, y: cy - H * 0.02, w: W * 0.2, h: H * 0.05 }, {
        count: 45, len: W * 0.055, width: H * 0.008, angle: [0.12, -0.1], jitter: 0.2,
        colors: ['#3c5470', '#5d7793', '#8ba6bf', '#22344c'], alpha: 0.34
      });
    }
    /* snow field */
    h渐变(ctx, 0, H * 0.62, W, H * 0.38, [[0, '#69778c'], [0.45, '#9dabbb'], [1, '#d7e0e8']], true);
    strokeField(ctx, rnd, { x: 0, y: H * 0.64, w: W, h: H * 0.36 }, {
      count: 760, len: W * 0.05, width: H * 0.007, angle: [0, 0.06], jitter: 0.1,
      colors: ['#b9c6d2', '#8794a6', '#e8eef3', '#5d6c80'], alpha: 0.4
    });
    /* houses */
    for (let i = 0; i < 7; i++) {
      const cx = W * (0.05 + i * 0.13 + rnd() * 0.03), hw = W * (0.05 + rnd() * 0.04);
      const hb = H * (0.10 + rnd() * 0.08), base = H * (0.62 + rnd() * 0.04);
      ctx.fillStyle = '#131b26';
      ctx.fillRect(cx, base - hb, hw, hb);
      ctx.beginPath();
      ctx.moveTo(cx - hw * 0.1, base - hb); ctx.lineTo(cx + hw * 0.5, base - hb * 1.5);
      ctx.lineTo(cx + hw * 1.1, base - hb); ctx.closePath(); ctx.fill();
      const win = 0.4 + rnd() * 0.6;
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(255,196,96,${win})`;
      ctx.fillRect(cx + hw * 0.25, base - hb * 0.6, hw * 0.18, hb * 0.22);
      ctx.fillStyle = `rgba(255,170,80,${win * 0.5})`;
      const lg = ctx.createRadialGradient(cx + hw * 0.34, base - hb * 0.5, 0, cx + hw * 0.34, base - hb * 0.5, hw * 0.9);
      lg.addColorStop(0, `rgba(255,180,90,${0.45 * win})`); lg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = lg; ctx.fillRect(cx - hw, base - hb * 1.6, hw * 3, hb * 1.8);
      ctx.globalCompositeOperation = 'source-over';
    }
    /* bare tree */
    ctx.strokeStyle = '#0f1620'; ctx.lineCap = 'round';
    const tree = (x, y, ang, len, depth) => {
      if (depth === 0 || len < W * 0.008) return;
      ctx.lineWidth = Math.max(1, len * 0.09);
      ctx.beginPath(); ctx.moveTo(x, y);
      const nx = x + Math.cos(ang) * len, ny = y + Math.sin(ang) * len;
      ctx.lineTo(nx, ny); ctx.stroke();
      tree(nx, ny, ang - 0.45 - rnd() * 0.3, len * 0.72, depth - 1);
      tree(nx, ny, ang + 0.45 + rnd() * 0.3, len * 0.72, depth - 1);
    };
    tree(W * 0.2, H * 0.86, -1.57, H * 0.16, 5);
    return { castShadow: 0.45, warm: 0.06 };
  },

  /* Dutch meadow with canal and windmill */
  dutch_meadow(g, ctx, rnd, W, H) {
    h渐变(ctx, 0, 0, W, H * 0.58, [[0, '#7ea3bd'], [0.5, '#c3cfc6'], [1, '#e6dfc4']], true);
    for (let i = 0; i < 24; i++)
      blob(ctx, rnd, rnd() * W, H * (0.04 + rnd() * 0.3), W * 0.13, H * 0.03, '#f4f1e6', 0.5, 24, 0.04);
    /* polder strip */
    h渐变(ctx, 0, H * 0.5, W, H * 0.5, [[0, '#87a05e'], [0.4, '#5f7d43'], [1, '#3d5530']], true);
    strokeField(ctx, rnd, { x: 0, y: H * 0.52, w: W, h: H * 0.2 }, {
      count: 520, len: H * 0.05, width: H * 0.006, angle: [-1.57, -1.4, -1.7], jitter: 0.2,
      colors: ['#a9c273', '#6f8b4c', '#40592f', '#d7dfa4'], alpha: 0.45
    });
    /* canal */
    ctx.fillStyle = '#7f93a1';
    ctx.beginPath();
    ctx.moveTo(W * 0.44, H * 0.56); ctx.lineTo(W * 0.56, H * 0.56);
    ctx.lineTo(W * 0.98, H); ctx.lineTo(W * 0.06, H); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(214,224,224,.45)';
    ctx.beginPath();
    ctx.moveTo(W * 0.47, H * 0.56); ctx.lineTo(W * 0.53, H * 0.56);
    ctx.lineTo(W * 0.72, H); ctx.lineTo(W * 0.3, H); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    strokeField(ctx, rnd, { x: W * 0.1, y: H * 0.62, w: W * 0.8, h: H * 0.36 }, {
      count: 520, len: W * 0.06, width: H * 0.006, angle: [0, 0.06], jitter: 0.12,
      colors: ['#8fa3ad', '#5f7280', '#c9d6d4', '#3f5058'], alpha: 0.42
    });
    /* windmill */
    const mx = W * 0.24, my = H * 0.545;
    ctx.fillStyle = '#4a3a2b';
    ctx.beginPath();
    ctx.moveTo(mx - W * 0.035, my); ctx.lineTo(mx + W * 0.035, my);
    ctx.lineTo(mx + W * 0.018, my - H * 0.14); ctx.lineTo(mx - W * 0.018, my - H * 0.14);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2f2a24';
    ctx.beginPath();
    ctx.moveTo(mx - W * 0.026, my - H * 0.14); ctx.lineTo(mx + W * 0.026, my - H * 0.14);
    ctx.lineTo(mx, my - H * 0.19); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#33291f'; ctx.lineWidth = W * 0.0035;
    const rot = 0.5;
    for (let k = 0; k < 4; k++) {
      const a = rot + k * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(mx, my - H * 0.155);
      ctx.lineTo(mx + Math.cos(a) * W * 0.11, my - H * 0.155 + Math.sin(a) * W * 0.11);
      ctx.stroke();
    }
    /* foreground grass + flowers */
    strokeField(ctx, rnd, { x: 0, y: H * 0.84, w: W, h: H * 0.16 }, {
      count: 620, len: H * 0.09, width: H * 0.008, angle: [-1.57, -1.35, -1.8], jitter: 0.25,
      colors: ['#4f6a38', '#7f9a4c', '#2c3d22', '#b8c47c'], alpha: 0.5
    });
    for (let i = 0; i < 190; i++) {
      ctx.fillStyle = ['#d9455a', '#e8c34a', '#e9e4d4', '#b56ad9'][Math.floor(rnd() * 4)];
      ctx.globalAlpha = 0.5 + rnd() * 0.5;
      ctx.beginPath(); ctx.arc(rnd() * W, H * (0.86 + rnd() * 0.14), 1.6 + rnd() * 2.4, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    return { castShadow: 0.5, warm: 0.1 };
  },

  /* Impressionist garden path with parasols */
  garden_path(g, ctx, rnd, W, H) {
    h渐变(ctx, 0, 0, W, H, [[0, '#4c6b45'], [0.4, '#77955b'], [1, '#c2b184']], true);
    /* dappled canopy */
    for (let i = 0; i < 240; i++) {
      const x = rnd() * W, y = rnd() * H * 0.55;
      blob(ctx, rnd, x, y, W * (0.02 + rnd() * 0.05), H * (0.012 + rnd() * 0.03),
        ['#3f5c3a', '#6f8f52', '#a8bd6d', '#2b3f2c', '#e0d68a'][Math.floor(rnd() * 5)], 0.5, 9, rnd() * 6);
    }
    /* path */
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(W * 0.36, H * 0.5); ctx.lineTo(W * 0.62, H * 0.5);
    ctx.lineTo(W * 1.02, H); ctx.lineTo(-0.02 * W, H); ctx.closePath();
    ctx.clip();
    h渐变(ctx, 0, H * 0.5, W, H * 0.5, [[0, '#b9a37a'], [1, '#e0cba2']], true);
    strokeField(ctx, rnd, { x: 0, y: H * 0.5, w: W, h: H * 0.5 }, {
      count: 900, len: W * 0.035, width: H * 0.008, angle: [-1.57, -1.3, -1.8], jitter: 0.3,
      colors: ['#cbb087', '#9d8560', '#efdfbe', '#7f6a4c', '#e9c66f'], alpha: 0.45
    });
    /* shade pools on the path */
    ctx.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 16; i++) {
      const x = rnd() * W, y = H * (0.58 + rnd() * 0.42);
      const sg = ctx.createRadialGradient(x, y, 0, x, y, W * 0.09);
      sg.addColorStop(0, 'rgba(120,130,110,.55)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg; ctx.fillRect(x - W * 0.1, y - H * 0.1, W * 0.2, H * 0.2);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    /* flower beds */
    strokeField(ctx, rnd, { x: 0, y: H * 0.62, w: W * 0.3, h: H * 0.38 }, {
      count: 500, len: H * 0.06, width: H * 0.008, angle: [-1.57, -1.3], jitter: 0.3,
      colors: ['#3d5c36', '#6a8a46', '#c2506a', '#e2c04a', '#8a4fa0'], alpha: 0.5
    });
    strokeField(ctx, rnd, { x: W * 0.72, y: H * 0.6, w: W * 0.28, h: H * 0.4 }, {
      count: 460, len: H * 0.06, width: H * 0.008, angle: [-1.57, -1.8], jitter: 0.3,
      colors: ['#3d5c36', '#78964e', '#d0607a', '#ecd06a'], alpha: 0.5
    });
    /* figures with parasols */
    const figure = (cx, cy, s, dress, parasol) => {
      ctx.fillStyle = dress;
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.26, cy + s * 0.9);
      ctx.quadraticCurveTo(cx - s * 0.16, cy - s * 0.2, cx, cy - s * 0.1);
      ctx.quadraticCurveTo(cx + s * 0.16, cy - s * 0.2, cx + s * 0.26, cy + s * 0.9);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2b2622';
      ctx.beginPath(); ctx.arc(cx, cy - s * 0.26, s * 0.1, 0, 7); ctx.fill();
      ctx.strokeStyle = parasol; ctx.lineWidth = s * 0.03;
      ctx.beginPath(); ctx.moveTo(cx + s * 0.05, cy - s * 0.2); ctx.lineTo(cx + s * 0.12, cy - s * 0.75); ctx.stroke();
      ctx.fillStyle = parasol;
      ctx.beginPath(); ctx.arc(cx + s * 0.12, cy - s * 0.75, s * 0.3, Math.PI, 0); ctx.fill();
    };
    figure(W * 0.5, H * 0.66, H * 0.16, '#e8e2d2', '#c7514f');
    figure(W * 0.62, H * 0.72, H * 0.2, '#5b6f8c', '#e6dcc0');
    /* light flecks */
    for (let i = 0; i < 300; i++) {
      ctx.globalAlpha = 0.25 + rnd() * 0.5;
      ctx.fillStyle = ['#f3e9b8', '#e8d06a', '#fff8dc', '#9fc47f'][Math.floor(rnd() * 4)];
      const s = 2 + rnd() * 7;
      ctx.fillRect(rnd() * W, rnd() * H, s, s * 0.6);
    }
    ctx.globalAlpha = 1;
    return { castShadow: 0.4, warm: 0.12 };
  },

  /* Baroque vanitas still life */
  vanitas(g, ctx, rnd, W, H) {
    h渐变(ctx, 0, 0, W, H, [[0, '#241d17'], [0.55, '#15100c'], [1, '#0a0806']], true);
    /* table */
    h渐变(ctx, 0, H * 0.62, W, H * 0.38, [[0, '#6b4e33'], [1, '#33241a']], true);
    strokeField(ctx, rnd, { x: 0, y: H * 0.64, w: W, h: H * 0.36 }, {
      count: 420, len: W * 0.09, width: H * 0.007, angle: [0, 0.03], jitter: 0.06,
      colors: ['#7d5c3c', '#543c27', '#2a1d14', '#a1794e'], alpha: 0.5
    });
    /* linen */
    ctx.fillStyle = '#cfc4ae';
    ctx.beginPath();
    ctx.moveTo(W * 0.06, H * 0.72); ctx.quadraticCurveTo(W * 0.3, H * 0.62, W * 0.58, H * 0.71);
    ctx.lineTo(W * 0.52, H * 0.95); ctx.quadraticCurveTo(W * 0.28, H * 0.99, W * 0.05, H * 0.9);
    ctx.closePath(); ctx.fill();
    strokeField(ctx, rnd, { x: W * 0.04, y: H * 0.62, w: W * 0.56, h: H * 0.38 }, {
      count: 420, len: H * 0.07, width: H * 0.008, angle: [-1.2, -1.6, -0.7], jitter: 0.4,
      colors: ['#e6ddc9', '#b3a68d', '#8f836c', '#fffaf0'], alpha: 0.5
    });
    /* books */
    const book = (x, y, w, h, c) => {
      ctx.fillStyle = c; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#d9cfae'; ctx.fillRect(x, y + h * 0.12, w * 0.04, h * 0.76);
      strokeField(ctx, rnd, { x, y, w, h }, {
        count: 60, len: w * 0.5, width: h * 0.2, angle: [0], jitter: 0.1,
        colors: [c, '#00000020', '#ffffff18'], alpha: 0.35
      });
    };
    book(W * 0.1, H * 0.62, W * 0.3, H * 0.05, '#5c2f2a');
    book(W * 0.12, H * 0.57, W * 0.27, H * 0.05, '#3f4a35');
    /* skull */
    const sx = W * 0.68, sy = H * 0.5;
    ctx.fillStyle = '#cbbfa4';
    ctx.beginPath(); ctx.ellipse(sx, sy, W * 0.1, H * 0.09, 0.05, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(sx, sy + H * 0.075, W * 0.055, H * 0.035, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#1a1611';
    ctx.beginPath(); ctx.ellipse(sx - W * 0.038, sy - H * 0.01, W * 0.02, H * 0.02, 0.2, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(sx + W * 0.038, sy - H * 0.01, W * 0.02, H * 0.02, -0.2, 0, 7); ctx.fill();
    ctx.fillRect(sx - W * 0.006, sy + H * 0.02, W * 0.012, H * 0.018);
    strokeField(ctx, rnd, { x: sx - W * 0.1, y: sy - H * 0.09, w: W * 0.2, h: H * 0.18 }, {
      count: 240, len: W * 0.02, width: H * 0.008, angle: [-0.6, -1.0, 0.4], jitter: 0.6,
      colors: ['#e2d8bd', '#a89b7d', '#6d6250', '#fff6e2'], alpha: 0.45
    });
    /* candle + flame */
    ctx.fillStyle = '#ded3b8'; ctx.fillRect(W * 0.42, H * 0.4, W * 0.03, H * 0.22);
    ctx.globalCompositeOperation = 'screen';
    const fg = ctx.createRadialGradient(W * 0.435, H * 0.36, 0, W * 0.435, H * 0.36, W * 0.2);
    fg.addColorStop(0, 'rgba(255,222,150,.9)'); fg.addColorStop(0.25, 'rgba(230,150,60,.35)');
    fg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.ellipse(W * 0.435, H * 0.365, W * 0.011, H * 0.022, 0, 0, 7); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    /* rose, fallen petals */
    blob(ctx, rnd, W * 0.3, H * 0.7, W * 0.035, H * 0.028, '#a8324a', 0.75, 26, 1.2);
    for (let i = 0; i < 8; i++)
      blob(ctx, rnd, W * (0.2 + rnd() * 0.4), H * (0.78 + rnd() * 0.14), W * 0.014, H * 0.008, '#c1485c', 0.7, 8, rnd() * 3);
    /* raking highlight */
    ctx.globalCompositeOperation = 'screen';
    const rg = ctx.createLinearGradient(0, 0, W, H);
    rg.addColorStop(0, 'rgba(210,170,110,.18)'); rg.addColorStop(0.5, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    return { castShadow: 0.8, warm: 0.16 };
  },

  /* Portrait of a noblewoman in black, lace at the throat */
  noblewoman(g, ctx, rnd, W, H) {
    h渐变(ctx, 0, 0, W, H, [[0, '#4a4238'], [0.5, '#332c25'], [1, '#1d1915']], true);
    strokeField(ctx, rnd, { x: 0, y: 0, w: W, h: H }, {
      count: 500, len: W * 0.22, width: H * 0.02, angle: [-1.5, -1.7], jitter: 0.25,
      colors: ['#584d40', '#3b332b', '#2a231d', '#6d6050'], alpha: 0.3, bristle: 6
    });
    const cx = W * 0.5, head = H * 0.26;
    /* dress */
    ctx.fillStyle = '#14120f';
    ctx.beginPath();
    ctx.moveTo(cx - W * 0.36, H);
    ctx.quadraticCurveTo(cx - W * 0.3, H * 0.6, cx - W * 0.14, H * 0.5);
    ctx.lineTo(cx + W * 0.14, H * 0.5);
    ctx.quadraticCurveTo(cx + W * 0.3, H * 0.6, cx + W * 0.36, H);
    ctx.closePath(); ctx.fill();
    strokeField(ctx, rnd, { x: cx - W * 0.36, y: H * 0.5, w: W * 0.72, h: H * 0.5 }, {
      count: 420, len: H * 0.14, width: H * 0.016, angle: [-1.4, -1.7, -1.2], jitter: 0.3,
      colors: ['#211d18', '#0b0a08', '#3a332a'], alpha: 0.5, bristle: 5
    });
    /* lace collar */
    ctx.fillStyle = '#ddd3bd';
    ctx.beginPath(); ctx.ellipse(cx, H * 0.505, W * 0.16, H * 0.04, 0, 0, 7); ctx.fill();
    strokeField(ctx, rnd, { x: cx - W * 0.16, y: H * 0.465, w: W * 0.32, h: H * 0.08 }, {
      count: 300, len: W * 0.02, width: H * 0.005, angle: [rnd() * 6], jitter: 3,
      colors: ['#f3ecd9', '#c2b69c', '#8f8570'], alpha: 0.6
    });
    /* neck + face */
    ctx.fillStyle = '#c9a383';
    ctx.fillRect(cx - W * 0.045, H * 0.42, W * 0.09, H * 0.09);
    ctx.fillStyle = '#dcb693';
    ctx.beginPath(); ctx.ellipse(cx, head + H * 0.06, W * 0.105, H * 0.13, 0.02, 0, 7); ctx.fill();
    /* hair */
    ctx.fillStyle = '#3a2c22';
    ctx.beginPath(); ctx.ellipse(cx, head + H * 0.02, W * 0.125, H * 0.135, 0.02, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx - W * 0.1, head + H * 0.11, W * 0.045, H * 0.06, 0.3, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + W * 0.1, head + H * 0.11, W * 0.045, H * 0.06, -0.3, 0, 7); ctx.fill();
    strokeField(ctx, rnd, { x: cx - W * 0.13, y: head - H * 0.08, w: W * 0.26, h: H * 0.24 }, {
      count: 300, len: H * 0.06, width: H * 0.006, angle: [-1.2, -1.9, -0.6], jitter: 0.4,
      colors: ['#4d3a2c', '#241a13', '#6e5540'], alpha: 0.5
    });
    /* features */
    ctx.fillStyle = '#8d6a52';
    ctx.beginPath(); ctx.ellipse(cx - W * 0.038, head + H * 0.045, W * 0.014, H * 0.008, 0.1, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + W * 0.038, head + H * 0.045, W * 0.014, H * 0.008, -0.1, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a1f19';
    ctx.beginPath(); ctx.arc(cx - W * 0.036, head + H * 0.045, W * 0.006, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + W * 0.036, head + H * 0.045, W * 0.006, 0, 7); ctx.fill();
    ctx.strokeStyle = '#a67c5e'; ctx.lineWidth = W * 0.004;
    ctx.beginPath(); ctx.moveTo(cx - W * 0.05, head + H * 0.028); ctx.quadraticCurveTo(cx - W * 0.036, head + H * 0.02, cx - W * 0.022, head + H * 0.028); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + W * 0.022, head + H * 0.028); ctx.quadraticCurveTo(cx + W * 0.036, head + H * 0.02, cx + W * 0.05, head + H * 0.028); ctx.stroke();
    ctx.strokeStyle = '#b08062'; ctx.lineWidth = W * 0.005;
    ctx.beginPath(); ctx.moveTo(cx, head + H * 0.055); ctx.lineTo(cx - W * 0.008, head + H * 0.085);
    ctx.lineTo(cx + W * 0.006, head + H * 0.09); ctx.stroke();
    ctx.strokeStyle = '#96584f'; ctx.lineWidth = W * 0.007;
    ctx.beginPath(); ctx.moveTo(cx - W * 0.02, head + H * 0.11);
    ctx.quadraticCurveTo(cx, head + H * 0.122, cx + W * 0.02, head + H * 0.11); ctx.stroke();
    /* modelling with light from the left */
    ctx.globalCompositeOperation = 'multiply';
    const sh = ctx.createLinearGradient(cx - W * 0.11, 0, cx + W * 0.11, 0);
    sh.addColorStop(0, 'rgba(255,255,255,1)'); sh.addColorStop(0.55, 'rgba(250,240,225,1)');
    sh.addColorStop(1, 'rgba(110,90,72,1)');
    ctx.fillStyle = sh;
    ctx.beginPath(); ctx.ellipse(cx, head + H * 0.06, W * 0.11, H * 0.135, 0.02, 0, 7); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalCompositeOperation = 'screen';
    const hl = ctx.createRadialGradient(cx - W * 0.05, head + H * 0.03, 0, cx - W * 0.05, head + H * 0.03, W * 0.09);
    hl.addColorStop(0, 'rgba(255,226,190,.42)'); hl.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hl;
    ctx.beginPath(); ctx.ellipse(cx, head + H * 0.06, W * 0.12, H * 0.15, 0.02, 0, 7); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    /* flesh brushwork */
    strokeField(ctx, rnd, { x: cx - W * 0.11, y: head - H * 0.06, w: W * 0.22, h: H * 0.26 }, {
      count: 420, len: W * 0.018, width: H * 0.006, angle: [rnd() * 6], jitter: 3.0,
      colors: ['#e6c3a0', '#c1906b', '#f0dcc0', '#a87b5c'], alpha: 0.35
    });
    /* hand */
    ctx.fillStyle = '#d5b08c';
    ctx.beginPath(); ctx.ellipse(cx + W * 0.08, H * 0.78, W * 0.055, H * 0.04, -0.3, 0, 7); ctx.fill();
    strokeField(ctx, rnd, { x: cx + W * 0.03, y: H * 0.74, w: W * 0.11, h: H * 0.08 }, {
      count: 120, len: H * 0.03, width: H * 0.005, angle: [-1.2, -0.5], jitter: 0.4,
      colors: ['#e7c9a4', '#b08a68', '#f6e2c8'], alpha: 0.5
    });
    return { castShadow: 0.85, warm: 0.12 };
  }
};

/* ------------------------------------------------------------------- ageing */

function ageSurface(ctx, rnd, W, H, strength) {
  /* 1. canvas weave as a fine cross hatch */
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.05 * strength;
  const step = Math.max(3, Math.round(W / 260));
  ctx.strokeStyle = '#efe7d8'; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  ctx.strokeStyle = '#5a5045';
  for (let y = 0; y < H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.restore();

  /* 2. glazing / local colour drift */
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 12; i++) {
    const x = rnd() * W, y = rnd() * H, r = W * (0.15 + rnd() * 0.4);
    const gl = ctx.createRadialGradient(x, y, 0, x, y, r);
    const warm = rnd() > 0.4;
    gl.addColorStop(0, warm ? 'rgba(150,96,40,.35)' : 'rgba(60,74,90,.30)');
    gl.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = gl; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();

  /* 3. aged amber varnish, pooled at the edges */
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const vg = ctx.createRadialGradient(W * 0.5, H * 0.48, Math.min(W, H) * 0.25, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(255,250,238,1)');
  vg.addColorStop(0.65, 'rgba(246,236,215,1)');
  vg.addColorStop(1, 'rgba(206,186,156,1)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  ctx.restore();

  /* 4. craquelure — orthogonal fracture net, denser in the mid tones */
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const cells = Math.round(170 * strength);
  const pts = [];
  for (let i = 0; i < cells; i++) pts.push([rnd() * W, rnd() * H]);
  ctx.lineWidth = Math.max(0.7, W / 900);
  ctx.strokeStyle = 'rgba(236,228,206,.55)';
  for (const [px, py] of pts) {
    let best = -1, best2 = -1, d1 = Infinity, d2 = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const dx = pts[i][0] - px, dy = pts[i][1] - py;
      const d = dx * dx + dy * dy;
      if (d < d1) { d2 = d1; best2 = best; best = i; d1 = d; d2 = d; }
      else if (d < d2) { d2 = d; best2 = i; }
    }
    if (best2 >= 0 && d1 < (W / 8) * (W / 8)) {
      ctx.globalAlpha = 0.25 + rnd() * 0.45;
      ctx.beginPath();
      ctx.moveTo(px + (rnd() - 0.5) * 4, py + (rnd() - 0.5) * 4);
      ctx.lineTo(pts[best2][0] + (rnd() - 0.5) * 4, pts[best2][1] + (rnd() - 0.5) * 4);
      ctx.stroke();
    }
  }
  ctx.restore();

  /* 5. dust and varnish bloom */
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 260; i++) {
    ctx.globalAlpha = 0.04 + rnd() * 0.12;
    ctx.fillStyle = '#efe4c8';
    ctx.beginPath(); ctx.arc(rnd() * W, rnd() * H, rnd() * 2.2, 0, 7); ctx.fill();
  }
  ctx.restore();

  /* 6. raking highlight of the varnish layer */
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const rg = ctx.createLinearGradient(0, 0, W * 0.9, H);
  rg.addColorStop(0, 'rgba(255,244,214,.16)');
  rg.addColorStop(0.5, 'rgba(255,244,214,.03)');
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/* ------------------------------------------------------------ public entry */

const ASPECTS = {
  storm_cliffs: 1.5, classical_ruins: 1.45, nocturne: 0.72, dutch_meadow: 1.5,
  garden_path: 0.72, vanitas: 1.25, noblewoman: 0.72
};

/**
 * Paints one artwork. Returns { canvas, meta } where meta carries the height map
 * used to derive impasto normals.
 */
function makePainting(kind, targetW, seed, opts) {
  opts = opts || {};
  const aspect = opts.aspect || ASPECTS[kind] || 1.3;
  const W = Math.round(targetW);
  const H = Math.round(targetW / aspect);
  const canvas = cvs(W, H);
  const ctx = canvas.getContext('2d');
  const rnd = mulberry32(seed >>> 0);

  /* linen ground */
  ctx.fillStyle = '#8a7c63';
  ctx.fillRect(0, 0, W, H);
  strokeField(ctx, rnd, { x: 0, y: 0, w: W, h: H }, {
    count: 500, len: W * 0.06, width: H * 0.012, angle: [0, 1.57], jitter: 0.1,
    colors: ['#9c8e74', '#77684f', '#b0a184'], alpha: 0.4
  });

  const compose = COMPOSITIONS[kind];
  const meta = compose ? compose(kind, ctx, rnd, W, H) : { castShadow: 0.6, warm: 0.1 };
  ageSurface(ctx, rnd, W, H, opts.age === undefined ? 1 : opts.age);
  return { canvas, meta, aspect, width: W, height: H };
}

/* Height field for impasto: canvas weave + luminance-derived paint relief. */
function buildImpastoHeight(sourceCanvas, weaveScale) {
  const W = sourceCanvas.width, H = sourceCanvas.height;
  const src = sourceCanvas.getContext('2d').getImageData(0, 0, W, H);
  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  const octx = out.getContext('2d');
  const dst = octx.createImageData(W, H);
  const step = Math.max(4, Math.round(W / (weaveScale || 240)));
  const thread = step * 0.3;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const r = src.data[i], gg = src.data[i + 1], b = src.data[i + 2];
      const lum = (0.299 * r + 0.587 * gg + 0.114 * b) / 255;
      /* brighter paint sits higher (impasto); dark glazes recede */
      const relief = lum * 0.62;
      const warp = (x % step < thread) ? -0.05 : 0;
      const weft = (y % step < thread) ? -0.05 : 0;
      const grain = ((x * 3 + y * 5) % (step * 1.6)) / (step * 1.6) * 0.04;
      const v = Math.max(0, Math.min(1, 0.30 + relief + warp + weft + grain));
      const o = i;
      dst.data[o] = v * 255; dst.data[o + 1] = v * 255; dst.data[o + 2] = v * 255; dst.data[o + 3] = 255;
    }
  }
  octx.putImageData(dst, 0, 0);
  return out;
}

/* Sobel-ish normal map from a greyscale height canvas. */
function normalFromHeight(heightCanvas, strength) {
  const W = heightCanvas.width, H = heightCanvas.height;
  const hctx = heightCanvas.getContext('2d');
  const hd = hctx.getImageData(0, 0, W, H);
  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  const octx = out.getContext('2d');
  const dst = octx.createImageData(W, H);
  const at = (x, y) => hd.data[(((y + H) % H) * W + ((x + W) % W)) * 4] / 255;
  const s = strength === undefined ? 2.6 : strength;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const tl = at(x - 1, y - 1), t = at(x, y - 1), tr = at(x + 1, y - 1);
      const l = at(x - 1, y), r = at(x + 1, y);
      const bl = at(x - 1, y + 1), bo = at(x, y + 1), br = at(x + 1, y + 1);
      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * bo + br) - (tl + 2 * t + tr);
      const nx = -dx * s, ny = -dy * s, nz = 1;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      const i = (y * W + x) * 4;
      dst.data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      dst.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      dst.data[i + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      dst.data[i + 3] = 255;
    }
  }
  octx.putImageData(dst, 0, 0);
  return out;
}

/* Roughness: impasto crests stay matt and scuff, dark glazes and varnish gloss over.
   `pool` adds the varnish sheen concentrated where the picture light lands. */
function roughFromSurface(heightCanvas, sourceCanvas, pool) {
  const W = heightCanvas.width, H = heightCanvas.height;
  const hd = heightCanvas.getContext('2d').getImageData(0, 0, W, H);
  const sd = sourceCanvas.getContext('2d').getImageData(0, 0, W, H);
  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  const octx = out.getContext('2d');
  const dst = octx.createImageData(W, H);
  for (let i = 0; i < hd.data.length; i += 4) {
    const px = (i / 4) % W, py = Math.floor((i / 4) / W);
    const relief = hd.data[i] / 255;
    const lum = (0.299 * sd.data[i] + 0.587 * sd.data[i + 1] + 0.114 * sd.data[i + 2]) / 255;
    let r = 0.68 - relief * 0.18 - (1 - lum) * 0.22;
    if (pool) {
      const dx = (px / W - pool.x), dy = (py / H - pool.y);
      const d = Math.sqrt(dx * dx * pool.aspect * pool.aspect + dy * dy);
      r -= Math.max(0, 0.30 - d * 0.42) * 0.8;
    }
    /* frame-edge handling stays matt */
    const edge = Math.min(px, py, W - px, H - py);
    if (edge < 6) r += 0.12;
    r = Math.max(0.14, Math.min(0.95, r));
    dst.data[i] = dst.data[i + 1] = dst.data[i + 2] = r * 255; dst.data[i + 3] = 255;
  }
  octx.putImageData(dst, 0, 0);
  return out;
}

/* Aged picture varnish layer: warm film, pooling, bloom, bloche. */
function varnishOverlay(W, H, rnd) {
  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  const ctx = out.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(196,158,102,.30)');
  g.addColorStop(0.5, 'rgba(188,150,96,.16)');
  g.addColorStop(1, 'rgba(172,132,84,.30)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) {
    const x = rnd() * W, y = rnd() * H, r = W * (0.04 + rnd() * 0.14);
    const b = ctx.createRadialGradient(x, y, 0, x, y, r);
    const on = rnd() > 0.5;
    b.addColorStop(0, on ? 'rgba(226,200,150,.16)' : 'rgba(140,108,66,.13)');
    b.addColorStop(1, 'rgba(140,108,66,0)');
    ctx.fillStyle = b; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return out;
}

function bakePictureLight(canvas, spot) {
  /* spot: {x, y, radius} in normalised coords — additive warm pool + top-down falloff */
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = spot.x * W, cy = spot.y * H, r = spot.radius * W;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, 'rgba(255,226,176,.085)');
  g.addColorStop(0.45, 'rgba(216,172,116,.04)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  /* falloff toward the bottom of the canvas */
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const f = ctx.createLinearGradient(0, 0, 0, H);
  f.addColorStop(0, 'rgba(255,255,255,1)');
  f.addColorStop(0.75, 'rgba(230,228,224,1)');
  f.addColorStop(1, 'rgba(200,198,194,1)');
  ctx.fillStyle = f; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

window.Art = {
  makePainting, buildImpastoHeight, normalFromHeight, roughFromSurface,
  varnishOverlay, bakePictureLight, mulberry32, COMPOSITIONS, ASPECTS
};

})();
