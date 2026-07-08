import './core/bootstrap.js';
import './styles/main.css';
import { APP_NAME } from './core/config.js';
import { mountNavbar, showAlert } from './core/ui.js';
import { requireAuth, requireFamily } from './core/auth.js';
import { getProfile, uploadAvatar } from './services/profile-service.js';

document.title = `${APP_NAME} — Profile`;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function mapError() {
  return 'Something went wrong. Please try again.';
}

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

function getInitials(displayName) {
  if (!displayName) return '?';
  return displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

const session = await requireAuth();
if (session) {
  const family = await requireFamily();
  if (family) {
    mountNavbar(document.getElementById('navbar'), { activePage: 'profile', session });

    const alertContainer = document.getElementById('alertContainer');
    const avatarImage = document.getElementById('avatarImage');
    const avatarPlaceholder = document.getElementById('avatarPlaceholder');
    const avatarForm = document.getElementById('avatarForm');
    const avatarFileInput = document.getElementById('avatarFileInput');
    const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
    const uploadAvatarSpinner = document.getElementById('uploadAvatarSpinner');

    function renderAvatar(avatarUrl, displayName) {
      if (avatarUrl) {
        avatarImage.src = avatarUrl;
        avatarImage.classList.remove('d-none');
        avatarPlaceholder.classList.add('d-none');
      } else {
        avatarImage.classList.add('d-none');
        avatarPlaceholder.classList.remove('d-none');
        avatarPlaceholder.innerHTML = escapeHtml(getInitials(displayName));
      }
    }

    try {
      const profile = await getProfile(session.user.id);
      renderAvatar(profile.avatar_url, profile.display_name);
    } catch (error) {
      console.error(error);
      showAlert(alertContainer, mapError(error));
    }

    avatarForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      alertContainer.innerHTML = '';

      const file = avatarFileInput.files[0];

      if (!file) {
        showAlert(alertContainer, 'Please choose an image file.');
        return;
      }
      if (!file.type.startsWith('image/')) {
        showAlert(alertContainer, 'File must be an image.');
        return;
      }
      if (file.size > MAX_AVATAR_SIZE) {
        showAlert(alertContainer, 'Image must be 2MB or smaller.');
        return;
      }

      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        showAlert(alertContainer, 'Allowed image types: jpg, jpeg, png, webp, gif.');
        return;
      }

      uploadAvatarBtn.disabled = true;
      uploadAvatarSpinner.classList.remove('d-none');

      try {
        const avatarUrl = await uploadAvatar(session.user.id, file, ext);
        renderAvatar(avatarUrl);
        showAlert(alertContainer, 'Avatar updated successfully.', 'success');
        avatarForm.reset();
      } catch (error) {
        console.error(error);
        showAlert(alertContainer, mapError(error));
      } finally {
        uploadAvatarBtn.disabled = false;
        uploadAvatarSpinner.classList.add('d-none');
      }
    });
  }
}
