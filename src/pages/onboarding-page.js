import '../core/bootstrap.js';
import '../styles/main.css';
import { APP_NAME } from '../core/config.js';
import { mountNavbar, showAlert } from '../core/ui.js';
import { requireAuth, getMyFamily } from '../core/auth.js';
import { createFamily } from '../services/family-service.js';

document.title = `${APP_NAME} — Onboarding`;
document.getElementById('pageTitle').textContent = `Добре дошли в ${APP_NAME}`;

const session = await requireAuth();

if (session) {
  mountNavbar(document.getElementById('navbar'), { session });

  const existingFamily = await getMyFamily();

  if (existingFamily) {
    window.location.href = 'dashboard.html';
  } else {
    const alertContainer = document.getElementById('alertContainer');
    const createForm = document.getElementById('createFamilyForm');
    const createBtn = document.getElementById('createFamilyBtn');
    const createSpinner = document.getElementById('createFamilySpinner');

    createForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      alertContainer.innerHTML = '';

      const name = document.getElementById('familyName').value.trim();

      if (name.length < 2 || name.length > 50) {
        showAlert(alertContainer, 'Името трябва да е между 2 и 50 символа.');
        return;
      }

      createBtn.disabled = true;
      createSpinner.classList.remove('d-none');

      try {
        const family = await createFamily(name);
        showAlert(
          alertContainer,
          `Семейството е създадено! Код за покана: ${family.invite_code}`,
          'success'
        );
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 3000);
      } catch (error) {
        console.error(error);
        showAlert(alertContainer, error.message);
        createBtn.disabled = false;
        createSpinner.classList.add('d-none');
      }
    });
  }
}
