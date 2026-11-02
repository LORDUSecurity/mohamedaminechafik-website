/* Portfolio catalogue — hash-routed, no build step. */
(() => {
'use strict';

const D = window.SITE, I = window.ICONS;
const projects = D.projects;
const outputs = [...new Set(projects.map(p => p.output).filter(Boolean))];
const skillById = Object.fromEntries(D.skills.map(s => [s.id, s]));
const catById = Object.fromEntries(D.categories.map(c => [c.id, c]));
const projById = Object.fromEntries(projects.map(p => [p.id, p]));
const C = D.contact;
const skillsByCat = {}, skillsByGrp = {};
D.skills.forEach(s => {
  (skillsByCat[s.cat] ||= []).push(s);
  (skillsByGrp[s.cat + '/' + s.grp] ||= []).push(s);
});
const grpById = {};
const skillWorkCount = {};
projects.forEach(p => p.skills.forEach(id => { skillWorkCount[id] = (skillWorkCount[id] || 0) + 1; }));
D.categories.forEach(c => {
  grpById[c.id] = {};
  c.groups.forEach((g, i) => { grpById[c.id][g.id] = {...g, i, n: c.groups.length}; });
});

const app = document.getElementById('app');
const tip = document.getElementById('tip');
const tipCat = document.getElementById('tip-cat');
const tipName = document.getElementById('tip-name');
const tipNote = document.getElementById('tip-note');
const tipEv = document.getElementById('tip-ev');

/* ------------------------------------------------------------ helpers --- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtSize = b => b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.round(b / 1e3) + ' KB';
const img = (p, f) => `assets/img/${p.id}/${f}`;
const accent = p => p.accent;

/* The museum's plate convention: a work's own `cuts` list says which corners are
   chamfered, so a card keeps its silhouette when the shelf is filtered.
   Same sweep as the museum's cutPath(): start just past the top-left notch and
   close the ring through it — emitting the tl pair up front self-intersects the
   polygon whenever a second corner on that edge is also cut. */
function chamfer(cuts) {
  const has = k => (cuts || []).includes(k);
  const z = k => has(k) ? 'var(--cut)' : '0px';
  const [tl, tr, br, bl] = ['tl', 'tr', 'br', 'bl'].map(z);
  return `polygon(${tl} 0, calc(100% - ${tr}) 0, 100% ${tr}, 100% calc(100% - ${br}),` +
         ` calc(100% - ${br}) 100%, ${bl} 100%, 0 calc(100% - ${bl}), 0 ${tl})`;
}

/* one colour per package — the category and every skill inside it share it */
function catColor(c) { return `hsl(${c.hue} 92% 62%)`; }
function skillColor(s) { return catColor(catById[s.cat] || {hue: 200}); }
function grpColor(c) { return catColor(c); }

function icon(name) {
  if (!name) return '';
  if (name.startsWith('brand:')) {
    const d = I.brand[name.slice(6)];
    return d ? `<svg class="brand" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>` : '';
  }
  const g = I.glyph[name];
  return g ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="butt" stroke-linejoin="miter" aria-hidden="true">${g}</svg>` : '';
}

function skillTag(s, opts = {}) {
  const col = skillColor(s);
  const on = opts.on ? ' on' : '';
  const cnt = opts.count != null ? `<span class="cnt">${opts.count}</span>` : '';
  return `<button type="button" class="tag${on}" data-skill="${s.id}"${opts.proj ? ` data-proj="${opts.proj}"` : ''}
    style="--h:${col}" aria-label="${esc(s.name)}${opts.proj ? ' — how it is used here' : ''}">
    <span class="face">${icon(s.icon)}<span>${esc(s.name)}</span>${cnt}</span></button>`;
}

function catChip(c, opts = {}) {
  const on = opts.on ? ' on' : '';
  const n = opts.count != null ? opts.count : c.n;
  return `<button type="button" class="chip${on}" data-cat="${c.id}" style="--h:${catColor(c)}" aria-pressed="${!!opts.on}">
    <span class="face"><span class="dot"></span>${esc(c.name)}<span class="n">${n}</span></span></button>`;
}

/* --------------------------------------------------------------- tip --- */
let tipTimer = null;
function showTip(el) {
  const sid = el.dataset.skill, proj = el.dataset.proj;
  const s = skillById[sid];
  if (!s) return;
  const c = catById[s.cat];
  const col = skillColor(s);
  tip.style.setProperty('--h', col);
  const g = grpById[s.cat] && grpById[s.cat][s.grp];
  tipCat.textContent = c.name + (g ? ' · ' + g.name : '');
  tipName.textContent = s.name;
  const use = proj && s.uses[proj];
  tipNote.textContent = use ? use.note : s.defn;
  tipEv.textContent = use ? use.ev : 'skills workbook';
  tip.hidden = false;
  const r = el.getBoundingClientRect();
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  let x = r.left + r.width / 2 - tw / 2;
  let y = r.bottom + 10;
  x = Math.max(10, Math.min(window.innerWidth - tw - 10, x));
  if (y + th > window.innerHeight - 10) y = Math.max(10, r.top - th - 10);
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
}
function hideTip() { tip.hidden = true; }

document.addEventListener('mouseover', e => {
  const t = e.target.closest('.tag[data-skill]');
  if (!t) return;
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => showTip(t), 120);
});
document.addEventListener('mouseout', e => {
  if (e.target.closest('.tag[data-skill]')) { clearTimeout(tipTimer); hideTip(); }
});
document.addEventListener('focusin', e => {
  const t = e.target.closest('.tag[data-skill]');
  if (t) showTip(t);
});
document.addEventListener('focusout', () => hideTip());
window.addEventListener('scroll', hideTip, {passive: true});

/* clicks on tags / chips / cards are delegated once */
let lastSkills = [], pendingScroll = null;
function buildHash({cat, shelf, skills, out}) {
  const s = (skills || []).join(',');
  const q = out ? `?out=${encodeURIComponent(out)}` : '';
  if (cat) return (s ? `#/cat/${cat}/skill/${s}` : `#/cat/${cat}`) + q;
  if (shelf) return (s ? `#/shelf/skill/${s}` : '#/shelf') + q;
  return (s ? `#/skill/${s}` : '#/') + q;
}
document.addEventListener('click', e => {
  const tag = e.target.closest('.tag[data-skill]');
  if (tag) {
    hideTip();
    const cur = parseHash();
    const sel = new Set(lastSkills);
    const id = tag.dataset.skill;
    if (sel.has(id)) sel.delete(id); else sel.add(id);
    pendingScroll = window.scrollY;
    go(buildHash({cat: cur.cat, shelf: cur.shelf, skills: [...sel], out: cur.out}));
    return;
  }
  const unskill = e.target.closest('[data-unskill]');
  if (unskill) {
    const cur = parseHash();
    pendingScroll = window.scrollY;
    go(buildHash({cat: cur.cat, shelf: cur.shelf,
      skills: lastSkills.filter(x => x !== unskill.dataset.unskill), out: cur.out}));
    return;
  }
  const outChip = e.target.closest('[data-out]');
  if (outChip) {
    const id = outChip.dataset.out, cur = parseHash();
    go(buildHash({cat: cur.cat, shelf: cur.shelf, skills: lastSkills,
      out: cur.out === id ? null : id}));
    return;
  }
  const chip = e.target.closest('[data-cat]');
  if (chip) {
    const id = chip.dataset.cat, cur = parseHash();
    /* any package change drops the previous package's skill picks —
       the shelf only ever shows the current package's skills */
    go(buildHash({cat: cur.cat === id ? null : id, skills: [], out: cur.out}));
    return;
  }
  const clear = e.target.closest('[data-clear]');
  if (clear) { go('#/'); return; }
  const card = e.target.closest('.card[data-href]');
  if (card) {
    if (e.target.closest('.ctag')) return;
    go(card.dataset.href);
    return;
  }
  const next = e.target.closest('[data-next]');
  if (next) { go(next.dataset.next); return; }
  const shelfBtn = e.target.closest('[data-shelf]');
  if (shelfBtn) {
    e.preventDefault();
    const cur = parseHash();
    go(buildHash({shelf: !cur.shelf, skills: lastSkills, out: cur.out}));
    return;
  }
  const navSkills = e.target.closest('[data-nav="skills"]');
  if (navSkills) {
    e.preventDefault();
    go('#/shelf');
    setTimeout(() => document.getElementById('shelf')?.scrollIntoView({behavior: 'smooth', block: 'center'}), 60);
  }
});
document.addEventListener('keydown', e => {
  const card = e.target.closest?.('.card[data-href]');
  if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); go(card.dataset.href); }
});

/* ------------------------------------------------------------ routing --- */
function parseHash() {
  const rawFull = location.hash.replace(/^#\/?/, '');
  const qi = rawFull.indexOf('?');
  const raw = qi < 0 ? rawFull : rawFull.slice(0, qi);
  const parts = raw.split('/').filter(Boolean);
  const st0 = {};
  if (qi >= 0) for (const kv of rawFull.slice(qi + 1).split('&')) {
    const [k, v] = kv.split('=');
    if (k === 'out' && v) st0.out = decodeURIComponent(v);
  }
  if (parts[0] === 'p' && parts[1]) return {view: 'detail', id: parts[1]};
  if (parts[0] === 'certs') return {view: 'certs'};
  if (parts[0] === 'about') return {view: 'about'};
  if (parts[0] === 'contact') return {view: 'contact'};
  if (parts[0] === 'skill' && parts[1]) return Object.assign(st0, {view: 'home', skills: parts[1].split(',').filter(Boolean)});
  if (parts[0] === 'cat' && parts[1]) {
    const st = Object.assign(st0, {view: 'home', cat: parts[1]});
    if (parts[2] === 'skill' && parts[3]) st.skills = parts[3].split(',').filter(Boolean);
    return st;
  }
  if (parts[0] === 'shelf') {
    const st = Object.assign(st0, {view: 'home', shelf: true});
    if (parts[1] === 'skill' && parts[2]) st.skills = parts[2].split(',').filter(Boolean);
    return st;
  }
  if (parts[0] === 'q') return Object.assign(st0, {view: 'home', q: decodeURIComponent(parts.slice(1).join('/') || '')});
  return Object.assign(st0, {view: 'home'});
}
function go(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

/* -------------------------------------------------------------- filter --- */
function filtered(state) {
  let list = projects.slice();
  if (state.cat)
    list = list.filter(p => p.skills.some(id => skillById[id]?.cat === state.cat));
  if (state.skills && state.skills.length)
    list = list.filter(p => state.skills.some(id => p.skills.includes(id)));
  if (state.out) list = list.filter(p => p.output === state.out);
  if (state.q) {
    const q = state.q.toLowerCase();
    list = list.filter(p => (p.name + ' ' + p.desc + ' ' + p.skills.map(id => skillById[id]?.name).join(' ')).toLowerCase().includes(q));
  }
  return list;
}

/* ---------------------------------------------------------------- home --- */
function renderHome(state) {
  document.title = 'Mohamed Amine Chafik — LORDUSecurity · Portfolio';
  const list = filtered(state);
  const total = projects.length;
  const cats = D.categories;
  lastSkills = (state.skills || []).slice();
  const skills = lastSkills.map(id => skillById[id]).filter(Boolean);
  const selSet = new Set(lastSkills);
  const cat = state.cat ? catById[state.cat] : null;
  const countIn = (pkg, g) => projects.filter(p => p.skills.some(id => {
    const s = skillById[id];
    return s && s.cat === pkg && (!g || s.grp === g);
  })).length;

  const shelf = `<section class="wrap" aria-label="All skills">
    <div class="skill-shelf${(state.shelf || cat) ? ' open' : ''}" id="shelf"><div class="shelf-inner">
      ${(cat ? [cat] : cats).map(c => `<div class="shelf-group">
        <div class="shelf-cat" style="--h:${catColor(c)}">${esc(c.name)}</div>
        <div class="shelf-body">${c.groups.map(g => {
          const list = skillsByGrp[c.id + '/' + g.id] || [];
          if (!list.length) return '';
          return `<div class="shelf-sub">
            <span class="shelf-sub-lab" style="--h:${catColor(c)}">${esc(g.name)}</span>
            <div class="shelf-tags">${list.map(s => skillTag(s, {on: selSet.has(s.id), count: skillWorkCount[s.id] || 0})).join('')}</div>
          </div>`;
        }).join('')}</div>
      </div>`).join('')}
    </div></div>
  </section>`;

  const cards = list.map((p, i) => {
    const kindCls = p.kind === 'Internship' ? ' intern' : '';
    const tags = p.tags.map(id => {
      const c = catById[id];
      return `<button type="button" class="ctag" data-cat="${id}" style="--h:${catColor(c)}" aria-label="Filter by ${esc(c.name)}"><span>${esc(c.name)}</span></button>`;
    }).join('');
    return `<article class="card" role="link" tabindex="0" data-href="#/p/${p.id}" style="--accent:${accent(p)};--shape:${chamfer(p.cuts)}" aria-label="${esc(p.name)}">
      <div class="face">
        <div class="card-media">
          <img src="${img(p, p.hero)}" alt="${esc(p.name)} interface" loading="${i < 4 ? 'eager' : 'lazy'}" decoding="async">
          <div class="scan"></div>
          <span class="idx">${String(i + 1).padStart(2, '0')}</span>
          <span class="kind${kindCls}">${esc(p.kind)}</span>
          ${p.output ? `<span class="output">${esc(p.output)}</span>` : ''}
        </div>
        <div class="card-body">
          <div class="card-top">
            ${p.logo ? `<img class="card-logo" src="${p.logo}" alt="" loading="eager" decoding="async">` : ''}
            <h3 class="card-title">${esc(p.name)}</h3>
          </div>
          <p class="card-desc">${esc(p.desc)}</p>
          <div class="card-tags">${tags}</div>
          <div class="card-foot"><span>${p.skills.length} skills</span><span class="card-open">Open →</span></div>
        </div>
      </div>
    </article>`;
  }).join('');

  const active = state.cat || skills.length || state.out || state.q;
  const activeChips = skills.map(s =>
    `<span class="active-filter" style="--h:${skillColor(s)}">${esc(s.name)} <button type="button" class="x" data-unskill="${s.id}" aria-label="Remove ${esc(s.name)} filter">×</button></span>`).join('')
    + (state.out ? `<span class="active-filter" style="--h:#8d939d">${esc(state.out)} <button type="button" class="x" data-out="${esc(state.out)}" aria-label="Remove output filter">×</button></span>` : '')
    + (state.q ? `<span class="active-filter">search: ${esc(state.q)} <button type="button" class="x" data-clear aria-label="Clear search">×</button></span>` : '');

  app.innerHTML = `
  <section class="hero wrap">
    <div class="eyebrow"><i></i>selected work · 2025—2026</div>
    <h1 class="hero-title"><span class="g" data-text="Works">Works</span> <span class="hero-amp">&amp;</span><br><span class="g" data-text="Internships">Internships</span></h1>
    <p class="hero-sub">Eleven builds — six applications, three platforms, two internships — kept together with
      the evidence behind every claim. <b>Pick the package you are hiring for</b> — fullstack, AI, cloud,
      security, networks — its skills open beneath it, grouped by discipline, and the works narrow to its
      builds. Tap the skills you need: every tap keeps the ones before it, and the works show the package's
      builds that use any of them. Switching package starts the picks fresh.</p>
    <div class="hero-meta">
      <div><b>${total}</b>works</div>
      <div><b>${D.skills.length}</b>skills</div>
      <div><b>${cats.length}</b>packages</div>
      <div><b>2</b>internships</div>
    </div>
  </section>

  <section class="filters" id="filters">
    <div class="wrap">
      <div class="filters-row">
        <span class="filters-lead">Filter</span>
        <button type="button" class="chip${!state.cat && !skills.length && !state.out && !state.q ? ' on' : ''}" data-clear style="--h:#8d939d" aria-pressed="${!state.cat && !skills.length && !state.out && !state.q}">
          <span class="face">All<span class="n">${total}</span></span></button>
        ${cats.map(c => catChip(c, {on: cat === c, count: countIn(c.id)})).join('')}
        <label class="search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/></svg>
          <input id="q" type="search" placeholder="Search" value="${esc(state.q || '')}" aria-label="Search works">
        </label>
        <button type="button" class="chip${state.shelf ? ' on' : ''}" data-shelf style="--h:#ffd23f" aria-expanded="${!!state.shelf}" aria-controls="shelf">
          <span class="face">All skills <span class="n">${D.skills.length}</span></span></button>
      </div>
      <div class="filters-row" style="margin-top:12px">
        <span class="filters-lab">Output</span>
        ${outputs.map(o => `<button type="button" class="chip${state.out === o ? ' on' : ''}" data-out="${esc(o)}" style="--h:#8d939d" aria-pressed="${state.out === o}">
          <span class="face">${esc(o)}<span class="n">${projects.filter(p => p.output === o).length}</span></span></button>`).join('')}
      </div>
      ${active ? `<div class="filters-row" style="margin-top:12px">
        <span class="results-count"><b>${list.length}</b> ${list.length === 1 ? 'work' : 'works'}</span>
        ${activeChips}
      </div>` : ''}
    </div>
  </section>

  ${shelf}

  <section class="wrap" id="results">
    <div class="results-head">
      <span class="results-count">${active ? `${list.length} of ${total}` : `all ${total}`} works</span>
      ${skills.length === 1 ? `<span class="results-count">used in ${Object.keys(skills[0].uses || {}).length} projects</span>` : ''}
    </div>
    ${list.length ? `<div class="grid">${cards}</div>` : `<div class="empty"><b>No work uses that combination.</b>Clear the filter and try another skill.</div>`}
  </section>`;

  // decode effect on the two words, once per mount
  requestAnimationFrame(() => {
    app.querySelectorAll('.g').forEach((el, i) => setTimeout(() => el.classList.add('on'), i * 90));
  });

  const input = document.getElementById('q');
  let t = null;
  input?.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const v = input.value.trim();
      const target = v ? `#/q/${encodeURIComponent(v)}` : '#/';
      history.replaceState(null, '', target);
      render({keepFocus: true});
      const ni = document.getElementById('q');
      if (ni) { ni.focus(); ni.setSelectionRange(ni.value.length, ni.value.length); }
    }, 180);
  });
}

/* -------------------------------------------------------------- detail --- */
function galleryMarkup(p) {
  const slides = p.images.map((f, i) => `<div class="g-slide${i === 0 ? ' on' : ''}" data-i="${i}"><img src="${img(p, f)}" alt="${esc(p.name)} screen ${i + 1}" loading="${i === 0 ? 'eager' : 'lazy'}"></div>`);
  let video = '';
  if (p.video) {
    slides.push(`<div class="g-slide" data-i="${p.images.length}"><video controls preload="none" playsinline poster="${img(p, p.hero)}"><source src="assets/video/${p.video}" type="video/mp4"></video></div>`);
  }
  const thumbs = p.images.map((f, i) => `<button type="button" class="thumb${i === 0 ? ' on' : ''}" data-go="${i}" aria-label="Screen ${i + 1}"><img src="${img(p, f)}" alt="" loading="lazy"></button>`);
  if (p.video) thumbs.push(`<button type="button" class="thumb vid" data-go="${p.images.length}" aria-label="Play walkthrough">▶</button>`);
  const n = p.images.length + (p.video ? 1 : 0);
  return `<div class="gallery"><div class="face">
    <div class="g-stage" id="gstage" tabindex="0" aria-label="Gallery, use arrow keys">
      ${slides.join('')}
      <div class="g-nav">
        <button type="button" class="g-btn" data-g="-1" aria-label="Previous">‹</button>
        <button type="button" class="g-btn" data-g="1" aria-label="Next">›</button>
      </div>
      <span class="g-count" id="gcount">01 / ${String(n).padStart(2, '0')}</span>
    </div>
    <div class="thumbs">${thumbs.join('')}</div>
  </div></div>`;
}

const MAIL = C.email_esi;

function askLink(p) {
  const subject = `${p.name} — request for the full build`;
  const body = p.sample
    ? `Hello,\n\nI'm looking at ${p.name} on your portfolio. The page offers ${p.sample.name} (${fmtSize(p.sample.bytes)}) as the packaged sample — could you send the full build?\n\nThank you.`
    : `Hello,\n\nI'm looking at ${p.name} on your portfolio. The page has no packaged sample — could you send the full build or the evidence pack?\n\nThank you.`;
  return `mailto:${MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const ASK_ANY = `mailto:${MAIL}?subject=${encodeURIComponent('Portfolio — request for the full builds')}`
  + `&body=${encodeURIComponent("Hello,\n\nI'd like a copy of the full builds behind your portfolio pages.\n\nThank you.")}`;

function actionsMarkup(p) {
  const out = [];
  if (p.sample) {
    const dl = `https://drive.google.com/uc?export=download&id=${p.sample.id}`;
    const label = /\.ipynb$/i.test(p.sample.name) ? 'Download notebook' : 'Download sample';
    out.push(`<a class="btn btn-accent cut cut-4" href="${dl}" target="_blank" rel="noopener">
      <span class="face">${label} <span class="arr">↓</span></span></a>`);
  }
  if (p.links && p.links.drive) out.push(`<a class="btn cut cut-4" href="${p.links.drive}" target="_blank" rel="noopener"><span class="face">Drive folder <span class="arr">↗</span></span></a>`);
  if (p.links && p.links.repo) out.push(`<a class="btn btn-ico cut cut-4" href="${p.links.repo}" target="_blank" rel="noopener" aria-label="Repository" title="Repository">
    <span class="face">${icon('brand:github')}</span></a>`);
  if (p.links && p.links.site) {
    if (p.links.site.includes('zenodo.org/records/')) out.push(`<a class="btn btn-ico cut cut-4" href="${p.links.site}" target="_blank" rel="noopener" aria-label="Zenodo" title="Zenodo record">
      <span class="face"><img src="assets/logos/zenodo-ze.png" alt=""></span></a>`);
    else out.push(`<a class="btn cut cut-4" href="${p.links.site}" target="_blank" rel="noopener"><span class="face">Live site <span class="arr">↗</span></span></a>`);
  }
  if (p.links && p.links.rg) out.push(`<a class="btn btn-ico cut cut-4" href="${p.links.rg}" target="_blank" rel="noopener" aria-label="ResearchGate" title="ResearchGate publication">
    <span class="face">${icon('brand:researchgate')}</span></a>`);
  return out.join('');
}

function renderDetail(state) {
  const p = projById[state.id];
  if (!p) { location.replace('#/'); return; }
  document.title = `${p.name} — LORDUSecurity`;
  const idx = projects.indexOf(p);
  const nx = projects[(idx + 1) % projects.length];
  const prev = projects[(idx - 1 + projects.length) % projects.length];

  const groups = {};
  p.skills.forEach(id => {
    const s = skillById[id];
    if (s) ((groups[s.cat] ||= {})[s.grp] ||= []).push(s);
  });
  const groupHtml = D.categories.filter(c => groups[c.id]).map(c => {
    const gs = groups[c.id];
    const n = Object.values(gs).reduce((a, b) => a + b.length, 0);
    return `<div class="sgroup" style="--h:${catColor(c)}"><div class="face">
      <div class="sgroup-head"><span class="dot"></span><h3>${esc(c.name)}</h3><span class="n">${n}</span></div>
      <div class="sgroup-subs">${c.groups.filter(g => gs[g.id]).map(g => `
        <div class="sgroup-sub">
          <h4 style="--h:${grpColor(c, grpById[c.id][g.id])}">${esc(g.name)}</h4>
          <div class="tags">${gs[g.id].map(s => skillTag(s, {proj: p.id})).join('')}</div>
        </div>`).join('')}</div>
    </div></div>`;
  }).join('');

  app.innerHTML = `
  <article class="detail wrap" style="--accent:${accent(p)}">
    <a class="back" href="#/">← All works</a>
    <header class="d-head">
      ${p.logo ? `<img class="d-logo" src="${p.logo}" alt="">` : ''}
      <div>
        <h1 class="d-title"><span class="g" data-text="${esc(p.name)}">${esc(p.name)}</span></h1>
        <div class="d-meta">
          <span class="accent">${esc(p.kind)}</span>
          ${p.output ? `<span class="d-output">${esc(p.output)}</span>` : ''}
          ${p.org ? `<span>${esc(p.org)}</span>` : ''}
          <span>${esc(p.year)}</span>
          <span>${p.skills.length} skills</span>
        </div>
      </div>
    </header>

    <div class="d-top">
      ${galleryMarkup(p)}
      <aside class="d-aside">
        <p class="d-desc">${esc(p.desc)}</p>
        <div class="stats">${p.stats.map(([v, l]) => `<div class="stat"><div><b>${esc(v)}</b><span>${esc(l)}</span></div></div>`).join('')}</div>
        <div class="actions">${actionsMarkup(p)}</div>
        ${p.sample ? `<p class="d-file">${esc(p.sample.name)} · ${fmtSize(p.sample.bytes)}</p>`
                   : `<p class="d-file">No packaged sample — the evidence pack holds the runs; ask and I'll send the build.</p>`}
      </aside>
    </div>

    <section class="d-section">
      <div class="sec-head"><span class="sec-num">01</span><h2 class="sec-title">Skills in this work</h2><span class="sec-line"></span></div>
      <p class="results-count" style="margin:-8px 0 16px">Hover a skill to read how it was used here; click it to see every work that used it.</p>
      <div class="skill-groups">${groupHtml}</div>
    </section>

    <div class="d-next">
      <div><div class="lbl">Previous</div><a href="#/p/${prev.id}">← ${esc(prev.name)}</a></div>
      <div style="text-align:right"><div class="lbl">Next</div><a href="#/p/${nx.id}">${esc(nx.name)} →</a></div>
    </div>
  </article>`;

  requestAnimationFrame(() => app.querySelector('.g')?.classList.add('on'));

  // ---- gallery
  const stage = document.getElementById('gstage');
  const slides = [...document.querySelectorAll('.g-slide')];
  const thumbs = [...document.querySelectorAll('.thumb')];
  const count = document.getElementById('gcount');
  let cur = 0;
  const show = i => {
    cur = (i + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle('on', k === cur));
    thumbs.forEach((t, k) => t.classList.toggle('on', k === cur));
    count.textContent = `${String(cur + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    slides.forEach((s, k) => { const v = s.querySelector('video'); if (v && k !== cur) v.pause(); });
  };
  stage.querySelectorAll('[data-g]').forEach(b => b.addEventListener('click', () => show(cur + Number(b.dataset.g))));
  thumbs.forEach(t => t.addEventListener('click', () => show(Number(t.dataset.go))));
  stage.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(cur - 1); }
  });
  let sx = null;
  stage.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, {passive: true});
  stage.addEventListener('touchend', e => {
    if (sx == null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 40) show(cur + (dx < 0 ? 1 : -1));
    sx = null;
  }, {passive: true});
}

/* -------------------------------------------------------------- certs --- */
const CERT_URL = 'https://catalog-education.oracle.com/ords/certview/sharebadge?id=F0FE164FB755632613A561E35EFF90EAFE325D9502ABBF4F84673819621703A4';
const CERT_AREAS = [
  'Implementing Identity and Access Management',
  'Protecting Infrastructure, Network, and Applications',
  'Implementing OS and Workload Protection',
  'Protecting Data',
  'Detecting, Remediating, and Monitoring OCI Resources',
];

function renderCerts() {
  document.title = 'Certifications — LORDUSecurity';

  app.innerHTML = `
  <section class="hero wrap">
    <div class="eyebrow"><i></i>verified credentials · 2026</div>
    <h1 class="hero-title"><span class="g" data-text="Certifications">Certifications</span></h1>
    <p class="hero-sub">The security credential I hold — issued by Oracle, publicly verifiable on CertView,
      and listed here with the same holder, dates and exam scope the record carries.</p>
    <div class="hero-meta">
      <div><b>1</b>credential</div>
      <div><b>Oracle</b>issuer</div>
      <div><b>2028</b>valid until</div>
    </div>
  </section>

  <article class="cert wrap" style="--accent:#ff5b3d">
    <div class="cert-top">
      <div class="cert-card">
        <div class="face">
          <div class="cert-head">
            <span class="cert-issuer">${icon('brand:oracle')}Oracle <span>University</span></span>
            <span class="cert-state">verified · CertView</span>
          </div>
          <p class="cert-kicker">Oracle Cloud Infrastructure 2025</p>
          <h2 class="cert-title">Certified<br><b>Security</b> Professional</h2>
          <dl class="cert-meta">
            <div><dt>Awarded to</dt><dd>Mohamed Amine Chafik</dd></div>
            <div><dt>Issued</dt><dd>28 February 2026</dd></div>
            <div><dt>Valid until</dt><dd>29 February 2028</dd></div>
            <div><dt>Exam</dt><dd>Hands-on performance</dd></div>
          </dl>
          <div class="cert-scope" aria-label="Exam scope">
            <span>IAM</span><span>Network &amp; apps</span><span>OS &amp; workloads</span><span>Data</span><span>Monitoring</span>
          </div>
          <span class="cert-wm" aria-hidden="true">OCI</span>
        </div>
      </div>

      <aside class="cert-aside">
        <h2 class="cert-aside-title">The credential</h2>
        <p>Oracle's hands-on, performance-based security exam for engineers who design and operate security in
          OCI — no multiple-choice shortcut. It is intended for practitioners with two or more years of security
          design experience and at least six months securing workloads on the platform.</p>
        <div class="actions">
          <a class="btn btn-accent cut cut-4" href="${CERT_URL}" target="_blank" rel="noopener">
            <span class="face">Verify on CertView <span class="arr">↗</span></span></a>
          <a class="btn btn-ghost cut cut-4" href="#/cat/security"><span class="face">Security work</span></a>
        </div>
        <p class="cert-note">Holder, dates and scope above are read from the Oracle CertView share badge. The
          certificate file itself is not published here — the badge is the record.</p>
      </aside>
    </div>

    <section class="d-section">
      <div class="sec-head"><span class="sec-num">01</span><h2 class="sec-title">What the exam validates</h2><span class="sec-line"></span></div>
      <div class="cert-domains">
        ${CERT_AREAS.map((a, i) => `<div class="cert-domain"><div>
          <b>${String(i + 1).padStart(2, '0')}</b><p>${esc(a)}</p>
        </div></div>`).join('')}
      </div>
    </section>
  </article>`;

  requestAnimationFrame(() => app.querySelector('.g')?.classList.add('on'));
}

/* ------------------------------------------------------------ contact --- */
const WA = `https://wa.me/${C.whatsapp}`;
const handle = u => u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

const CHANNELS = [
  ['mail', 'Email', C.email, `mailto:${C.email}`],
  ['phone', 'Phone', C.phone, `tel:${C.tel}`],
  ['chat', 'WhatsApp', C.phone, WA],
];
const SOCIALS = [
  ['brand:github', 'GitHub', handle(C.github), C.github],
  ['brand:linkedin', 'LinkedIn', handle(C.linkedin), C.linkedin],
  ['brand:instagram', 'Instagram', handle(C.instagram), C.instagram],
  ['brand:facebook', 'Facebook', handle(C.facebook), C.facebook],
];

function contactBlock() {
  return `
  <div class="chan-list">
    ${CHANNELS.map(([ic, l, v, h]) =>
      `<a class="chan" href="${h}">${icon(ic)}<span><b>${esc(l)}</b><i>${esc(v)}</i></span><span class="arr">↗</span></a>`).join('')}
  </div>
  <div class="socials socials-grid">
    ${SOCIALS.map(([ic, l, v, h]) =>
      `<a class="slink" href="${h}" target="_blank" rel="noopener">${icon(ic)}<span><b>${esc(l)}</b><i>${esc(v)}</i></span></a>`).join('')}
  </div>`;
}

/* ---------------------------------------------------------------- about --- */
const EDU = [
  ['ESI Rabat', 'Engineering degree — Information Systems Security &amp; Cybersecurity (ISSIC)', '2024 → expected July 2027'],
  ['Lycée Ben Abdoun, Rabat', 'Classes préparatoires aux grandes écoles — MPSI / MP', 'Sept 2022 → June 2024'],
];

function renderAbout() {
  document.title = 'About — LORDUSecurity';

  /* coursework skills: the shelf's own packages and tiles, but each one is
     claimed by the degree rather than by a linked work, so it stays here and
     cannot be clicked through to a project */
  const cwRows = D.categories.filter(c => D.coursework.some(k => k.cat === c.id))
    .map(c => {
      const items = D.coursework.filter(k => k.cat === c.id);
      return `<div class="shelf-group">
        <div class="shelf-cat" style="--h:${catColor(c)}">${esc(c.name)}<span class="cw-n">${items.length}</span></div>
        <div class="shelf-tags">${items.map(k =>
          `<span class="tag cw" style="--h:${catColor(c)}">
            <span class="face"><span>${esc(k.name)}</span></span></span>`).join('')}
        </div></div>`;
    }).join('');
  const cwBlock = `<details class="cw-shelf">
    <summary><span class="cw-sum">ESI coursework skills</span>
      <span class="cw-sum-n">${D.coursework.length} across ${new Set(D.coursework.map(k => k.cat)).size} packages</span>
      <span class="cw-gpa" title="Cumulative GPA 3.0 / 4 — 75th percentile">
        <span class="gpa-ring" style="--p:75" aria-hidden="true"><b>3.0</b><i>GPA</i></span></span></summary>
    <div class="cw-body"><div class="cw-inner">${cwRows}</div></div>
  </details>`;

  /* the quote walked as a thread: the two lines that are his sit on the sender's
     side, the heckler's line opposite. A real chat says when each line landed and
     whether it was read, so each bubble carries its time and the sender's carry
     the ticks — the first read (the reply proves it), the last still waiting. */
  const tick = '<svg class="tk" viewBox="0 0 18 12" fill="none" stroke="currentColor" ' +
    'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M1.2 6.4 4 9.2 10.6 2.2"/><path d="M7.8 6.4 10.6 9.2 17.2 2.2"/></svg>';
  const convo = `
    <section class="jack-sec">
      <div class="jack" aria-label="Jack of all trades">
        <p class="bub me b1">Jack of all trades,<span class="mt seen"><time>09:41</time>${tick}</span></p>
        <p class="bub them b2">master of none,<span class="mt"><time>09:41</time></span></p>
        <p class="bub me b3">but oftentimes better than a master of one.<span class="mt"><time>09:43</time>${tick}</span></p>
      </div>
    </section>`;

  app.innerHTML = `
  <section class="hero wrap">
    <div class="eyebrow"><i></i>about · 2026</div>
    <h1 class="hero-title"><span class="g" data-text="About">About</span></h1>
    <p class="hero-sub">${esc(C.role)} in Rabat, finishing the engineering degree at ESI. Eleven builds are
      catalogued here — applications, platforms and two internships — each with the measurement behind its
      claims rather than an adjective.</p>
    <div class="hero-meta">
      <div><b>${projects.length}</b>works</div>
      <div><b>${D.skills.length}</b>skills</div>
      <div><b>1</b>certification</div>
      <div><b>2</b>internships</div>
    </div>
  </section>

  <article class="about wrap">
    ${convo}
    <div class="about-top">
      <div class="about-prose">
        <p>What arrives at the other end of a hire — each of these has been built once, measured, and shipped:</p>
        <ul class="can-list">
          <li><b>AI engineering — directing AI to build apps</b>
            <span>Guiding AI agents to ship software and checking every output against the source: 10 logged
              sessions, 14,798 tool calls, and a revision trail where agent errors were caught and corrected —
              a reporter that rendered its own attack payload, a hallucinated class name. The build is directed
              and reviewed, not accepted on faith.</span>
            <i>GameVerse · FixProof · ESI Wiki · Pentest Agent · this portfolio</i></li>
          <li><b>Secured full-stack web apps</b>
            <span>Django + React, Angular + Flask, Java EE, Laravel, Express + MySQL — login with session
              regeneration, server-side validation, hardened uploads, injection and XSS closed in the code path.</span>
            <i>ESI Wiki · Litmus · GameVerse · CryptoMarket · Kids' Garden</i></li>
          <li><b>AI chatbots & RAG assistants</b>
            <span>Grounded retrieval over your own corpus — 1,403 documents and 19,646 chunks indexed with four
              answer tiers and honest refusals — plus a LangChain agent tool with offline fallback.</span>
            <i>ESI Wiki assistant · Pentest Agent</i></li>
          <li><b>Automation workflows</b>
            <span>n8n pipelines, device-CLI parsers and Docker Compose delivery: router dumps into a 1,794-row
              provisioning workbook in 2.62 s, secret-stripped before anything leaves the machine — the Litmus
              detector ships as three workflows too, all credential-free.</span>
            <i>raxag internship · Litmus workflows</i></li>
          <li><b>ML notebooks & predictions</b>
            <span>Intrusion detection re-run over 6.32M flows (0.9350 macro-F1 on rare attacks) and AWS cost
              prediction on 294,086 cleaned rows, cross-checked in SPSS — evaluations report the gap, not just the score.</span>
            <i>CSE-CIC-IDS2018 · Cloud Cost Prediction</i></li>
          <li><b>Packaged Windows tools</b>
            <span>PyInstaller builds handed over as one-click exes, keyed and keyless variants so credentials
              never travel in a shared file, with an install guide per build.</span>
            <i>Litmus · raxag · FixProof · Pentest Agent</i></li>
          <li><b>Security testing & hardening</b>
            <span>Local-only XSS/SQLi retest suite (51 checks, nothing leaves 127.0.0.1), Cisco ISE rollout with
              RADIUS + 802.1X, and OCI IAM / Vault KMS under an Oracle certification.</span>
            <i>FixProof · Cisco ISE internship · OCI certified</i></li>
        </ul>
      </div>
      <aside class="about-card">
        <div class="face">
          <dl>
            <div><dt>Based in</dt><dd>${esc(C.location)}</dd></div>
            <div><dt>Studying</dt><dd>ISSIC — ESI Rabat</dd></div>
            <div><dt>Graduating</dt><dd>July 2027</dd></div>
            <div><dt>Certified by</dt><dd>Oracle — OCI Security Professional</dd></div>
            <div><dt>Languages</dt><dd>Arabic (native) · English (advanced) · French (intermediate)</dd></div>
          </dl>
          <div class="actions">
            <a class="btn btn-accent cut cut-4" href="#/contact"><span class="face">Contact <span class="arr">↗</span></span></a>
            <a class="btn btn-ghost cut cut-4" href="#/"><span class="face">The work</span></a>
          </div>
        </div>
      </aside>
    </div>

    <section class="d-section">
      <div class="sec-head"><span class="sec-num">01</span><h2 class="sec-title">Education</h2><span class="sec-line"></span></div>
      <div class="edu">
        ${EDU.map(([w, what, when, course], i) => `<div class="edu-row"><b>${w}</b><span>${what}${course ? `<em class="edu-course">${course}</em>` : ''}</span><i>${when}</i></div>${i === 0 ? cwBlock : ''}`).join('')}
      </div>
    </section>

    <section class="d-section">
      <div class="sec-head"><span class="sec-num">02</span><h2 class="sec-title">Where the numbers come from</h2><span class="sec-line"></span></div>
      <p class="about-note">Each work page is generated from the project's own artefacts: the test run, the
        benchmark log, the notebook output or the packaged file. Nothing on these pages is an estimate, and
        where a figure could not be measured it is left out rather than rounded up. The evidence pack behind
        the catalogue is available on request — <a href="#/contact">ask and I'll send it</a>.</p>
    </section>

    <section class="d-section">
      <div class="sec-head"><span class="sec-num">03</span><h2 class="sec-title">Reach me</h2><span class="sec-line"></span></div>
      ${contactBlock()}
    </section>
  </article>`;

  requestAnimationFrame(() => app.querySelector('.g')?.classList.add('on'));
  app.querySelectorAll('details.cw-shelf').forEach(bindShelfAnim);
}

/* animate a <details> open/close: the row-height transition needs the open
   attribute held until the collapse finishes */
function bindShelfAnim(d) {
  const sum = d.querySelector('summary');
  const body = d.querySelector('.cw-body');
  sum.addEventListener('click', e => {
    e.preventDefault();
    if (d.classList.contains('open')) {
      d.classList.remove('open');
      const done = ev => {
        if (ev.propertyName !== 'grid-template-rows') return;
        body.removeEventListener('transitionend', done);
        d.open = false;
      };
      body.addEventListener('transitionend', done);
    } else {
      d.open = true;
      requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add('open')));
    }
  });
}

/* --------------------------------------------------------------- contact --- */
function renderContact() {
  document.title = 'Contact — LORDUSecurity';

  app.innerHTML = `
  <section class="hero wrap">
    <div class="eyebrow"><i></i>contact · 2026</div>
    <h1 class="hero-title"><span class="g" data-text="Contact">Contact</span></h1>
    <p class="hero-sub">${esc(C.name)} — ${esc(C.role)}. Email is the surest channel; WhatsApp and a call work
      for a short question. ${esc(C.location)}.</p>
  </section>

  <article class="contact wrap">
    <div class="contact-grid">
      <section>
        <div class="sec-head"><span class="sec-num">01</span><h2 class="sec-title">Channels</h2><span class="sec-line"></span></div>
        <div class="chan-list">
          ${[...CHANNELS, ['mail', 'ESI address', C.email_esi, `mailto:${C.email_esi}`]]
            .map(([ic, l, v, h]) => `<a class="chan" href="${h}">${icon(ic)}<span><b>${esc(l)}</b><i>${esc(v)}</i></span><span class="arr">↗</span></a>`).join('')}
        </div>
      </section>

      <aside class="contact-aside">
        <h2 class="cert-aside-title">Full builds and samples</h2>
        <p>Some builds are packaged on the page; others are not public links. The keyed ESI archive embeds
          provider credentials, and the GameVerse jar-only zip is not the shipped server — both go hand to hand
          after a mail. Restricted Drive folders behave the same way.</p>
        <div class="actions">
          <a class="btn btn-accent cut cut-4" href="${ASK_ANY}"><span class="face">Ask for a build <span class="arr">✉</span></span></a>
        </div>
        <p class="cert-note">Send the work's name and what you need — the source, the packaged build, or the
          evidence pack behind a figure.</p>
      </aside>
    </div>

    <section class="d-section">
      <div class="sec-head"><span class="sec-num">02</span><h2 class="sec-title">Elsewhere</h2><span class="sec-line"></span></div>
      <div class="socials socials-grid">
        ${SOCIALS.map(([ic, l, v, h]) =>
          `<a class="slink" href="${h}" target="_blank" rel="noopener">${icon(ic)}<span><b>${esc(l)}</b><i>${esc(v)}</i></span><span class="arr">↗</span></a>`).join('')}
      </div>
    </section>
  </article>`;

  requestAnimationFrame(() => app.querySelector('.g')?.classList.add('on'));
}

/* ---------------------------------------------------------------- footer --- */
function renderFooter() {
  const f = document.querySelector('.foot-inner');
  if (!f) return;
  f.innerHTML = `
  <div class="foot-grid">
    <div class="foot-col foot-id">
      <p class="foot-name">${esc(C.name)}</p>
      <p class="foot-role">${esc(C.role)}</p>
      <p class="foot-line">Every number on these pages was read off the project itself: source, logs,
        benchmarks and screenshots collected in an evidence pack.</p>
    </div>
    <nav class="foot-col" aria-label="Pages">
      <h4 class="foot-h">Pages</h4>
      <a href="#/">Works</a>
      <a href="#/certs">Certifications</a>
      <a href="#/shelf">Skills</a>
      <a href="#/about">About</a>
      <a href="#/contact">Contact</a>
      <a href="museum/index.html">3D museum</a>
    </nav>
    <div class="foot-col">
      <h4 class="foot-h">Direct</h4>
      ${CHANNELS.map(([ic, l, v, h]) =>
        `<a class="foot-chan" href="${h}">${icon(ic)}<span><b>${esc(l)}</b><i>${esc(v)}</i></span></a>`).join('')}
    </div>
    <div class="foot-col">
      <h4 class="foot-h">Elsewhere</h4>
      <div class="socials socials-foot">
        ${SOCIALS.map(([ic, l, , h]) =>
          `<a class="slink slink-ico" href="${h}" target="_blank" rel="noopener" aria-label="${esc(l)}" title="${esc(l)}">${icon(ic)}</a>`).join('')}
      </div>
    </div>
  </div>
  <div class="foot-actions">
    <a class="btn cut cut-4" href="museum/index.html"><span class="face">Enter the museum <span class="arr">↗</span></span></a>
  </div>
  <p class="foot-fine">© 2026 ${esc(C.name)} · ${esc(C.location)} · ${esc(C.email)}</p>`;
}

/* --------------------------------------------------------------- boot --- */
function markNav(state) {
  const active = state.view === 'certs' ? 'certs'
    : state.view === 'about' ? 'about'
    : state.view === 'contact' ? 'contact'
    : state.view === 'home' && (state.shelf || state.cat) ? 'skills' : 'works';
  document.querySelectorAll('.top-nav .nav-link').forEach(a => {
    const on = a.dataset.nav === active;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}
function render() {
  const state = parseHash();
  hideTip();
  markNav(state);
  if (state.view === 'certs') renderCerts();
  else if (state.view === 'about') renderAbout();
  else if (state.view === 'contact') renderContact();
  else if (state.view === 'detail') renderDetail(state);
  else renderHome(state);
  /* the header museum button reads --accent outside the page shell:
     ride it on the work's own hue while a detail page is open */
  const dp = state.view === 'detail' && projById[state.id];
  document.documentElement.style.setProperty('--accent', dp ? accent(dp) : '');
  document.body.classList.toggle('fx-cursor', !!state.shelf);
  if (pendingScroll != null) { window.scrollTo(0, pendingScroll); pendingScroll = null; }
  else window.scrollTo({top: 0, behavior: 'instant' in window ? 'instant' : 'auto'});
}
renderFooter();
window.addEventListener('hashchange', render);

/* pointer-tracked backdrop, live only on the Skills route (body.fx-cursor):
   the light follows the cursor and the grid drifts a few pixels against it */
const bgCursor = document.getElementById('bgCursor');
const bgGrid = document.querySelector('.bg-grid');
let px = innerWidth / 2, py = innerHeight * .3, raf = 0;
addEventListener('pointermove', e => {
  px = e.clientX; py = e.clientY;
  if (!raf) raf = requestAnimationFrame(() => {
    raf = 0;
    if (!document.body.classList.contains('fx-cursor')) return;
    bgCursor.style.setProperty('--mx', px + 'px');
    bgCursor.style.setProperty('--my', py + 'px');
    bgGrid.style.setProperty('--gx', ((px / innerWidth) - .5) + '');
    bgGrid.style.setProperty('--gy', ((py / innerHeight) - .5) + '');
  });
}, {passive: true});

render();
})();
