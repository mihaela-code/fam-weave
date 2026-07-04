import { APP_NAME } from './config.js';
import { signOut } from './auth.js';

const NAV_LINKS = [
  { id: 'dashboard', label: 'Dashboard', href: 'dashboard.html' },
  { id: 'calendar', label: 'Calendar', href: 'calendar.html' },
  { id: 'expenses', label: 'Expenses', href: 'expenses.html' },
  { id: 'admin', label: 'Admin', href: 'admin.html' },
  { id: 'profile', label: 'Profile', href: 'profile.html' },
];

export function renderNavbar(activePage = '', hasSession = false) {
  const navItems = hasSession
    ? NAV_LINKS.map(
        (link) => `
      <li class="nav-item">
        <a class="nav-link${link.id === activePage ? ' active' : ''}" href="${link.href}">${link.label}</a>
      </li>`
      ).join('')
    : '';

  const authControls = hasSession
    ? `<a class="btn btn-outline-light" id="logoutBtn" href="#">Log out</a>`
    : `
      <a class="btn btn-outline-light me-2" href="login.html">Log In</a>
      <a class="btn btn-light" href="register.html">Register</a>`;

  return `
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
      <div class="container-fluid">
        <a class="navbar-brand" href="dashboard.html">${APP_NAME}</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-controls="mainNav" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="mainNav">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">${navItems}
          </ul>
          <div class="d-flex">${authControls}</div>
        </div>
      </div>
    </nav>`;
}

export function mountNavbar(container, { activePage = '', session = null } = {}) {
  container.innerHTML = renderNavbar(activePage, Boolean(session));

  const logoutBtn = container.querySelector('#logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (event) => {
      event.preventDefault();
      await signOut();
      window.location.href = 'login.html';
    });
  }
}

export function showAlert(container, message, type = 'danger') {
  container.innerHTML = `<div class="alert alert-${type}" role="alert">${message}</div>`;
}
