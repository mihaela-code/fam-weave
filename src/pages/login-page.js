import '../core/bootstrap.js';
import '../styles/main.css';
import { APP_NAME } from '../core/config.js';
import { mountNavbar, showAlert } from '../core/ui.js';
import { signIn, redirectIfAuthenticated } from '../core/auth.js';

document.title = `${APP_NAME} — Log In`;

const session = await redirectIfAuthenticated();
if (!session) {
  mountNavbar(document.getElementById('navbar'));
}

const form = document.getElementById('loginForm');
const alertContainer = document.getElementById('alertContainer');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  alertContainer.innerHTML = '';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    showAlert(alertContainer, 'Please fill in all fields.');
    return;
  }

  try {
    await signIn({ email, password });
    window.location.href = 'dashboard.html';
  } catch (error) {
    console.error(error);
    showAlert(alertContainer, error.message);
  }
});
