import { APP_NAME } from './config.js';

const NAV_LINKS = [
  { id: 'dashboard', label: 'Dashboard', href: 'dashboard.html' },
  { id: 'calendar', label: 'Calendar', href: 'calendar.html' },
  { id: 'expenses', label: 'Expenses', href: 'expenses.html' },
  { id: 'admin', label: 'Admin', href: 'admin.html' },
  { id: 'profile', label: 'Profile', href: 'profile.html' },
];

export function renderNavbar(activePage = '') {
  const navItems = NAV_LINKS.map(
    (link) => `
      <li class="nav-item">
        <a class="nav-link${link.id === activePage ? ' active' : ''}" href="${link.href}">${link.label}</a>
      </li>`
  ).join('');

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
          <a class="btn btn-outline-light" href="login.html">Log out</a>
        </div>
      </div>
    </nav>`;
}
