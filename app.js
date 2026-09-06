'use strict';

const RAID_TIMEZONE = 'America/New_York';
const STATUS_REFRESH_MS = 30_000;
const ONLINE_STATES = new Set(['started', 'running', 'online']);

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function showToast(message) {
  const toast = $('[data-toast]');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function setupNavigation() {
  const button = $('.menu-toggle');
  const nav = $('#site-nav');
  if (!button || !nav) return;

  const close = () => {
    nav.classList.remove('open');
    button.setAttribute('aria-expanded', 'false');
  };

  button.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    button.setAttribute('aria-expanded', String(open));
  });
  $$('a', nav).forEach((link) => link.addEventListener('click', close));
  document.addEventListener('keydown', (event) => event.key === 'Escape' && close());
}

function isServerOnline(status) {
  return ONLINE_STATES.has(String(status || '').toLowerCase());
}

function setGlobalServerState(state, onlineCount = 0, totalCount = 0) {
  $$('[data-global-status]').forEach((element) => {
    element.dataset.state = state;
    const label = $('span:last-child', element);
    if (!label) return;
    if (element.classList.contains('console-live')) {
      label.textContent = state === 'online' ? 'LIVE' : state === 'degraded' ? 'PARTIAL' : state === 'offline' ? 'OFFLINE' : state === 'unavailable' ? 'UNAVAILABLE' : 'CHECKING';
    } else {
      label.textContent = state === 'online'
        ? 'Xbox servers online'
        : state === 'degraded'
          ? `${onlineCount}/${totalCount} Xbox servers online`
          : state === 'offline'
            ? 'Xbox servers offline'
            : state === 'unavailable'
              ? 'Live status unavailable'
              : 'Checking Xbox servers…';
    }
  });
}

function createServerCard(server) {
  const online = isServerOnline(server.status);
  const slots = Number.isFinite(Number(server.slots)) ? Number(server.slots) : 0;
  const players = Number.isFinite(Number(server.players)) ? Number(server.players) : 0;
  const percent = slots > 0 ? Math.min(100, Math.round((players / slots) * 100)) : 0;

  const article = document.createElement('article');
  article.className = `live-server-card${online ? ' is-online' : ''}`;

  const head = document.createElement('div');
  head.className = 'live-server-head';
  const dot = document.createElement('span');
  dot.className = `live-dot${online ? ' online' : ''}`;
  const state = document.createElement('small');
  state.textContent = online ? 'ONLINE' : String(server.status || 'UNKNOWN').toUpperCase();
  head.append(dot, state);

  const title = document.createElement('h3');
  title.textContent = server.label || 'Hive Server';
  const name = document.createElement('p');
  name.textContent = server.name || 'The Hive';

  const count = document.createElement('strong');
  count.append(document.createTextNode(String(players)));
  const countLabel = document.createElement('span');
  countLabel.textContent = ` / ${slots} players`;
  count.append(countLabel);

  const meter = document.createElement('div');
  meter.className = 'player-meter';
  const fill = document.createElement('i');
  fill.style.width = `${percent}%`;
  meter.append(fill);

  article.append(head, title, name, count, meter);
  if (server.map) {
    const map = document.createElement('small');
    map.className = 'map-label';
    map.textContent = server.map;
    article.append(map);
  }
  return article;
}

function renderHomeServerList(servers) {
  const list = $('[data-home-server-list]');
  if (!list) return;
  list.replaceChildren();
  servers.slice(0, 4).forEach((server) => {
    const row = document.createElement('div');
    row.className = 'console-server-row';
    const dot = document.createElement('i');
    if (isServerOnline(server.status)) dot.classList.add('online');
    const detail = document.createElement('span');
    const label = document.createElement('b');
    label.textContent = server.label || 'Hive Server';
    const sub = document.createElement('small');
    sub.textContent = server.map || server.name || 'DayZ';
    detail.append(label, sub);
    const count = document.createElement('strong');
    count.textContent = `${Number(server.players) || 0}/${Number(server.slots) || 0}`;
    row.append(dot, detail, count);
    list.append(row);
  });
}

function setStatusUnavailable(message = 'Live Nitrado status is temporarily unavailable.') {
  setGlobalServerState('unavailable');
  const grid = $('[data-live-server-grid]');
  if (grid) {
    const box = document.createElement('div');
    box.className = 'status-unavailable';
    const strong = document.createElement('strong');
    strong.textContent = 'Could not reach the live server feed.';
    box.append(strong, document.createTextNode(message));
    grid.replaceChildren(box);
  }
  const updated = $('[data-status-updated]');
  if (updated) updated.textContent = 'Live feed unavailable';
  const list = $('[data-home-server-list]');
  if (list) {
    const row = document.createElement('div');
    row.className = 'console-server-row';
    const dot = document.createElement('i');
    const detail = document.createElement('span');
    const label = document.createElement('b');
    label.textContent = 'Live feed unavailable';
    const sub = document.createElement('small');
    sub.textContent = 'Server information remains available on the Servers page.';
    detail.append(label, sub);
    const count = document.createElement('strong');
    count.textContent = '—';
    row.append(dot, detail, count);
    list.replaceChildren(row);
  }
}

let statusLoading = false;
async function loadServerStatus({ manual = false } = {}) {
  if (statusLoading) return;
  if (!$('[data-live-server-grid]') && !$('[data-total-players]') && !$('[data-global-status]') && !$('[data-home-server-list]')) return;
  statusLoading = true;
  const refreshButton = $('[data-refresh-status]');
  if (refreshButton) {
    refreshButton.disabled = true;
    refreshButton.textContent = 'Refreshing…';
  }

  try {
    const response = await fetch('/api/server-status', { headers: { Accept: 'application/json' }, cache: 'no-store' });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok || !Array.isArray(data.servers)) throw new Error(data?.error || 'Status unavailable');

    const servers = data.servers;
    const onlineCount = servers.filter((server) => isServerOnline(server.status)).length;
    const state = onlineCount === servers.length && servers.length ? 'online' : onlineCount > 0 ? 'degraded' : 'offline';
    setGlobalServerState(state, onlineCount, servers.length);

    const totals = data.totals || {};
    $$('[data-total-players]').forEach((element) => {
      element.textContent = `${Number(totals.players) || 0}/${Number(totals.slots) || 0}`;
      element.classList.remove('loading-pulse');
    });

    const grid = $('[data-live-server-grid]');
    if (grid) grid.replaceChildren(...servers.map(createServerCard));
    renderHomeServerList(servers);

    const updated = $('[data-status-updated]');
    if (updated) {
      const stamp = data.updated_at ? new Date(data.updated_at) : new Date();
      updated.textContent = `Updated ${stamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}`;
    }
    if (manual) showToast('Live server status refreshed.');
  } catch (error) {
    setStatusUnavailable(error instanceof Error ? error.message : undefined);
    if (manual) showToast('Live server status is unavailable right now.');
  } finally {
    statusLoading = false;
    if (refreshButton) {
      refreshButton.disabled = false;
      refreshButton.textContent = 'Refresh now';
    }
  }
}

function setupServerStatus() {
  const needsStatus = $('[data-live-server-grid]') || $('[data-total-players]') || $('[data-global-status]') || $('[data-home-server-list]');
  if (!needsStatus) return;
  loadServerStatus();
  setInterval(() => loadServerStatus(), STATUS_REFRESH_MS);
  $('[data-refresh-status]')?.addEventListener('click', () => loadServerStatus({ manual: true }));
}

function zoneParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23'
  });
  return Object.fromEntries(formatter.formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
}

function zoneOffsetMs(date, timeZone) {
  const parts = zoneParts(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

function zonedDateToUtc(year, month, day, hour, minute, timeZone) {
  const wallTime = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = wallTime;
  for (let i = 0; i < 3; i += 1) guess = wallTime - zoneOffsetMs(new Date(guess), timeZone);
  return guess;
}

function raidWindow(now = new Date()) {
  const parts = zoneParts(now, RAID_TIMEZONE);
  const localDay = Date.UTC(parts.year, parts.month - 1, parts.day);
  const weekday = new Date(localDay).getUTCDay();
  const daysSinceFriday = (weekday - 5 + 7) % 7;
  const fridayDay = localDay - daysSinceFriday * 86_400_000;
  const friday = new Date(fridayDay);
  const fridayYear = friday.getUTCFullYear();
  const fridayMonth = friday.getUTCMonth() + 1;
  const fridayDate = friday.getUTCDate();
  const startPseudo = Date.UTC(fridayYear, fridayMonth - 1, fridayDate, 20, 0, 0);
  const endPseudo = startPseudo + 2 * 86_400_000;
  const currentPseudo = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);

  let live = false;
  let targetPseudo;
  if (currentPseudo >= startPseudo && currentPseudo < endPseudo) {
    live = true;
    targetPseudo = endPseudo;
  } else if (currentPseudo < startPseudo) {
    targetPseudo = startPseudo;
  } else {
    targetPseudo = startPseudo + 7 * 86_400_000;
  }

  const target = new Date(targetPseudo);
  const targetUtc = zonedDateToUtc(target.getUTCFullYear(), target.getUTCMonth() + 1, target.getUTCDate(), target.getUTCHours(), target.getUTCMinutes(), RAID_TIMEZONE);
  return { live, targetUtc };
}

function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function updateRaidCountdown() {
  const countdowns = $$('[data-raid-countdown]');
  const labels = $$('[data-raid-label]');
  if (!countdowns.length && !labels.length) return;
  const window = raidWindow();
  const remaining = window.targetUtc - Date.now();
  countdowns.forEach((element) => { element.textContent = formatDuration(remaining); });
  labels.forEach((element) => { element.textContent = window.live ? 'RAID LIVE • ENDS IN' : 'RAID OPENS IN'; });
}

function setupRaidCountdown() {
  if (!$('[data-raid-countdown]') && !$('[data-raid-label]')) return;
  updateRaidCountdown();
  setInterval(updateRaidCountdown, 1000);
}

function createTextCard(titleText, bodyText, metaText) {
  const card = document.createElement('article');
  card.className = 'card';
  const title = document.createElement('h3');
  title.textContent = titleText;
  const body = document.createElement('p');
  body.textContent = bodyText;
  const meta = document.createElement('span');
  meta.className = 'date';
  meta.textContent = metaText;
  card.append(title, body, meta);
  return card;
}

function displayDate(value) {
  if (!value) return '';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? new Date(`${value}T12:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

async function loadNews() {
  const feed = $('#news-feed');
  if (!feed) return;
  try {
    const response = await fetch('news.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load news');
    const news = await response.json();
    if (!Array.isArray(news)) throw new Error('Invalid news feed');
    const limit = Number(feed.dataset.newsLimit || 0);
    const items = [...news].sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const shown = limit > 0 ? items.slice(0, limit) : items;
    feed.replaceChildren(...shown.map((item) => createTextCard(item.title || 'Hive Update', item.content || '', displayDate(item.date))));
  } catch {
    const error = document.createElement('div');
    error.className = 'status-unavailable';
    error.textContent = 'Community updates could not be loaded right now.';
    feed.replaceChildren(error);
  }
}

async function loadEvents() {
  const feed = $('#events-feed');
  if (!feed) return;
  try {
    const response = await fetch('events.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load events');
    const events = await response.json();
    if (!Array.isArray(events)) throw new Error('Invalid event feed');
    feed.replaceChildren(...events.map((event) => createTextCard(event.title || 'Hive Event', event.description || '', event.recurring ? String(event.date || 'Recurring') : displayDate(event.date))));
  } catch {
    const error = document.createElement('div');
    error.className = 'status-unavailable';
    error.textContent = 'The event schedule could not be loaded right now.';
    feed.replaceChildren(error);
  }
}

function setupLightbox() {
  const lightbox = $('[data-lightbox]');
  if (!lightbox) return;
  const image = $('[data-lightbox-image]', lightbox);
  const caption = $('[data-lightbox-caption]', lightbox);
  const close = () => {
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };
  $('[data-lightbox] .lightbox-close')?.addEventListener('click', close);
  lightbox.addEventListener('click', (event) => { if (event.target === lightbox) close(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && lightbox.classList.contains('open')) close(); });
  lightbox.openImage = (src, title, description) => {
    if (image) { image.src = src; image.alt = title || 'The Hive gallery image'; }
    if (caption) caption.textContent = [title, description].filter(Boolean).join(' — ');
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };
}

async function loadGallery() {
  const feed = $('#gallery-feed');
  if (!feed) return;
  try {
    const response = await fetch('gallery.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load gallery');
    const items = await response.json();
    if (!Array.isArray(items)) throw new Error('Invalid gallery feed');
    const lightbox = $('[data-lightbox]');
    const cards = items.map((item) => {
      const card = document.createElement('article');
      card.className = 'gallery-card';
      card.tabIndex = 0;
      const image = document.createElement('img');
      image.src = item.image || '';
      image.alt = item.title || 'The Hive community moment';
      image.loading = 'lazy';
      image.decoding = 'async';
      const body = document.createElement('div');
      const title = document.createElement('span');
      title.textContent = item.title || 'Community Moment';
      const description = document.createElement('p');
      description.textContent = item.description || '';
      body.append(title, description);
      card.append(image, body);
      const open = () => lightbox?.openImage?.(image.src, item.title, item.description);
      card.addEventListener('click', open);
      card.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
      return card;
    });
    feed.replaceChildren(...cards);
  } catch {
    const error = document.createElement('div');
    error.className = 'status-unavailable';
    error.textContent = 'Gallery images could not be loaded right now.';
    feed.replaceChildren(error);
  }
}

function setupRuleSearch() {
  const input = $('[data-rule-search]');
  if (!input) return;
  const cards = $$('.rule-card');
  const sections = $$('[data-rule-section]');
  const empty = $('[data-rules-empty]');
  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    let visible = 0;
    cards.forEach((card) => {
      const match = !query || card.textContent.toLowerCase().includes(query);
      card.hidden = !match;
      if (match) visible += 1;
    });
    sections.forEach((section) => {
      const sectionCards = $$('.rule-card', section);
      section.hidden = query && sectionCards.length > 0 && sectionCards.every((card) => card.hidden);
    });
    empty?.classList.toggle('show', Boolean(query) && visible === 0);
  });
}

function setupCopyButtons() {
  $$('[data-copy-search]').forEach((button) => {
    button.addEventListener('click', async () => {
      const value = button.dataset.copySearch || '';
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        const input = document.createElement('textarea');
        input.value = value;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.append(input);
        input.select();
        document.execCommand('copy');
        input.remove();
      }
      showToast(`Copied: ${value}`);
    });
  });
}

function setupYear() {
  $$('#year').forEach((element) => { element.textContent = String(new Date().getFullYear()); });
}

setupNavigation();
setupYear();
setupServerStatus();
setupRaidCountdown();
setupRuleSearch();
setupCopyButtons();
setupLightbox();
loadNews();
loadEvents();
loadGallery();
