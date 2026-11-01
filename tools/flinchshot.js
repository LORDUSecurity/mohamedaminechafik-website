/* Pins the corruption clock to a frame that is inside a flinch, so a still can
   show the spasm. Usage: node tools/flinchshot.js <out.png> [tearIndex] */
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');

const OUT = process.argv[2] || 'C:\\art-museum\\tools\\flinch.png';
const I = +(process.argv[3] || 1);

const PIN = `(async () => {
  const s = window.MuseumApp.state.scene;
  const g = [];
  s.traverse(o => { if (o.material && o.material.uniforms && o.material.uniforms.uNeon) g.push(o.material); });
  const gh = g[${I}];
  if (!gh) return 'NO GHOST';
  /* find a beat time where this tear is mid-spasm */
  let hit = null;
  for (let t = 0; t < 240 && !hit; t += 0.02) {
    window.Glitch.tick(t, false);
    if (gh.uniforms.uRoll.value !== 0) hit = t;
  }
  if (!hit) return 'NO FLINCH FOUND';
  if (window.__pin) cancelAnimationFrame(window.__pin);
  const loop = () => { window.Glitch.tick(hit, false); window.__pin = requestAnimationFrame(loop); };
  loop();
  return JSON.stringify({ t: hit,
                          roll: gh.uniforms.uRoll.value,
                          bands: gh.uniforms.uRollBands.value,
                          split: gh.uniforms.uSplit.value });
})()`;

function getJSON(path) {
  return new Promise((res, rej) => {
    http.get({ host: '127.0.0.1', port: 9333, path }, r => {
      let b = ''; r.on('data', d => b += d); r.on('end', () => res(JSON.parse(b)));
    }).on('error', rej);
  });
}

(async () => {
  const page = (await getJSON('/json/list')).find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false });
  let id = 0; const pending = new Map();
  ws.on('message', raw => {
    const m = JSON.parse(raw);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });
  const send = (method, params) => new Promise(r => {
    const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params }));
  });
  const ev = async (e) => {
    const o = await send('Runtime.evaluate',
      { expression: e, awaitPromise: true, returnByValue: true, timeout: 180000 });
    return o.result && o.result.result && o.result.result.value;
  };
  await new Promise(r => ws.on('open', r));
  await send('Runtime.enable', {});
  await send('Page.enable', {});
  /* stand square to The Scream, then hold the clock inside a spasm */
  await ev(`window.MuseumApp.jumpTo(0.236291)`);
  await new Promise(r => setTimeout(r, 2500));
  console.log('PIN', await ev(PIN));
  await new Promise(r => setTimeout(r, 2000));
  const img = await send('Page.captureScreenshot', { format: 'png' });
  if (img.result && img.result.data) {
    fs.writeFileSync(OUT, Buffer.from(img.result.data, 'base64'));
    console.log('->', OUT);
  } else console.log('no shot', JSON.stringify(img).slice(0, 200));
  await ev(`if (window.__pin) cancelAnimationFrame(window.__pin); window.__pin = 0;`);
  ws.close();
})();
