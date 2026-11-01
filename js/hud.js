/* The gallery's own chrome: the door, the contact rows, the exhibit card's
   controls, the detail dossier, and the artwork download.

   It reads the room through window.MuseumApp (main.js exposes scrollP, rig,
   paintings, camera, renderer, scene) and is driven by two hooks called from
   main.js: onFocus(entry) when the camera settles on a picture, and
   maybeCapture() on the frame right after composer.render().

   Nothing here owns layout — the shapes live in index.html's style block, which
   carries the portfolio's tokens. */
(function () {
'use strict';

const I = window.ICONS || { brand: {}, glyph: {} };

function icon(name) {
  if (!name) return '';
  if (name.startsWith('brand:')) {
    const d = I.brand[name.slice(6)];
    return d ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>' : '';
  }
  const g = I.glyph[name];
  return g ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' + g + '</svg>' : '';
}

const $ = sel => document.querySelector(sel);
const el = {};
['door', 'ctaTop', 'ctaEnd', 'cap', 'moreBtn', 'hueBtn', 'hue', 'detail'].forEach(id => {
  el[id] = document.getElementById(id);
});
const W = window.WORKS || {};
const CONTACT = window.CONTACT || {};

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* --------------------------------------------------------------- the door */

const SITE = 'site/index.html';

function btn(href, label, mark, cls, internal) {
  const a = document.createElement('a');
  a.className = 'btn ' + (cls || '');
  a.href = href || '#';
  if (href && !internal && !/^mailto:/.test(href)) { a.target = '_blank'; a.rel = 'noopener'; }
  const face = document.createElement('span');
  face.className = 'face';
  face.innerHTML = (mark || '') + (label ? ' ' + esc(label) : '');
  a.appendChild(face);
  return a;
}

function buildChrome() {
  el.door.innerHTML = '<a class="btn btn-ico btn-ghost" href="' + SITE + '" title="Exit to the portfolio" aria-label="Exit to the portfolio">' +
    '<span class="face"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' +
    '<path d="M13 4.5h5.5v15H13"/><path d="M4.5 12h7M9 8.5l3.5 3.5L9 15.5"/></svg></span></a>';

  const mail = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13"/><path d="M3 6.5l9 6.5 9-6.5"/></svg>';
  [
    btn(CONTACT.github, 'GitHub', icon('brand:github')),
    btn(CONTACT.linkedin, 'LinkedIn', icon('brand:linkedin')),
    btn('mailto:' + CONTACT.email_esi, 'Email', mail)
  ].forEach(b => el.ctaTop.appendChild(b));

  [
    btn(SITE, 'Enter the portfolio', '<span class="arr">&nearr;</span>', '', true),
    btn(CONTACT.github, '', icon('brand:github'), 'btn-ico'),
    btn(CONTACT.linkedin, '', icon('brand:linkedin'), 'btn-ico'),
    btn('mailto:' + CONTACT.email_esi, '', mail, 'btn-ico')
  ].forEach(b => el.ctaEnd.appendChild(b));
}

/* ---------------------------------------------------------- exhibit card */

let focus = null;

function onFocus(e) {
  focus = e;
  const w = e && e.work;
  const d = w && W[w.name];
  /* no dossier, no label: the plate would rather show nothing than call a
     packaged web app a "project" because works.js had not arrived yet */
  el.cap.querySelector('.out').textContent = d ? d.output : '';
  el.moreBtn.disabled = !d;
  buildHueMenu(w);
}

/* The corruption colours a copy can be struck in. The work's own hue first —
   that is what hangs on the wall — then the five the room's palette can be
   pushed to without leaving its own logic. */
const HUES = [
  ['This hang', null],
  ['Cyan', 0x39e5ff],
  ['Magenta', 0xff3d6e],
  ['Lime', 0x6dff13],
  ['Amber', 0xffd23f],
  ['Colourless', 0xf2ede0]
];

function buildHueMenu(w) {
  if (!el.hue) return;
  const own = w ? w.accent : 0xffd23f;
  el.hue.innerHTML = '<div class="lab">Download a copy in</div>' + HUES.map(([name, hex]) => {
    const c = hex === null ? own : hex;
    const css = '#' + c.toString(16).padStart(6, '0');
    return '<button type="button" role="menuitem" data-hue="' + c.toString(16) +
      '" style="--hc:' + css + '"><i></i>' + esc(name) + '</button>';
  }).join('');
}

el.hueBtn && el.hueBtn.addEventListener('click', () => {
  const shown = el.hue.classList.toggle('on');
  el.hueBtn.setAttribute('aria-expanded', shown ? 'true' : 'false');
});

el.hue && el.hue.addEventListener('click', ev => {
  const b = ev.target.closest('[data-hue]');
  if (!b) return;
  el.hue.classList.remove('on');
  el.hueBtn.setAttribute('aria-expanded', 'false');
  requestCapture(parseInt(b.dataset.hue, 16));
});

document.addEventListener('click', ev => {
  if (el.hue && el.hue.classList.contains('on') && !ev.target.closest('.dl')) {
    el.hue.classList.remove('on');
    el.hueBtn.setAttribute('aria-expanded', 'false');
  }
});

/* ------------------------------------------------------------- the capture
   The copy is the room's own frame, not a re-render: the painting's rectangle is
   projected to screen space, the live canvas is cropped to it, and the glitch
   layer is re-tinted for the one frame that is grabbed. So bloom, the tear, the
   chromatic fringe and the picture light all come along for free.
   The tint is set on click and the grab happens on the next frame, after
   main.js has run the composer — reading the drawing buffer is only legal inside
   the frame that produced it, which is why main.js calls maybeCapture() straight
   after composer.render(). */

let pending = null;

function setHue(mats, pal) {
  mats.forEach(m => {
    const u = m.uniforms;
    if (u.uTint) u.uTint.value.set(pal.tint[0], pal.tint[1], pal.tint[2]);
    if (u.uBleed) u.uBleed.value.set(pal.bleed[0], pal.bleed[1], pal.bleed[2]);
    if (u.uRimA) u.uRimA.value.set(pal.rimA[0], pal.rimA[1], pal.rimA[2]);
    if (u.uRimB) u.uRimB.value.set(pal.rimB[0], pal.rimB[1], pal.rimB[2]);
  });
}

function requestCapture(hex) {
  if (!window.MuseumApp || !focus) return;
  const mats = glitchMats(focus);
  if (!mats.length) return;
  pending = {
    hex, mats,
    keep: mats.map(m => ({
      tint: m.uniforms.uTint && m.uniforms.uTint.value.clone(),
      bleed: m.uniforms.uBleed && m.uniforms.uBleed.value.clone(),
      rimA: m.uniforms.uRimA && m.uniforms.uRimA.value.clone(),
      rimB: m.uniforms.uRimB && m.uniforms.uRimB.value.clone()
    }))
  };
  setHue(mats, Glitch.palette(hex));
}

function glitchMats(e) {
  const out = [];
  if (!e.group) return out;
  e.group.traverse(o => {
    const u = o.material && o.material.uniforms;
    if (u && (u.uTint || u.uRimA)) out.push(o.material);
  });
  return out;
}

function restoreMats(job) {
  if (!job) return;
  job.mats.forEach((m, i) => {
    const k = job.keep[i];
    if (k.tint && m.uniforms.uTint) m.uniforms.uTint.value.copy(k.tint);
    if (k.bleed && m.uniforms.uBleed) m.uniforms.uBleed.value.copy(k.bleed);
    if (k.rimA && m.uniforms.uRimA) m.uniforms.uRimA.value.copy(k.rimA);
    if (k.rimB && m.uniforms.uRimB) m.uniforms.uRimB.value.copy(k.rimB);
  });
}

function rectOfPainting(e, camera, cw, ch) {
  const THREE = window.THREE;
  const g = e.group;
  if (!g) return null;
  g.updateWorldMatrix(true, false);
  const m = new THREE.Matrix4().multiplyMatrices(camera.matrixWorldInverse, g.matrixWorld);
  const hw = (e.w || 1) / 2, hh = (e.h || 1) / 2;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [px, py] of [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]) {
    const v = new THREE.Vector3(px, py, 0.06).applyMatrix4(m).project(camera);
    const sx = (v.x * 0.5 + 0.5) * cw, sy = (-v.y * 0.5 + 0.5) * ch;
    x0 = Math.min(x0, sx); x1 = Math.max(x1, sx);
    y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
  }
  if (!isFinite(x0)) return null;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

function maybeCapture() {
  if (!pending) return;
  const job = pending;
  pending = null;
  try {
    const st = window.MuseumApp && window.MuseumApp.state;
    if (!st || !st.renderer || !st.camera || !focus) return;
    /* this frame was drawn with the requested hue: main.js calls us straight
       after composer.render(), which is the only moment the drawing buffer is
       still readable */
    const cv = st.renderer.domElement;
    const dpr = st.renderer.getPixelRatio() || 1;
    const r = rectOfPainting(focus, st.camera, cv.width / dpr, cv.height / dpr);
    if (!r) return;
    const sx = Math.max(0, Math.round(r.x * dpr)), sy = Math.max(0, Math.round(r.y * dpr));
    const sw = Math.min(cv.width - sx, Math.round(r.w * dpr));
    const sh = Math.min(cv.height - sy, Math.round(r.h * dpr));
    if (sw < 8 || sh < 8) return;
    const scale = Math.min(1, 1400 / sw);
    const out = document.createElement('canvas');
    out.width = Math.round(sw * scale);
    out.height = Math.round(sh * scale);
    out.getContext('2d').drawImage(cv, sx, sy, sw, sh, 0, 0, out.width, out.height);
    out.toBlob(blob => {
      if (!blob) return;
      const name = (focus.work ? focus.work.name : 'artwork').replace(/\s+/g, '-').toLowerCase();
      saveBlob(blob, name + '-glitched.png');
    }, 'image/png');
  } catch (err) {
    console.error('capture failed', err);
  } finally {
    restoreMats(job);
  }
}

function saveBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}

/* ---------------------------------------------------------- detail dossier */

let open = false;

function openDetail() {
  const w = focus && focus.work;
  const d = w && W[w.name];
  if (!d) return;
  const root = el.detail;
  root.style.setProperty('--accent', '#' + w.accent.toString(16).padStart(6, '0'));

  root.querySelector('.dlogo img').src = w.logo;
  root.querySelector('.dlogo img').alt = w.name + ' logo';
  root.querySelector('.out').textContent = d.output;
  const credit = 'No. ' + String((window.MuseumApp ? window.MuseumApp.state.paintings.indexOf(focus) : 0) + 1).padStart(2, '0') +
    ' · ' + focus.title + ' · ' + focus.artist + ' · ' + focus.year;
  root.querySelector('#dMeta').textContent =
    [d.year, d.org, credit].filter(Boolean).join('  ·  ');
  root.querySelector('h2').textContent = w.name;
  root.querySelector('.dlede').textContent = w.desc;

  root.querySelector('.dstats').innerHTML = (d.stats || []).map(([v, l]) =>
    '<div class="stat"><b>' + esc(v) + '</b><span>' + esc(l) + '</span></div>').join('');

  /* the hero opens the strip: it is the frame the portfolio leads with, and the
     rest follow in catalogue order */
  const imgs = (d.media && d.media.images || []);
  const hero = d.media && d.media.hero;
  const ordered = hero && imgs.indexOf(hero) > 0
    ? [hero].concat(imgs.filter(f => f !== hero)) : imgs;
  const media = ordered.concat(d.media && d.media.video ? [d.media.video] : []);
  root.querySelector('.dmedia').innerHTML = media.length
    ? '<div class="stage" id="dStage"></div><div class="thumbs">' +
      media.map((m, i) => {
        const vid = /\.mp4$/i.test(m);
        const cls = (i === 0 ? 'on' : '') + (vid ? (i === 0 ? ' vid' : 'vid') : '');
        return '<button type="button" data-i="' + i + '"' +
          (cls ? ' class="' + cls + '"' : '') + '>' +
          (vid ? '&#9654;' : '<img loading="lazy" alt="" src="' + esc(m) + '">') +
          '</button>';
      }).join('') + '</div>'
    : '<p class="dlede">No stills mounted for this work.</p>';
  if (media.length) showMedia(root, media, 0);
  root.querySelector('.dmedia').onclick = ev => {
    const b = ev.target.closest('[data-i]');
    if (b) {
      root.querySelectorAll('.thumbs button').forEach(t => t.classList.remove('on'));
      b.classList.add('on');
      showMedia(root, media, parseInt(b.dataset.i, 10));
    }
  };

  root.querySelector('.tech').innerHTML = (w.skills || []).map(([t, x]) =>
    '<dt>' + esc(t) + '</dt><dd>' + esc(x) + '</dd>').join('');

  const acts = [];
  if (d.sample) acts.push('<a class="btn" href="' + d.sample.url + '" target="_blank" rel="noopener"><span class="face">' +
    (/\.(zip|exe)$/i.test(d.sample.name) ? 'Download package' : 'Download sample') +
    ' <span class="arr">&darr;</span></span></a>');
  if (d.links.repo) acts.push('<a class="btn" href="' + d.links.repo + '" target="_blank" rel="noopener"><span class="face">' +
    icon('brand:github') + ' Repository</span></a>');
  if (d.links.rg) acts.push('<a class="btn btn-ico" href="' + d.links.rg + '" target="_blank" rel="noopener" title="ResearchGate paper" aria-label="ResearchGate paper"><span class="face">' +
    icon('brand:researchgate') + '</span></a>');
  if (d.links.site && /zenodo/.test(d.links.site)) acts.push('<a class="btn btn-ico" href="' + d.links.site + '" target="_blank" rel="noopener" title="Zenodo record" aria-label="Zenodo record"><span class="face">' +
    '<img src="site/assets/logos/zenodo-ze.png" alt=""></span></a>');
  else if (d.links.site) acts.push('<a class="btn" href="' + d.links.site + '" target="_blank" rel="noopener"><span class="face">Live site <span class="arr">&nearr;</span></span></a>');
  if (d.links.drive) acts.push('<a class="btn" href="' + d.links.drive + '" target="_blank" rel="noopener"><span class="face">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3.5 18l4-8h9l4 8z"/><path d="M7.5 10l2.5-5h4l2.5 5"/></svg> Drive folder</span></a>');
  root.querySelector('.dacts').innerHTML = acts.join('');

  root.classList.add('on');
  document.documentElement.classList.add('locked');
  open = true;
  root.querySelector('#dClose').focus();
}

function showMedia(root, media, i) {
  const src = media[i];
  const stage = root.querySelector('#dStage');
  if (!stage) return;
  if (/\.mp4$/.test(src)) {
    stage.innerHTML = '<video controls preload="none" playsinline src="' + esc(src) + '"></video>';
  } else {
    stage.innerHTML = '<img alt="" src="' + esc(src) + '">';
  }
}

function closeDetail() {
  if (!open) return;
  const v = el.detail.querySelector('video');
  if (v) v.pause();
  el.detail.classList.remove('on');
  document.documentElement.classList.remove('locked');
  open = false;
}

el.moreBtn && el.moreBtn.addEventListener('click', openDetail);
el.detail && el.detail.addEventListener('click', ev => {
  if (ev.target.closest('#dClose') || ev.target.classList.contains('dscrim')) closeDetail();
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') { closeDetail(); if (el.hue) el.hue.classList.remove('on'); }
});

/* ------------------------------------------------------------------ public */

window.MuseumHud = {
  onFocus,
  maybeCapture,
  booted() {
    buildChrome();
    el.door.classList.add('on');
  },
  get detailOpen() { return open; }
};

})();
