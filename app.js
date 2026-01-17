const btn = document.querySelector('.menu-toggle');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

btn.addEventListener('click', () => {
  const open = btn.classList.toggle('active');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
  document.body.classList.toggle('no-scroll');
  btn.setAttribute('aria-expanded', open);
});

overlay.addEventListener('click', () => {
  btn.classList.remove('active');
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
  document.body.classList.remove('no-scroll');
  btn.setAttribute('aria-expanded', false);
});

document.getElementById('year').textContent = new Date().getFullYear();

function updateServerStatus() {
  document.getElementById('player-count').textContent =
    `${Math.floor(Math.random() * 50)}/50`;
  document.getElementById('server-uptime').textContent = '12h 34m';
}

updateServerStatus();
setInterval(updateServerStatus, 10000);

function countdown() {
  const eventDate = new Date("2026-01-20T20:00:00").getTime();
  const diff = eventDate - Date.now();

  if (diff <= 0) {
    document.getElementById('countdown').textContent = 'Event Live!';
    return;
  }

  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000) % 24;
  const m = Math.floor(diff / 60000) % 60;
  const s = Math.floor(diff / 1000) % 60;

  document.getElementById('countdown').textContent =
    `${d}d ${h}h ${m}m ${s}s`;
}

countdown();
setInterval(countdown, 1000);
