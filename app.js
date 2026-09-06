/* ─── SHARED DAYZ MANAGER-STYLE SHELL ───────────────── */
function upgradeLegacyShell() {
  const legacyHeader = document.querySelector('.topbar');
  if (!legacyHeader) return;

  document.body.classList.add('dm-layout', 'interior-layout');
  const file = window.location.pathname.split('/').pop() || 'index.html';
  const links = [
    ['index.html', 'Home'], ['server.html', 'Servers'], ['rules.html', 'Rules'],
    ['news.html', 'News'], ['events.html', 'Events'], ['gallery.html', 'Gallery'],
    ['shop.html', 'Support Us']
  ];
  legacyHeader.outerHTML = `
    <header class="manager-nav">
      <a class="manager-brand" href="index.html"><img class="brand-logo" src="assets/HiveLogo.webp" alt=""><span>THE HIVE<small>DAYZ COMMUNITY</small></span></a>
      <button class="menu-toggle" aria-label="Open navigation" aria-expanded="false" aria-controls="site-nav"><span></span><span></span><span></span></button>
      <nav id="site-nav" class="manager-links" aria-label="Primary navigation">
        ${links.map(([href, label]) => `<a href="${href}" class="${file === href ? 'active' : ''}">${label}</a>`).join('')}
      </nav>
      <a class="manager-login" href="https://discord.gg/thehivedayz" target="_blank" rel="noopener">Join Discord</a>
    </header>`;

  document.querySelector('.sidebar')?.remove();
  document.querySelector('.overlay')?.remove();
  const legacyFooter = document.querySelector('footer');
  if (legacyFooter) {
    legacyFooter.className = 'manager-footer';
    legacyFooter.innerHTML = `
      <a class="manager-brand" href="index.html"><img class="brand-logo" src="assets/HiveLogo.webp" alt=""><span>THE HIVE<small>DAYZ COMMUNITY</small></span></a>
      <div>${links.slice(1).map(([href, label]) => `<a href="${href}">${label}</a>`).join('')}</div>
      <p>© <span id="year"></span> The Hive DayZ. Not affiliated with Bohemia Interactive.</p>`;
  }
}
upgradeLegacyShell();

/* ─── NAVIGATION TOGGLE ───────────────── */
const btn = document.querySelector('.menu-toggle');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const adminForm = document.querySelector('[data-admin-form]');
const adminMessage = document.querySelector('[data-admin-message]');
const postForm = document.getElementById('postForm');
const galleryForm = document.getElementById('galleryForm');
const discordWidget = document.querySelector('[data-discord-widget]');
const siteNav = document.getElementById('site-nav');

async function loadNitradoStatus() {
  const grid = document.querySelector('[data-live-server-grid]');
  const totalPlayers = document.querySelector('[data-total-players]');
  try {
    const response = await fetch('api/server-status.php', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Status unavailable');
    const data = await response.json();
    if (!data.ok || !Array.isArray(data.servers)) throw new Error('Invalid status');
    if (totalPlayers) totalPlayers.textContent = `${data.totals.players}/${data.totals.slots}`;
    if (grid) {
      const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
      grid.innerHTML = data.servers.map((server) => {
        const online = ['started', 'running', 'online'].includes(String(server.status).toLowerCase());
        const percent = server.slots ? Math.min(100, Math.round((server.players / server.slots) * 100)) : 0;
        return `<article class="live-server-card">
          <div class="live-server-head"><span class="live-dot ${online ? 'online' : ''}"></span><small>${online ? 'ONLINE' : server.status.toUpperCase()}</small></div>
          <h3>${escapeHtml(server.label)}</h3><p>${escapeHtml(server.name)}</p>
          <strong>${server.players}<span> / ${server.slots} players</span></strong>
          <div class="player-meter"><i style="width:${percent}%"></i></div>
          ${server.map ? `<small class="map-label">${escapeHtml(server.map)}</small>` : ''}
        </article>`;
      }).join('');
    }
  } catch (error) {
    if (grid) grid.innerHTML = '<div class="status-unavailable">Live Nitrado status is temporarily unavailable. Server details remain below.</div>';
  }
}
if (document.querySelector('[data-live-server-grid]') || document.querySelector('[data-total-players]')) loadNitradoStatus();

if (btn && siteNav) {
  btn.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(isOpen));
  });
  siteNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    siteNav.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }));
}

if (btn && sidebar && overlay) {
  btn.addEventListener('click', () => {
    btn.classList.toggle('active');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
    const isOpen = sidebar.classList.contains('open');
    btn.setAttribute('aria-expanded', String(isOpen));
  });

  overlay.addEventListener('click', () => {
    btn.classList.remove('active');
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
    btn.setAttribute('aria-expanded', 'false');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      btn.classList.remove('active');
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
}

if (adminForm) {
  adminForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = adminForm.querySelector('input[type="password"]');
    if (!input) {
      return;
    }
    const entered = input.value.trim();
    const expected = adminForm.dataset.adminPasscode || '';
    if (entered && entered === expected) {
      if (adminMessage) {
        adminMessage.textContent = 'Access granted. Redirecting...';
      }
      window.location.href = 'admin.html';
      return;
    }
    if (adminMessage) {
      adminMessage.textContent = 'Incorrect passcode. Try again.';
    }
    input.focus();
    input.select();
  });
}

if (postForm) {
  const preview = document.getElementById('preview');
  const typeInput = document.getElementById('type');
  const titleInput = document.getElementById('title');
  const dateInput = document.getElementById('date');
  const contentInput = document.getElementById('content');

  const updatePreview = () => {
    if (!preview) {
      return;
    }
    preview.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'preview-card';
    card.innerHTML = `
      <h3>${titleInput?.value || 'Post Title'}</h3>
      <p>${contentInput?.value || 'Post content will appear here.'}</p>
      <small>${typeInput?.value === 'news' ? 'News' : 'Event'} • ${dateInput?.value || 'Date'}</small>
    `;
    preview.appendChild(card);
  };

  [typeInput, titleInput, dateInput, contentInput].forEach((input) => {
    if (input) {
      input.addEventListener('input', updatePreview);
    }
  });
  updatePreview();
}

if (galleryForm) {
  const galleryPreview = document.getElementById('gallery-preview');
  const galleryTitle = document.getElementById('gallery-title');
  const galleryDescription = document.getElementById('gallery-description');
  const galleryImage = document.getElementById('gallery-image');

  const updateGalleryPreview = () => {
    if (!galleryPreview) {
      return;
    }
    galleryPreview.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'preview-card';
    card.innerHTML = `
      <img src=\"${galleryImage?.value || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80'}\" alt=\"${galleryTitle?.value || 'Gallery preview'}\" />
      <h3>${galleryTitle?.value || 'Gallery Title'}</h3>
      <p>${galleryDescription?.value || 'Gallery caption will appear here.'}</p>
    `;
    galleryPreview.appendChild(card);
  };

  [galleryTitle, galleryDescription, galleryImage].forEach((input) => {
    if (input) {
      input.addEventListener('input', updateGalleryPreview);
    }
  });
  updateGalleryPreview();
}

if (discordWidget) {
  const serverId = discordWidget.dataset.discordServerId;
  if (serverId && serverId !== 'YOUR_SERVER_ID') {
    discordWidget.src = `https://discord.com/widget?id=${serverId}&theme=dark`;
  } else {
    const fallback = document.createElement('div');
    fallback.className = 'discord-note';
    fallback.textContent = 'Add your Discord server ID to enable the widget.';
    discordWidget.replaceWith(fallback);
  }
}

/* ─── FOOTER YEAR ───────────────── */
const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

/* Live server data is intentionally not fabricated. */

/* ─── COUNTDOWN ───────────────── */
function countdown() {
  const eventDate = nextRaidWindow();
  const now = new Date().getTime();
  const diff = eventDate - now;

  const countdownEl = document.getElementById('countdown');
  if (!countdownEl) {
    return;
  }
  if (diff < 0) {
    countdownEl.textContent = "Event Live!";
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000*60*60*24)) / (1000*60*60));
  const minutes = Math.floor((diff % (1000*60*60)) / (1000*60));
  const seconds = Math.floor((diff % (1000*60)) / 1000);

  countdownEl.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
}
function nextRaidWindow() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {timeZone:'America/New_York',weekday:'short',year:'numeric',month:'2-digit',day:'2-digit'});
  const parts = Object.fromEntries(formatter.formatToParts(now).map(part => [part.type, part.value]));
  const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  let daysAhead = (5 - weekdays.indexOf(parts.weekday) + 7) % 7;
  const easternHour = Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',hour12:false}).format(now));
  if (daysAhead === 0 && easternHour >= 20) daysAhead = 7;
  const target = new Date(now.getTime() + daysAhead * 86400000);
  const targetParts = Object.fromEntries(formatter.formatToParts(target).map(part => [part.type, part.value]));
  return new Date(`${targetParts.year}-${targetParts.month}-${targetParts.day}T20:00:00-04:00`).getTime();
}
countdown();
if (document.getElementById('countdown')) {
  setInterval(countdown, 1000);
}

/* ─── LOAD NEWS ───────────────── */
fetch('news.json')
  .then(res => res.json())
  .then(news => {
    const feed = document.getElementById('news-feed');
    if (!feed) {
      return;
    }
    feed.innerHTML = '';
    news.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(item => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h3>${item.title}</h3>
        <p>${item.content}</p>
        <span class="date">${new Date(item.date).toDateString()}</span>
      `;
      feed.appendChild(card);
    });
  });

/* ─── LOAD EVENTS ───────────────── */
fetch('events.json')
  .then(res => res.json())
  .then(events => {
    const feed = document.getElementById('events-feed');
    if (!feed) {
      return;
    }
    events.forEach(event => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h3>${event.title}</h3>
        <p>${event.description}</p>
        <p><strong>${event.recurring ? event.date : new Date(event.date).toLocaleString()}</strong></p>
      `;
      feed.appendChild(card);
    });
  });

/* ─── LOAD GALLERY ───────────────── */
fetch('gallery.json')
  .then(res => res.json())
  .then(items => {
    const feed = document.getElementById('gallery-feed');
    if (!feed) {
      return;
    }
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'gallery-card';
      card.innerHTML = `
        <img src=\"${item.image}\" alt=\"${item.title}\" />
        <span>${item.title}</span>
        <p>${item.description}</p>
      `;
      feed.appendChild(card);
    });
  });
