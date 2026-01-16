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
