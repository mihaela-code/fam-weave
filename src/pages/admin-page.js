import '../core/bootstrap.js';
import '../styles/main.css';
import { Modal } from 'bootstrap';
import { APP_NAME } from '../core/config.js';
import { mountNavbar, showAlert, getInitials } from '../core/ui.js';
import { requireAuth, requireFamily } from '../core/auth.js';
import {
  getFamily,
  getFamilyMembers,
  updateMemberRole,
  removeMember,
} from '../services/family-service.js';

document.title = `${APP_NAME} — Админ`;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function mapError(error) {
  const message = error.message || '';
  if (message.includes('LAST_PARENT')) {
    return 'Не може да премахнете или понижите последния родител на семейството.';
  }
  return 'Възникна грешка. Опитайте отново.';
}

const dateFormatter = new Intl.DateTimeFormat('bg-BG', { dateStyle: 'medium' });

function renderAvatarCell(member) {
  const avatarUrl = member.profiles?.avatar_url;
  if (avatarUrl) {
    return `<img src="${escapeHtml(avatarUrl)}" alt="Аватар" class="rounded-circle" style="width: 32px; height: 32px; object-fit: cover" />`;
  }
  return `
    <span
      class="rounded-circle bg-secondary text-white d-inline-flex align-items-center justify-content-center"
      style="width: 32px; height: 32px; font-size: 0.8rem"
    >${escapeHtml(getInitials(member.profiles?.display_name))}</span>`;
}

function renderRoleBadge(role) {
  const label = role === 'parent' ? 'Родител' : 'Дете';
  const badgeClass = role === 'parent' ? 'bg-primary' : 'bg-secondary';
  return `<span class="badge ${badgeClass}">${label}</span>`;
}

function renderActionsCell(member, isSelf) {
  if (isSelf) {
    return `<span class="text-muted">(вие)</span>`;
  }

  const toggleLabel = member.role === 'parent' ? 'Направи дете' : 'Направи родител';

  return `
    <button type="button" class="btn btn-sm btn-outline-secondary me-1 toggle-role-btn" data-id="${member.id}">
      ${toggleLabel}
    </button>
    <button type="button" class="btn btn-sm btn-outline-danger remove-member-btn" data-id="${member.id}">
      Премахни
    </button>`;
}

const session = await requireAuth();
if (session) {
  const family = await requireFamily();
  if (family) {
    if (family.role !== 'parent') {
      window.location.href = 'dashboard.html';
    } else {
      mountNavbar(document.getElementById('navbar'), { activePage: 'admin', session, isParent: true });

      const alertContainer = document.getElementById('alertContainer');
      const familyNameHeading = document.getElementById('familyNameHeading');
      const inviteCodeBadge = document.getElementById('inviteCodeBadge');
      const membersTableBody = document.getElementById('membersTableBody');
      const confirmModalEl = document.getElementById('confirmModal');
      const confirmModalTitle = document.getElementById('confirmModalTitle');
      const confirmModalBody = document.getElementById('confirmModalBody');
      const confirmModalConfirmBtn = document.getElementById('confirmModalConfirmBtn');

      const confirmModal = new Modal(confirmModalEl);
      let pendingConfirmAction = null;
      let currentMembers = [];

      function openConfirmModal({ title, body, onConfirm }) {
        confirmModalTitle.textContent = title;
        confirmModalBody.innerHTML = body;
        pendingConfirmAction = onConfirm;
        confirmModal.show();
      }

      confirmModalConfirmBtn.addEventListener('click', async () => {
        const action = pendingConfirmAction;
        pendingConfirmAction = null;
        confirmModal.hide();
        if (action) {
          await action();
        }
      });

      async function loadMembers() {
        const members = await getFamilyMembers(family.family_id);
        currentMembers = members;

        membersTableBody.innerHTML = members
          .map((member) => {
            const isSelf = member.user_id === session.user.id;
            return `
              <tr>
                <td>${renderAvatarCell(member)}</td>
                <td>${escapeHtml(member.profiles?.display_name ?? '')}</td>
                <td>${renderRoleBadge(member.role)}</td>
                <td>${dateFormatter.format(new Date(member.joined_at))}</td>
                <td>${renderActionsCell(member, isSelf)}</td>
              </tr>`;
          })
          .join('');
      }

      try {
        const familyDetails = await getFamily(family.family_id);
        familyNameHeading.textContent = familyDetails.name;
        inviteCodeBadge.textContent = familyDetails.invite_code;
        await loadMembers();
      } catch (error) {
        console.error(error);
        showAlert(alertContainer, mapError(error));
      }

      membersTableBody.addEventListener('click', (event) => {
        const toggleBtn = event.target.closest('.toggle-role-btn');
        const removeBtn = event.target.closest('.remove-member-btn');

        if (toggleBtn) {
          const member = currentMembers.find((m) => m.id === toggleBtn.dataset.id);
          if (!member) return;

          const newRole = member.role === 'parent' ? 'child' : 'parent';
          const roleLabel = newRole === 'parent' ? 'родител' : 'дете';

          openConfirmModal({
            title: 'Потвърдете промяна на роля',
            body: `Сигурни ли сте, че искате <strong>${escapeHtml(member.profiles?.display_name ?? '')}</strong> да стане <strong>${roleLabel}</strong>?`,
            onConfirm: async () => {
              try {
                await updateMemberRole(member.id, newRole);
                showAlert(alertContainer, 'Ролята е обновена успешно.', 'success');
                await loadMembers();
              } catch (error) {
                console.error(error);
                showAlert(alertContainer, mapError(error));
              }
            },
          });
          return;
        }

        if (removeBtn) {
          const member = currentMembers.find((m) => m.id === removeBtn.dataset.id);
          if (!member) return;

          openConfirmModal({
            title: 'Потвърдете премахване',
            body: `Сигурни ли сте, че искате да премахнете <strong>${escapeHtml(member.profiles?.display_name ?? '')}</strong> от семейството?`,
            onConfirm: async () => {
              try {
                await removeMember(member.id);
                showAlert(alertContainer, 'Членът е премахнат.', 'success');
                await loadMembers();
              } catch (error) {
                console.error(error);
                showAlert(alertContainer, mapError(error));
              }
            },
          });
        }
      });
    }
  }
}
