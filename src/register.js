import './core/bootstrap.js';
import './styles/main.css';
import { APP_NAME } from './core/config.js';
import { renderNavbar, showAlert } from './core/ui.js';
import { signUp } from './core/auth.js';

document.title = `${APP_NAME} — Register`;
document.getElementById('navbar').innerHTML = renderNavbar();

const form = document.getElementById('registerForm');
const alertContainer = document.getElementById('alertContainer');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  alertContainer.innerHTML = '';

  const displayName = document.getElementById('displayName').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!displayName || !email || !password) {
    showAlert(alertContainer, 'Please fill in all fields.');
    return;
  }

  try {
    await signUp({ displayName, email, password });
    window.location.href = 'dashboard.html';
  } catch (error) {
    console.error(error);
    showAlert(alertContainer, error.message);
  }
});
