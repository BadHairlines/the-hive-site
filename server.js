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
  let response;
  try {
    response = await fetch(url, {headers:{Authorization:`Bearer ${token}`,Accept:'application/json','User-Agent':'TheHiveDayZ-Website/1.0'},signal:AbortSignal.timeout(10000)});
  } catch (error) {
    throw diagnosticError(error?.name === 'TimeoutError' ? 'REQUEST_TIMEOUT' : 'NETWORK_FAILURE');
  }
  if (!response.ok) throw diagnosticError(`HTTP_${response.status}`);
  let payload;
  try { payload = await response.json(); }
  catch { throw diagnosticError('INVALID_JSON'); }
  if (!payload || typeof payload !== 'object') throw diagnosticError('INVALID_RESPONSE');
  if (payload.status && payload.status !== 'success') throw diagnosticError('API_REPORTED_FAILURE');
  return payload.data || {};
}

function diagnosticError(code) {
  const error = new Error(code);
  error.diagnosticCode = code;
  return error;
}

async function serverStatus(res) {
  if (cache.body && Date.now() < cache.expires) return json(res, 200, cache.body);
  const token = String(process.env.NITRADO_TOKEN || '').trim();
  if (!token) return json(res, 503, {ok:false,error:'Live server status is not configured.'});
  let stage = 'configuration';
  let serviceCount = null;
  let matchedCount = null;
  let serverIndex = null;
  try {
    const labels = String(process.env.NITRADO_SERVER_LABELS || '').split(',').map(v=>v.trim()).filter(Boolean);
    let ids = String(process.env.NITRADO_SERVICE_IDS || '').split(',').map(v=>v.trim()).filter(v=>/^\d+$/.test(v));
    if (!ids.length) {
      stage = 'service_discovery';
      const data = await nitradoGet('https://api.nitrado.net/services', token);
      if (!Array.isArray(data.services)) throw diagnosticError('INVALID_SERVICES_RESPONSE');
      serviceCount = data.services.length;
      ids = (data.services || []).filter(service => {
        const type = String(service.service_type || '').toLowerCase();
        const game = String(service.details?.game || '').toLowerCase();
        return type === 'gameserver' && (!game || game.includes('dayz'));
      }).map(service=>String(service.id)).filter(id=>/^\d+$/.test(id));
    }
    matchedCount = ids.length;
    if (!ids.length) throw diagnosticError('NO_MATCHING_DAYZ_SERVICES');
    const servers = [];
    for (const [index, id] of ids.entries()) {
      stage = 'gameserver_details';
      serverIndex = index + 1;
      const data = await nitradoGet(`https://api.nitrado.net/services/${encodeURIComponent(id)}/gameservers`, token);
      if (!data.gameserver || typeof data.gameserver !== 'object') throw diagnosticError('INVALID_GAMESERVER_RESPONSE');
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
    // Only locally generated codes and counts: never log tokens, URLs,
    // response bodies, headers, service IDs, or raw exception messages.
    const code = /^(HTTP_[1-5][0-9]{2}|REQUEST_TIMEOUT|NETWORK_FAILURE|INVALID_JSON|INVALID_RESPONSE|API_REPORTED_FAILURE|INVALID_SERVICES_RESPONSE|NO_MATCHING_DAYZ_SERVICES|INVALID_GAMESERVER_RESPONSE)$/.test(error?.diagnosticCode || '')
      ? error.diagnosticCode : 'UNEXPECTED_FAILURE';
    console.error('[Nitrado]', JSON.stringify({stage, code, serviceCount, matchedCount, serverIndex, usingCachedData: Boolean(cache.body)}));
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
