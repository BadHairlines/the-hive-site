const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const port = Number(process.env.PORT || 3000);
const cache = { expires: 0, body: null };
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg'};

function json(res, status, payload) {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=30','X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(payload));
}

async function nitradoGet(url, token) {
  const response = await fetch(url, {headers:{Authorization:`Bearer ${token}`,Accept:'application/json','User-Agent':'TheHiveDayZ-Website/1.0'},signal:AbortSignal.timeout(10000)});
  if (!response.ok) throw new Error(`Nitrado returned ${response.status}`);
  const payload = await response.json();
  return payload.data || {};
}

async function serverStatus(res) {
  if (cache.body && Date.now() < cache.expires) return json(res, 200, cache.body);
  const token = String(process.env.NITRADO_TOKEN || '').trim();
  if (!token) return json(res, 503, {ok:false,error:'Live server status is not configured.'});
  try {
    const labels = String(process.env.NITRADO_SERVER_LABELS || '').split(',').map(v=>v.trim()).filter(Boolean);
    let ids = String(process.env.NITRADO_SERVICE_IDS || '').split(',').map(v=>v.trim()).filter(v=>/^\d+$/.test(v));
    if (!ids.length) {
      const data = await nitradoGet('https://api.nitrado.net/services', token);
      ids = (data.services || []).filter(service => {
        const type = String(service.service_type || '').toLowerCase();
        const game = String(service.details?.game || '').toLowerCase();
        return type === 'gameserver' && (!game || game.includes('dayz'));
      }).map(service=>String(service.id)).filter(id=>/^\d+$/.test(id));
    }
    if (!ids.length) throw new Error('No accessible DayZ services found');
    const servers = [];
    for (const [index, id] of ids.entries()) {
      const data = await nitradoGet(`https://api.nitrado.net/services/${encodeURIComponent(id)}/gameservers`, token);
      const game = data.gameserver || {};
      const query = game.query || {};
      const config = game.settings?.config || {};
      servers.push({
        label: labels[index] || `Hive Server ${index + 1}`,
        name: String(query.server_name || config.hostname || labels[index] || 'The Hive'),
        status: String(game.status || 'unknown'),
        map: String(query.map || ''),
        players: Number(query.player_current || 0),
        slots: Number(query.player_max || config.maxplayers || 0)
      });
    }
    const body = {ok:true,updated_at:new Date().toISOString(),servers,totals:{players:servers.reduce((n,s)=>n+s.players,0),slots:servers.reduce((n,s)=>n+s.slots,0)}};
    cache.body = body; cache.expires = Date.now() + 30000;
    return json(res, 200, body);
  } catch (error) {
    if (cache.body) return json(res, 200, cache.body);
    return json(res, 502, {ok:false,error:'Live status is temporarily unavailable.'});
  }
}

function serveStatic(req, res) {
  const requestPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const relative = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
  const filePath = path.resolve(root, relative);
  if (!filePath.startsWith(root + path.sep) || relative.startsWith('.') || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}); return res.end('Not found');
  }
  res.writeHead(200, {'Content-Type':mime[path.extname(filePath).toLowerCase()] || 'application/octet-stream','X-Content-Type-Options':'nosniff'});
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (req.method === 'GET' && pathname === '/api/server-status.php') return serverStatus(res);
  if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res);
  res.writeHead(405, {'Content-Type':'text/plain; charset=utf-8'}); res.end('Method not allowed');
});

server.listen(port, '0.0.0.0', () => console.log(`The Hive website listening on ${port}`));
