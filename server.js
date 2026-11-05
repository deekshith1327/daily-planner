const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const port = Number(process.env.PORT || 3000);
const dataFile = path.join(root, 'data.json');
const defaultState = { tasks: [] };

function readState() {
  try { return { ...defaultState, ...JSON.parse(fs.readFileSync(dataFile, 'utf8')) }; }
  catch { return { ...defaultState }; }
}
function writeState(state) {
  fs.writeFileSync(dataFile, JSON.stringify(state, null, 2));
}
function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'GET' && url.pathname === '/api/state') return send(res, 200, readState());
  if (req.method === 'PUT' && url.pathname === '/api/state') {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 1_000_000) req.destroy(); });
    req.on('end', () => {
      try { const state = JSON.parse(raw); if (!Array.isArray(state.tasks)) throw new Error(); writeState({ tasks: state.tasks }); send(res, 200, { ok: true }); }
      catch { send(res, 400, { error: 'Expected a state object with a tasks array.' }); }
    });
    return;
  }
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    return fs.readFile(path.join(root, 'index.html'), (error, file) => error ? send(res, 500, 'Unable to load the app.', 'text/plain') : send(res, 200, file.toString(), 'text/html; charset=utf-8'));
  }
  send(res, 404, { error: 'Not found' });
}).listen(port, () => console.log(`Daylight API running at http://localhost:${port}`));
