'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const port = Number(process.env.PORT || 3000);
const STATUS_TTL_MS = 30_000;
const REQUEST_TIMEOUT_MS = 9_000;
const statusCache = { expires: 0, body: null };

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function securityHeaders(extra = {}) {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    ...extra
  };
}

function json(res, status, payload) {
  res.writeHead(status, securityHeaders({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  }));
  res.end(JSON.stringify(payload));
}

function diagnosticError(code) {
  const error = new Error(code);
  error.diagnosticCode = code;
  return error;
}

async function nitradoGet(url, token) {
  let response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'User-Agent': 'TheHiveDayZ-Website/2.0'
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch (error) {
    throw diagnosticError(error?.name === 'TimeoutError' ? 'REQUEST_TIMEOUT' : 'NETWORK_FAILURE');
  }

  if (!response.ok) throw diagnosticError(`HTTP_${response.status}`);

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw diagnosticError('INVALID_JSON');
  }

  if (!payload || typeof payload !== 'object') throw diagnosticError('INVALID_RESPONSE');
  if (payload.status && payload.status !== 'success') throw diagnosticError('API_REPORTED_FAILURE');
  return payload.data || {};
}

function cleanList(value) {
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function detectDayZ(game, serviceDetails = {}) {
  const identifiers = [
    game?.game,
    game?.game_short,
    game?.game_name,
    game?.folder,
    game?.folder_short,
    game?.portlist_short,
    serviceDetails?.game,
    serviceDetails?.folder_short,
    serviceDetails?.portlist_short
  ].filter((value) => typeof value === 'string' && value.trim());

  if (identifiers.some((value) => /day\s*z/i.test(value))) return true;

  // Some Nitrado responses omit a useful game identifier. The Hive's public
  // hostname is a safe secondary hint without exposing or relying on IDs.
  const publicNames = [
    game?.query?.server_name,
    game?.settings?.config?.hostname,
    serviceDetails?.name
  ].filter((value) => typeof value === 'string' && value.trim());
  return publicNames.some((value) => /50x\s*\|\s*the hive/i.test(value));
}

function publicServerFrom(game, label) {
  const query = game.query && typeof game.query === 'object' ? game.query : {};
  const config = game.settings?.config && typeof game.settings.config === 'object' ? game.settings.config : {};
  const players = Number(query.player_current ?? query.players_current ?? 0);
  const slots = Number(query.player_max ?? query.players_max ?? config.maxplayers ?? config.max_players ?? 0);

  return {
    label,
    name: String(query.server_name || config.hostname || label || 'The Hive'),
    status: String(game.status || 'unknown'),
    map: String(query.map || config.map || ''),
    players: Number.isFinite(players) ? players : 0,
    slots: Number.isFinite(slots) ? slots : 0
  };
}

async function buildServerStatus() {
  const token = String(process.env.NITRADO_TOKEN || '').trim();
  if (!token) throw diagnosticError('TOKEN_NOT_CONFIGURED');

  const labels = cleanList(process.env.NITRADO_SERVER_LABELS);
  const configuredIds = cleanList(process.env.NITRADO_SERVICE_IDS).filter((value) => /^\d+$/.test(value));
  const serviceHints = new Map();
  let ids = [...configuredIds];
  let serviceCount = null;

  if (!ids.length) {
    const data = await nitradoGet('https://api.nitrado.net/services', token);
    if (!Array.isArray(data.services)) throw diagnosticError('INVALID_SERVICES_RESPONSE');
    serviceCount = data.services.length;

    for (const service of data.services) {
      const id = String(service?.id || '');
      if (!/^\d+$/.test(id)) continue;
      ids.push(id);
      serviceHints.set(id, service?.details && typeof service.details === 'object' ? service.details : {});
    }
  }

  if (!ids.length) throw diagnosticError('NO_SERVICES');

  const discovered = [];
  const failures = [];
  for (const [index, id] of ids.entries()) {
    try {
      const data = await nitradoGet(`https://api.nitrado.net/services/${encodeURIComponent(id)}/gameservers`, token);
      if (!data.gameserver || typeof data.gameserver !== 'object') {
        failures.push('INVALID_GAMESERVER_RESPONSE');
        continue;
      }

      const game = data.gameserver;
      const explicitlyConfigured = configuredIds.includes(id);
      if (!explicitlyConfigured && !detectDayZ(game, serviceHints.get(id))) continue;

      const label = labels[discovered.length] || `Hive Server ${discovered.length + 1}`;
      discovered.push(publicServerFrom(game, label));
    } catch (error) {
      // 404 generally means the service is not a gameserver product. Skip only that case.
      if (error?.diagnosticCode === 'HTTP_404') continue;
      failures.push(error?.diagnosticCode || 'UNEXPECTED_FAILURE');
      // If IDs were explicitly configured, surface the failure instead of silently hiding it.
      if (configuredIds.includes(id)) throw error;
    }

    // Keep the loop metadata local; never log or return service IDs.
    void index;
  }

  if (!discovered.length) {
    const error = diagnosticError('NO_MATCHING_DAYZ_SERVICES');
    error.serviceCount = serviceCount ?? ids.length;
    error.failureCount = failures.length;
    throw error;
  }

  return {
    ok: true,
    updated_at: new Date().toISOString(),
    servers: discovered,
    totals: {
      players: discovered.reduce((sum, server) => sum + server.players, 0),
      slots: discovered.reduce((sum, server) => sum + server.slots, 0)
    }
  };
}

async function serverStatus(res) {
  if (statusCache.body && Date.now() < statusCache.expires) return json(res, 200, statusCache.body);

  try {
    const body = await buildServerStatus();
    statusCache.body = body;
    statusCache.expires = Date.now() + STATUS_TTL_MS;
    return json(res, 200, body);
  } catch (error) {
    const safeCodes = new Set([
      'TOKEN_NOT_CONFIGURED', 'REQUEST_TIMEOUT', 'NETWORK_FAILURE', 'INVALID_JSON', 'INVALID_RESPONSE',
      'API_REPORTED_FAILURE', 'INVALID_SERVICES_RESPONSE', 'INVALID_GAMESERVER_RESPONSE', 'NO_SERVICES',
      'NO_MATCHING_DAYZ_SERVICES', 'HTTP_400', 'HTTP_401', 'HTTP_403', 'HTTP_404', 'HTTP_429',
      'HTTP_500', 'HTTP_502', 'HTTP_503', 'HTTP_504'
    ]);
    const code = safeCodes.has(error?.diagnosticCode) ? error.diagnosticCode : 'UNEXPECTED_FAILURE';

    console.error('[Nitrado]', JSON.stringify({
      code,
      serviceCount: Number.isFinite(error?.serviceCount) ? error.serviceCount : null,
      failureCount: Number.isFinite(error?.failureCount) ? error.failureCount : null,
      usingCachedData: Boolean(statusCache.body)
    }));

    if (statusCache.body) {
      return json(res, 200, { ...statusCache.body, stale: true });
    }

    if (code === 'TOKEN_NOT_CONFIGURED') return json(res, 503, { ok: false, error: 'Live server status is not configured.' });
    if (code === 'NO_MATCHING_DAYZ_SERVICES') return json(res, 502, { ok: false, error: 'No DayZ gameserver services were found for this token. Configure NITRADO_SERVICE_IDS in Railway.' });
    return json(res, 502, { ok: false, error: 'Live status is temporarily unavailable.' });
  }
}

function serveStatic(req, res) {
  let requestPath;
  try {
    requestPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400, securityHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }));
    return res.end('Bad request');
  }

  const relative = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
  if (!relative || relative.split('/').some((segment) => segment.startsWith('.'))) {
    res.writeHead(404, securityHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }));
    return res.end('Not found');
  }

  const filePath = path.resolve(root, relative);
  if (!filePath.startsWith(`${root}${path.sep}`) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, securityHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }));
    return res.end('Not found');
  }

  const extension = path.extname(filePath).toLowerCase();
  const cacheControl = extension === '.html' ? 'no-cache' : 'public, max-age=3600';
  res.writeHead(200, securityHeaders({
    'Content-Type': mime[extension] || 'application/octet-stream',
    'Cache-Control': cacheControl
  }));

  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;

  if (req.method === 'GET' && (pathname === '/api/server-status' || pathname === '/api/server-status.php')) {
    return serverStatus(res);
  }
  if (req.method === 'GET' && pathname === '/api/health') {
    return json(res, 200, { ok: true, service: 'the-hive-website' });
  }
  if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res);

  res.writeHead(405, securityHeaders({ 'Content-Type': 'text/plain; charset=utf-8', Allow: 'GET, HEAD' }));
  res.end('Method not allowed');
});

server.listen(port, '0.0.0.0', () => console.log(`The Hive website listening on ${port}`));

function shutdown(signal) {
  console.log(`Received ${signal}; closing The Hive website.`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
