/* ─── SIDEBAR TOGGLE ───────────────── */
const btn = document.querySelector('.menu-toggle');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const adminForm = document.querySelector('[data-admin-form]');
const adminMessage = document.querySelector('[data-admin-message]');
const postForm = document.getElementById('postForm');
const galleryForm = document.getElementById('galleryForm');
const discordWidget = document.querySelector('[data-discord-widget]');

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

/* ─── FAKE SERVER STATUS ───────────────── */
function updateServerStatus() {
  const maxPlayers = 50;
  const currentPlayers = Math.floor(Math.random() * maxPlayers);
  const uptime = '12h 34m';
  const playerCountEl = document.getElementById('player-count');
  const uptimeEl = document.getElementById('server-uptime');
  if (playerCountEl) {
    playerCountEl.textContent = `${currentPlayers}/${maxPlayers}`;
  }
  if (uptimeEl) {
    uptimeEl.textContent = uptime;
  }
}
updateServerStatus();
if (document.getElementById('player-count') || document.getElementById('server-uptime')) {
  setInterval(updateServerStatus, 10000);
}

/* ─── COUNTDOWN ───────────────── */
function countdown() {
  const eventDate = new Date("2026-01-20T20:00:00").getTime();
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
    news.reverse().forEach(item => {
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
        <p><strong>${new Date(event.date).toLocaleString()}</strong></p>
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
