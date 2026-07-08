import { APP_NAME } from './config.js';
import { signOut } from './auth.js';
import { getProfile } from '../services/profile-service.js';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getInitials(displayName) {
  if (!displayName) return '?';
  return displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

const NAV_LINKS = [
  { id: 'dashboard', label: 'Dashboard', href: 'dashboard.html' },
  { id: 'calendar', label: 'Calendar', href: 'calendar.html' },
  { id: 'expenses', label: 'Expenses', href: 'expenses.html' },
  { id: 'admin', label: 'Админ', href: 'admin.html', parentOnly: true },
  { id: 'profile', label: 'Profile', href: 'profile.html' },
];

export function renderNavbar(activePage = '', hasSession = false, isParent = false) {
  const navItems = hasSession
    ? NAV_LINKS.filter((link) => !link.parentOnly || isParent)
        .map(
          (link) => `
      <li class="nav-item">
        <a class="nav-link${link.id === activePage ? ' active' : ''}" href="${link.href}">${link.label}</a>
      </li>`
        )
        .join('')
    : '';

  const authControls = hasSession
    ? `
      <a href="profile.html" class="me-2 text-decoration-none" id="navbarAvatarLink" aria-label="Profile">
        <span
          class="rounded-circle bg-secondary text-white d-inline-flex align-items-center justify-content-center"
          style="width: 32px; height: 32px; font-size: 0.8rem"
          id="navbarAvatarPlaceholder"
        >?</span>
        <img
          src=""
          alt="Avatar"
          class="rounded-circle d-none"
          style="width: 32px; height: 32px; object-fit: cover"
          id="navbarAvatarImage"
        />
      </a>
      <a class="btn btn-outline-light" id="logoutBtn" href="#">Log out</a>`
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

export function mountNavbar(container, { activePage = '', session = null, isParent = false } = {}) {
  container.innerHTML = renderNavbar(activePage, Boolean(session), isParent);

  const logoutBtn = container.querySelector('#logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (event) => {
      event.preventDefault();
      await signOut();
      window.location.href = 'login.html';
    });
  }

  if (session) {
    loadNavbarAvatar(container, session);
  }
}

async function loadNavbarAvatar(container, session) {
  const avatarImage = container.querySelector('#navbarAvatarImage');
  const avatarPlaceholder = container.querySelector('#navbarAvatarPlaceholder');
  if (!avatarImage || !avatarPlaceholder) return;

  try {
    const profile = await getProfile(session.user.id);
    if (profile.avatar_url) {
      avatarImage.src = profile.avatar_url;
      avatarImage.classList.remove('d-none');
      avatarPlaceholder.classList.add('d-none');
    } else {
      avatarPlaceholder.innerHTML = escapeHtml(getInitials(profile.display_name));
    }
  } catch (error) {
    console.error(error);
  }
}

export function showAlert(container, message, type = 'danger') {
  container.innerHTML = `<div class="alert alert-${type}" role="alert">${message}</div>`;
}
