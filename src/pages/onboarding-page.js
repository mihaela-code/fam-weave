import '../core/bootstrap.js';
import '../styles/main.css';
import { APP_NAME } from '../core/config.js';
import { mountNavbar, showAlert, escapeHtml } from '../core/ui.js';
import { requireAuth, getMyFamily } from '../core/auth.js';
import { createFamily, joinFamilyByCode } from '../services/family-service.js';

document.title = `${APP_NAME} — Добре дошли`;
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

    document.getElementById('onboardingContent').classList.remove('d-none');

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

        alertContainer.innerHTML = `
          <div class="alert alert-success" role="alert">
            <p class="mb-2">Семейството е създадено! Код за покана:</p>
            <div class="d-flex align-items-center gap-2">
              <code id="inviteCodeValue">${escapeHtml(family.invite_code)}</code>
              <button type="button" class="btn btn-sm btn-outline-success" id="copyInviteCodeBtn">Копирай</button>
            </div>
            <a href="dashboard.html" class="btn btn-success btn-sm mt-3">Към таблото</a>
          </div>`;

        const copyInviteCodeBtn = document.getElementById('copyInviteCodeBtn');
        copyInviteCodeBtn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(family.invite_code);
            copyInviteCodeBtn.textContent = 'Копирано!';
            copyInviteCodeBtn.disabled = true;
          } catch (error) {
            console.error(error);
          }
        });

        document.getElementById('onboardingContent').classList.add('d-none');
      } catch (error) {
        console.error(error);
        showAlert(alertContainer, error.message);
        createBtn.disabled = false;
        createSpinner.classList.add('d-none');
      }
    });

    const joinForm = document.getElementById('joinFamilyForm');
    const joinBtn = document.getElementById('joinFamilyBtn');
    const joinSpinner = document.getElementById('joinFamilySpinner');

    joinForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      alertContainer.innerHTML = '';

      const code = document.getElementById('inviteCode').value.trim().toUpperCase();

      if (code.length !== 8) {
        showAlert(alertContainer, 'Кодът е 8 символа.');
        return;
      }

      joinBtn.disabled = true;
      joinSpinner.classList.remove('d-none');

      try {
        const family = await joinFamilyByCode(code);
        showAlert(alertContainer, `Присъедини се към "${family.name}"!`, 'success');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 2000);
      } catch (error) {
        console.error(error);
        showAlert(alertContainer, error.message);
        joinBtn.disabled = false;
        joinSpinner.classList.add('d-none');
      }
    });
  }
}
