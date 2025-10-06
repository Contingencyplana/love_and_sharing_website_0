// Mobile menu toggle
const toggle = document.getElementById('navToggle');
const list = document.getElementById('nav-list');
if (toggle && list) {
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    list.setAttribute('aria-expanded', String(!expanded));
  });
}
