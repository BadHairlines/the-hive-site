/* ─────────────────────────────
   SIDEBAR TOGGLE
───────────────────────────── */
const btn = document.querySelector('.menu-toggle');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

btn.addEventListener('click', () => {
  btn.classList.toggle('active');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
});

overlay.addEventListener('click', () => {
  btn.classList.remove('active');
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
});

/* ─────────────────────────────
   FOOTER YEAR
───────────────────────────── */
document.getElementById('year').textContent = new Date().getFullYear();

/* ─────────────────────────────
   FAKE SERVER STATUS
───────────────────────────── */
function updateServerStatus() {
  const maxPlayers = 50;
  const currentPlayers = Math.floor(Math.random() * maxPlayers);
  const uptime = `${Math.floor(Math.random() * 24)}h ${Math.floor(Math.random() * 60)}m`;
  document.getElementById('player-count').textContent = `${currentPlayers}/${maxPlayers}`;
  document.getElementById('server-uptime').textContent = uptime;
}
updateServerStatus();
setInterval(updateServerStatus, 10000);

/* ─────────────────────────────
   COUNTDOWN TIMER
───────────────────────────── */
function countdown() {
  const eventDate = new Date("2026-01-20T20:00:00").getTime();
  const now = new Date().getTime();
  const diff = eventDate - now;

  const countdownEl = document.getElementById('countdown');
  if (diff < 0) {
    countdownEl.textContent = "Event Live!";
    countdownEl.classList.remove('warning');
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000*60*60*24)) / (1000*60*60));
  const minutes = Math.floor((diff % (1000*60*60)) / (1000*60));
  const seconds = Math.floor((diff % (1000*60)) / 1000);

  countdownEl.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;

  // Countdown warning if under 1 hour
  if (diff < 1000*60*60) {
    countdownEl.classList.add('warning');
  } else {
    countdownEl.classList.remove('warning');
  }
}
countdown();
setInterval(countdown, 1000);

/* ─────────────────────────────
   LOAD NEWS
───────────────────────────── */
fetch('news.json')
  .then(res => res.json())
  .then(news => {
    const feed = document.getElementById('news-feed');
    news.reverse().forEach(item => {
      const card = document.createElement('div');
      card.className = 'card animate';
      card.innerHTML = `
        <h3>${item.title}</h3>
        <p>${item.content}</p>
        <span class="date">${new Date(item.date).toDateString()}</span>
      `;
      feed.appendChild(card);
    });
  });

/* ─────────────────────────────
   LOAD EVENTS
───────────────────────────── */
fetch('events.json')
  .then(res => res.json())
  .then(events => {
    const feed = document.getElementById('events-feed');
    events.forEach(event => {
      const card = document.createElement('div');
      card.className = 'card animate';
      card.innerHTML = `
        <h3>${event.title}</h3>
        <p>${event.description}</p>
        <p><strong>${new Date(event.date).toLocaleString()}</strong></p>
      `;
      feed.appendChild(card);
    });
  });

/* ─────────────────────────────
   SCROLL ANIMATIONS
───────────────────────────── */
const animatedEls = document.querySelectorAll('.animate');
function handleScrollAnimation() {
  const triggerBottom = window.innerHeight * 0.9;
  animatedEls.forEach(el => {
    const top = el.getBoundingClientRect().top;
    if (top < triggerBottom) {
      el.classList.add('visible');
    }
  });
}
window.addEventListener('scroll', handleScrollAnimation);
handleScrollAnimation(); // trigger on load

/* ─────────────────────────────
   SMOOTH SCROLL FOR ANCHORS
───────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    document.querySelector(this.getAttribute('href'))
            .scrollIntoView({ behavior: 'smooth' });
  });
});

/* ─────────────────────────────
   MOBILE STICKY CTA
───────────────────────────── */
const mobileCTA = document.createElement('a');
mobileCTA.href = "https://discord.gg/thehivedayz";
mobileCTA.target = "_blank";
mobileCTA.className = "mobile-cta";
mobileCTA.textContent = "Join Discord";
document.body.appendChild(mobileCTA);
