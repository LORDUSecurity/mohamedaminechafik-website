/* The gallery's own chrome: the door, the farewell's contact row, the exhibit
   card's controls, the copy struck under the picture, and the detail dossier.

   It reads the room through window.MuseumApp (main.js exposes scrollP, rig,
   paintings, camera, renderer, scene, and exportArtwork) and is driven by two
   hooks called from main.js: onFocus(entry) when the camera settles on a
   picture, and placeArtDl() on every frame after composer.render().

   Nothing here owns layout — the shapes live in index.html's style block, which
   carries the portfolio's tokens. The dossier is the portfolio's detail page in
   miniature: the same gallery, the same stat tiles, the same buttons and the
   same technique tickets, reading the same notes. */
(function () {
'use strict';

const I = window.ICONS || { brand: {}, glyph: {} };

function icon(name) {
  if (!name) return '';
  if (name.startsWith('brand:')) {
    const d = I.brand[name.slice(6)];
    return d ? '<svg class="brand" viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>' : '';
  }
  const g = I.glyph[name];
  return g ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' + g + '</svg>' : '';
}

const $ = sel => document.querySelector(sel);
const el = {};
['door', 'ctaEnd', 'cap', 'capLinks', 'capSkills', 'moreBtn', 'artdl', 'hueBtn', 'hue', 'detail',
 'tip', 'tipCat', 'tipName', 'tipNote', 'tipEv', 'tipEvRow'].forEach(id => {
  el[id] = document.getElementById(id);
});
const W = window.WORKS || {};
const CONTACT = window.CONTACT || {};

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmtSize = b => b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB'
  : b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.round(b / 1e3) + ' KB';

/* --------------------------------------------------------------- the door */

const SITE = '../index.html';

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
  /* the door is on screen for the whole walk, over the welcome and the farewell
     alike: leaving the room is never something the visitor has to hunt for */
  el.door.innerHTML = '<a class="btn btn-ico btn-ghost" href="' + SITE + '" title="Exit to the portfolio" aria-label="Exit to the portfolio">' +
    '<span class="face">' + icon('exit') + '</span></a>';

  /* the channels are offered once, at the end of the walk */
  [
    btn(SITE, 'Enter the portfolio', '<span class="arr">&nearr;</span>', '', true),
    btn(CONTACT.github, '', icon('brand:github'), 'btn-ico'),
    btn(CONTACT.linkedin, '', icon('brand:linkedin'), 'btn-ico'),
    btn('mailto:' + CONTACT.email_esi, '', icon('mail'), 'btn-ico')
  ].forEach(b => el.ctaEnd.appendChild(b));

  /* the marks come from the portfolio's shared set like every other button. The
     download is the one control a visitor has to find on their own under a
     painting, so it carries its name as well as its glyph — an anonymous arrow
     reads as part of the frame, not as the thing that gives you a copy. */
  const dl = $('#hueBtn .face');
  if (dl) dl.innerHTML = icon('download') + '<span>Download artwork</span><span class="arr">&darr;</span>';
  const close = $('#dClose .face');
  if (close) close.innerHTML = icon('close');
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
  buildCapSkills(d);
  buildCapLinks(d);
  measure();
}

/* What the work is built from, on the face of the card, in the portfolio's
   chip shape: enough to say what you are looking at without opening anything,
   and short enough that the plate stays a card rather than a second dossier.
   Tapping one opens the dossier, where the chip carries its full note. */
function buildCapSkills(d) {
  const t = ((d && d.tech) || []).slice(0, 4);
  el.capSkills.innerHTML = t.map(x =>
    '<button type="button" class="tag" style="--h:hsl(' + x.hue + ' 92% 62%)" ' +
    'aria-label="' + esc(x.name) + ' — open the details"><span class="face">' +
    icon(x.icon) + '<span>' + esc(x.name) + '</span></span></button>').join('');
}

el.capSkills && el.capSkills.addEventListener('click', ev => {
  if (ev.target.closest('.tag')) openDetail();
});

/* beside the dossier button, the work's own two channels as logo-only marks —
   the same small buttons the portfolio's detail page carries */
function buildCapLinks(d) {
  const links = (d && d.links) || {};
  el.capLinks.innerHTML = [
    links.repo ? '<a class="btn btn-ico" href="' + esc(links.repo) + '" target="_blank" rel="noopener" title="Repository" aria-label="Repository">' +
      '<span class="face">' + icon('brand:github') + '</span></a>' : '',
    links.drive ? '<a class="btn btn-ico" href="' + esc(links.drive) + '" target="_blank" rel="noopener" title="Drive folder" aria-label="Drive folder">' +
      '<span class="face">' + icon('brand:googledrive') + '</span></a>' : ''
  ].join('');
}

/* The colours a copy can be downloaded in. The work's own hue first — that is
   what hangs on the wall — then the five the room's palette can be pushed to
   without leaving its own logic. */
const HUES = [
  ['As it hangs', null],
  ['Cyan', 0x39e5ff],
  ['Magenta', 0xff3d6e],
  ['Lime', 0x6dff13],
  ['Amber', 0xffd23f],
  ['No colour', 0xf2ede0]
];

function buildHueMenu(w) {
  if (!el.hue) return;
  const own = w ? w.accent : 0xffd23f;
  const inner = '<div class="lab">Download a copy in</div>' + HUES.map(([name, hex]) => {
    const c = hex === null ? own : hex;
    const css = '#' + c.toString(16).padStart(6, '0');
    return '<button type="button" role="menuitem" data-hue="' + c.toString(16) +
      '" style="--hc:' + css + '"><i></i>' + esc(name) + '</button>';
  }).join('');
  el.hue.innerHTML = '<div class="box">' + inner + '</div>';
}

el.hueBtn && el.hueBtn.addEventListener('click', () => {
  const shown = el.hue.classList.toggle('on');
  el.hueBtn.setAttribute('aria-expanded', shown ? 'true' : 'false');
  if (shown) seatHue();
});

/* the menu is the one part of the room that has to fit in what is left of the
   screen: measured where it wants to sit, and sent above the button — over the
   frame, for as long as it is asked for — when below it would be cut off or
   land on the card the visitor was just reading. If neither side has room the
   menu keeps its place under the button rather than running off the top. */
function seatHue() {
  if (!el.hue || !el.hue.classList.contains('on')) return;
  el.hue.classList.remove('up');
  const r = el.hue.getBoundingClientRect();
  const sheet = el.cap.querySelector('.sheet').getBoundingClientRect();
  const onCard = r.right > sheet.left + 1 && r.left < sheet.right - 1 && r.bottom > sheet.top + 1;
  if (r.bottom > window.innerHeight - 8 || onCard) {
    el.hue.classList.add('up');
    if (el.hue.getBoundingClientRect().top < 8) el.hue.classList.remove('up');
  }
}

el.hue && el.hue.addEventListener('click', ev => {
  const b = ev.target.closest('[data-hue]');
  if (!b) return;
  closeHue();
  strike(parseInt(b.dataset.hue, 16));
});

function closeHue() {
  if (!el.hue) return;
  el.hue.classList.remove('on');
  el.hueBtn.setAttribute('aria-expanded', 'false');
}

document.addEventListener('click', ev => {
  if (el.hue && el.hue.classList.contains('on') && !ev.target.closest('.dl')) closeHue();
});

/* ------------------------------------------------- the copy under the picture

   The control belongs to the canvas, not to the plate: it is seated from the
   lens every frame, on the picture's own bottom edge, so it stays under the
   artwork whichever side the card has taken. On a phone the card owns the
   bottom of the screen, so the control is held above it instead of behind it.

   The file itself is struck by main.js, off the plate at the source picture's
   own resolution — this only asks for it and hands over the blob. */

let dlW = 44, dlH = 44, capTop = Infinity, narrow = false;
let seatedY = -1;

function measure() {
  if (!el.artdl) return;
  dlW = el.artdl.offsetWidth || 44;
  dlH = el.artdl.offsetHeight || 44;
  narrow = window.matchMedia('(max-width: 760px)').matches;
  const holder = el.cap.querySelector('.holder');
  /* the plate's own box, read once per stop rather than once per frame: a layout
     read in the render loop would cost the walk a reflow every frame */
  capTop = narrow && holder ? holder.getBoundingClientRect().top : Infinity;
}

function rectOfPainting(e, camera, cw, ch) {
  const THREE = window.THREE;
  const g = e.group;
  if (!g) return null;
  g.updateWorldMatrix(true, false);
  const hw = (e.w || 1) / 2, hh = (e.h || 1) / 2;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [px, py] of [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]) {
    /* project() already walks world → view → clip, so the corner only needs the
       group's world matrix here; folding matrixWorldInverse in as well would
       apply it twice and throw the rect off the wall */
    const v = new THREE.Vector3(px, py, 0.06).applyMatrix4(g.matrixWorld).project(camera);
    const sx = (v.x * 0.5 + 0.5) * cw, sy = (-v.y * 0.5 + 0.5) * ch;
    x0 = Math.min(x0, sx); x1 = Math.max(x1, sx);
    y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
  }
  if (!isFinite(x0)) return null;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

function placeArtDl() {
  const a = el.artdl;
  if (!a) return;
  const st = window.MuseumApp && window.MuseumApp.state;
  if (!focus || open || !st || !st.camera || !el.cap.classList.contains('on')) {
    a.classList.remove('on');
    return;
  }
  const cw = window.innerWidth, ch = window.innerHeight;
  const r = rectOfPainting(focus, st.camera, cw, ch);
  /* a picture still arriving is not one to offer a copy of: the rect has to be
     on screen and big enough to be the thing the visitor is looking at */
  if (!r || r.w < 60 || r.h < 60 || r.y > ch || r.y + r.h < 0) {
    a.classList.remove('on');
    return;
  }
  const x = Math.max(dlW / 2 + 8, Math.min(cw - dlW / 2 - 8, r.x + r.w / 2));
  let y = r.y + r.h + 12;
  if (narrow) y = Math.min(y, capTop - dlH - 10);
  y = Math.max(8, Math.min(y, ch - dlH - 8));
  a.style.left = Math.round(x) + 'px';
  a.style.top = Math.round(y) + 'px';
  a.classList.add('on');
  /* the open menu is re-seated only when the control actually moves: its box is
     read once per step, not on every frame of the walk */
  if (el.hue.classList.contains('on') && y !== seatedY) { seatedY = y; seatHue(); }
}

let striking = false;

async function strike(hex) {
  if (striking || !focus || !window.MuseumApp || !window.MuseumApp.exportArtwork) return;
  striking = true;
  el.artdl.classList.add('busy');
  try {
    const blob = await window.MuseumApp.exportArtwork(focus, hex);
    if (blob) {
      const name = (focus.work ? focus.work.name : 'artwork').replace(/\s+/g, '-').toLowerCase();
      saveBlob(blob, name + '-glitched.png');
    }
  } catch (err) {
    console.error('could not strike the copy', err);
  } finally {
    striking = false;
    el.artdl.classList.remove('busy');
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
let tech = [];

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
  /* the plate carries the room's two sentences; the dossier carries the whole
     description, the same one the portfolio's detail page opens with */
  root.querySelector('.dlede').textContent = d.desc || w.desc;

  root.querySelector('.dstats').innerHTML = (d.stats || []).map(([v, l]) =>
    '<div class="stat"><div><b>' + esc(v) + '</b><span>' + esc(l) + '</span></div></div>').join('');

  buildGallery(root, d, w.name);
  buildActions(root, d);
  buildTickets(root, d);

  root.classList.add('on');
  document.documentElement.classList.add('locked');
  open = true;
  el.artdl.classList.remove('on');
  root.querySelector('#dClose').focus();
}

/* the image holder: one stage, small next/previous on its edges, a count in the
   corner and the strip of thumbs under it. The hero opens the strip because it
   is the frame the portfolio leads with; the rest follow in catalogue order and
   the walkthrough takes the last slot. */
function buildGallery(root, d, name) {
  const bay = root.querySelector('.dmedia');
  const imgs = (d.media && d.media.images) || [];
  const hero = d.media && d.media.hero;
  const ordered = hero && imgs.indexOf(hero) > 0
    ? [hero].concat(imgs.filter(f => f !== hero)) : imgs;
  const video = (d.media && d.media.video) || '';
  const media = ordered.concat(video ? [video] : []);
  if (!media.length) {
    bay.innerHTML = '<p class="dlede">No stills mounted for this work.</p>';
    return;
  }
  const n = media.length;
  const slides = media.map((m, i) => {
    const vid = /\.mp4$/i.test(m);
    return '<div class="g-slide' + (i === 0 ? ' on' : '') + '" data-i="' + i + '">' +
      (vid ? '<video controls preload="none" playsinline' + (hero ? ' poster="' + esc(hero) + '"' : '') +
        ' src="' + esc(m) + '"></video>'
           : '<img alt="' + esc(name) + ' screen ' + (i + 1) + '" src="' + esc(m) + '" loading="' + (i === 0 ? 'eager' : 'lazy') + '">') +
      '</div>';
  }).join('');
  const thumbs = media.map((m, i) => {
    const vid = /\.mp4$/i.test(m);
    return '<button type="button" class="thumb' + (i === 0 ? ' on' : '') + (vid ? ' vid' : '') +
      '" data-go="' + i + '" aria-label="' + (vid ? 'Play walkthrough' : 'Screen ' + (i + 1)) + '">' +
      (vid ? '&#9654;' : '<img src="' + esc(m) + '" alt="" loading="lazy">') + '</button>';
  }).join('');
  bay.innerHTML = '<div class="gallery"><div class="face">' +
    '<div class="g-stage" id="dStage" tabindex="0" aria-label="Gallery, use the arrow keys">' +
    slides +
    '<div class="g-nav">' +
    '<button type="button" class="g-btn" data-g="-1" aria-label="Previous">&lsaquo;</button>' +
    '<button type="button" class="g-btn" data-g="1" aria-label="Next">&rsaquo;</button>' +
    '</div>' +
    '<span class="g-count" id="dCount">01 / ' + String(n).padStart(2, '0') + '</span>' +
    '</div><div class="thumbs">' + thumbs + '</div></div></div>';

  const stage = bay.querySelector('#dStage');
  const slideEls = Array.from(bay.querySelectorAll('.g-slide'));
  const thumbEls = Array.from(bay.querySelectorAll('.thumb'));
  const count = bay.querySelector('#dCount');
  let cur = 0;
  const show = i => {
    cur = (i + n) % n;
    slideEls.forEach((s, k) => s.classList.toggle('on', k === cur));
    thumbEls.forEach((t, k) => t.classList.toggle('on', k === cur));
    count.textContent = String(cur + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0');
    slideEls.forEach((s, k) => {
      const v = s.querySelector('video');
      if (v && k !== cur) v.pause();
    });
  };
  bay.onclick = ev => {
    const nav = ev.target.closest('[data-g]');
    if (nav) { show(cur + Number(nav.dataset.g)); return; }
    const t = ev.target.closest('[data-go]');
    if (t) show(Number(t.dataset.go));
  };
  stage.addEventListener('keydown', ev => {
    if (ev.key === 'ArrowRight') { ev.preventDefault(); show(cur + 1); }
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); show(cur - 1); }
  });
  let sx = null;
  stage.addEventListener('touchstart', ev => { sx = ev.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', ev => {
    if (sx == null) return;
    const dx = ev.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 40) show(cur + (dx < 0 ? 1 : -1));
    sx = null;
  }, { passive: true });
}

function buildActions(root, d) {
  const links = d.links || {};
  const acts = [];
  if (d.sample) {
    const label = /\.ipynb$/i.test(d.sample.name) ? 'Download notebook' : 'Download sample';
    acts.push('<a class="btn btn-accent" href="' + esc(d.sample.url) + '" target="_blank" rel="noopener"><span class="face">' +
      label + ' <span class="arr">&darr;</span></span></a>');
  }
  if (links.drive) acts.push('<a class="btn" href="' + esc(links.drive) + '" target="_blank" rel="noopener"><span class="face">' +
    'Drive folder <span class="arr">&nearr;</span></span></a>');
  if (links.repo) acts.push('<a class="btn btn-ico" href="' + esc(links.repo) + '" target="_blank" rel="noopener" title="Repository" aria-label="Repository"><span class="face">' +
    icon('brand:github') + '</span></a>');
  if (links.site && /zenodo\.org\/records\//.test(links.site)) acts.push('<a class="btn btn-ico" href="' + esc(links.site) + '" target="_blank" rel="noopener" title="Zenodo record" aria-label="Zenodo record"><span class="face">' +
    '<img src="../assets/logos/zenodo-ze.png" alt=""></span></a>');
  else if (links.site) acts.push('<a class="btn" href="' + esc(links.site) + '" target="_blank" rel="noopener"><span class="face">' +
    'Live site <span class="arr">&nearr;</span></span></a>');
  if (links.rg) acts.push('<a class="btn btn-ico" href="' + esc(links.rg) + '" target="_blank" rel="noopener" title="ResearchGate publication" aria-label="ResearchGate publication"><span class="face">' +
    icon('brand:researchgate') + '</span></a>');
  root.querySelector('.dacts').innerHTML = acts.join('');

  /* what the page actually hands over, in the portfolio's own file line */
  root.querySelector('.dfile').textContent = d.sample
    ? d.sample.name + ' · ' + fmtSize(d.sample.bytes)
    : links.drive ? 'No packaged sample — the Drive folder holds the runs and the evidence.'
    : links.repo ? 'No packaged sample — the repository holds the code and the checks.'
    : 'No packaged sample — ask and I will send the build.';
}

/* ------------------------------------------------------- technique tickets */

function buildTickets(root, d) {
  tech = d.tech || [];
  const box = root.querySelector('#dTech');
  box.innerHTML = tech.map((t, i) =>
    '<button type="button" class="tag" data-i="' + i + '" style="--h:hsl(' + t.hue + ' 92% 62%)" ' +
    'aria-label="' + esc(t.name) + ' — how it is used here"><span class="face">' +
    icon(t.icon) + '<span>' + esc(t.name) + '</span></span></button>').join('');
  const hint = root.querySelector('.dhint');
  if (hint) hint.textContent = TOUCH
    ? 'Tap a ticket to read how it was used here'
    : 'Hover a ticket to read how it was used here';
  hideTip();
}

const TOUCH = window.matchMedia('(hover: none)').matches;
let tipTimer = null, tipOn = null;

function showTip(b) {
  const t = tech[Number(b.dataset.i)];
  if (!t || !el.tip) return;
  el.tip.style.setProperty('--h', 'hsl(' + t.hue + ' 92% 62%)');
  el.tipCat.textContent = t.cat;
  el.tipName.textContent = t.name;
  el.tipNote.textContent = t.note;
  el.tipEv.textContent = t.ev || '';
  el.tipEvRow.hidden = !t.ev;
  el.tip.hidden = false;
  const r = b.getBoundingClientRect();
  const tw = el.tip.offsetWidth, th = el.tip.offsetHeight;
  let x = r.left + r.width / 2 - tw / 2;
  let y = r.bottom + 10;
  x = Math.max(10, Math.min(window.innerWidth - tw - 10, x));
  if (y + th > window.innerHeight - 10) y = r.top - th - 10;
  /* the sheet scrolls, so a ticket can sit at either edge: keep the whole note
     on screen rather than letting it hang off the fold it was hovered from */
  y = Math.max(10, Math.min(y, window.innerHeight - th - 10));
  el.tip.style.left = Math.round(x) + 'px';
  el.tip.style.top = Math.round(y) + 'px';
}

function hideTip() {
  clearTimeout(tipTimer);
  if (el.tip) el.tip.hidden = true;
  if (tipOn) tipOn.classList.remove('on');
  tipOn = null;
}

el.detail && el.detail.addEventListener('mouseover', ev => {
  const b = ev.target.closest('.tag[data-i]');
  if (!b || TOUCH) return;
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => showTip(b), 120);
});
el.detail && el.detail.addEventListener('mouseout', ev => {
  if (ev.target.closest('.tag[data-i]') && !TOUCH) hideTip();
});
el.detail && el.detail.addEventListener('focusin', ev => {
  const b = ev.target.closest('.tag[data-i]');
  if (b) showTip(b);
});
el.detail && el.detail.addEventListener('focusout', ev => {
  if (ev.target.closest('.tag[data-i]')) hideTip();
});
/* on a phone there is no hover to ride, so the tap is the hover: it opens the
   note, marks the ticket it belongs to, and a second tap puts it away */
el.detail && el.detail.addEventListener('click', ev => {
  const b = ev.target.closest('.tag[data-i]');
  if (!b || !TOUCH) return;
  if (tipOn === b) { hideTip(); return; }
  hideTip();
  tipOn = b;
  b.classList.add('on');
  showTip(b);
});

function closeDetail() {
  if (!open) return;
  const v = el.detail.querySelector('video');
  if (v) v.pause();
  hideTip();
  el.detail.classList.remove('on');
  document.documentElement.classList.remove('locked');
  open = false;
  measure();
}

el.moreBtn && el.moreBtn.addEventListener('click', openDetail);
el.detail && el.detail.addEventListener('click', ev => {
  if (ev.target.closest('#dClose') || ev.target.classList.contains('dscrim')) closeDetail();
});
/* the note is pinned to the viewport, so a scrolling sheet would leave it
   pointing at a ticket that has moved on */
el.detail && el.detail.addEventListener('scroll', hideTip, { passive: true, capture: true });
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') { closeDetail(); closeHue(); hideTip(); }
});
window.addEventListener('resize', measure, { passive: true });

/* ------------------------------------------------------------------ public */

window.MuseumHud = {
  onFocus,
  placeArtDl,
  booted() {
    buildChrome();
    measure();
    el.door.classList.add('on');
  },
  get detailOpen() { return open; }
};

})();