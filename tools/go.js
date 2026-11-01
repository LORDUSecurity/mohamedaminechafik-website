/* Point the headless tab at a URL and wait for the museum to boot.
   Usage: node tools/go.js http://127.0.0.1:8123/index.html */
const WebSocket = require('ws');
const http = require('http');
const url = process.argv[2];

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
  const send = (method, params) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await new Promise(r => ws.on('open', r));
  await send('Runtime.enable', {});
  await send('Page.enable', {});
  await send('Page.navigate', { url });
  for (let i = 0; i < 90; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const ev = await send('Runtime.evaluate', {
      expression: "window.MuseumApp && MuseumApp.state.rig ? 'ready' : 'booting'",
      returnByValue: true
    });
    if (ev.result && ev.result.result && ev.result.result.value === 'ready') { console.log('READY'); ws.close(); return; }
  }
  console.log('TIMEOUT');
  process.exit(1);
})().catch(e => { console.error('go failed:', e.message); process.exit(1); });
