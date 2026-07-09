import '../core/bootstrap.js';
import '../styles/main.css';
import { APP_NAME } from '../core/config.js';
import { mountNavbar, showAlert } from '../core/ui.js';
import { requireAuth, requireFamily } from '../core/auth.js';
import {
  getCategories,
  createCategory,
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from '../services/expense-service.js';

document.title = `${APP_NAME} — Разходи`;

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
  if (message.includes('duplicate key') || error.code === '23505') {
    return 'Категория с това име вече съществува.';
  }
  if (message.includes('violates check constraint') || error.code === '23514') {
    return 'Сумата трябва да е положително число.';
  }
  return 'Възникна грешка. Опитайте отново.';
}

const session = await requireAuth();
if (session) {
  const family = await requireFamily();
  if (family) {
    mountNavbar(document.getElementById('navbar'), {
      activePage: 'expenses',
      session,
      isParent: family.role === 'parent',
    });

    const alertContainer = document.getElementById('alertContainer');
    const addExpenseSection = document.getElementById('addExpenseSection');
    const addExpenseForm = document.getElementById('addExpenseForm');
    const addExpenseBtn = document.getElementById('addExpenseBtn');
    const addExpenseSpinner = document.getElementById('addExpenseSpinner');
    const categorySelect = document.getElementById('categorySelect');
    const amountInput = document.getElementById('amountInput');
    const descriptionInput = document.getElementById('descriptionInput');
    const spentOnInput = document.getElementById('spentOnInput');
    const newCategoryToggle = document.getElementById('newCategoryToggle');
    const newCategoryGroup = document.getElementById('newCategoryGroup');
    const newCategoryName = document.getElementById('newCategoryName');
    const newCategoryConfirm = document.getElementById('newCategoryConfirm');
    const expensesTableBody = document.getElementById('expensesTableBody');
    const emptyState = document.getElementById('emptyState');
    const actionsHeader = document.getElementById('actionsHeader');
    const editWarning = document.getElementById('editWarning');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const addExpenseBtnLabel = document.getElementById('addExpenseBtnLabel');

    const currencyFormatter = new Intl.NumberFormat('bg-BG', {
      style: 'currency',
      currency: 'EUR',
    });

    const isParent = family.role === 'parent';
    if (isParent) {
      addExpenseSection.classList.remove('d-none');
      actionsHeader.classList.remove('d-none');
    }

    let editingExpenseId = null;
    let currentExpenses = [];

    function showSuccessAlert(message) {
      showAlert(alertContainer, message, 'success');
      const el = alertContainer.firstElementChild;
      setTimeout(() => {
        if (el?.isConnected) {
          el.remove();
        }
      }, 2500);
    }

    function enterEditMode(expense) {
      editingExpenseId = expense.id;
      categorySelect.value = expense.category_id;
      amountInput.value = expense.amount;
      descriptionInput.value = expense.description ?? '';
      spentOnInput.value = expense.spent_on;
      editWarning.classList.remove('d-none');
      addExpenseBtnLabel.textContent = 'Запази';
      addExpenseForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function exitEditMode() {
      editingExpenseId = null;
      addExpenseForm.reset();
      spentOnInput.value = new Date().toISOString().slice(0, 10);
      editWarning.classList.add('d-none');
      addExpenseBtnLabel.textContent = 'Добави';
    }

    spentOnInput.value = new Date().toISOString().slice(0, 10);

    async function loadCategories(selectedId) {
      const categories = await getCategories(family.family_id);
      categorySelect.innerHTML = categories
        .map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`)
        .join('');
      if (selectedId) {
        categorySelect.value = selectedId;
      }
    }

    async function loadExpenses() {
      const expenses = await getExpenses(family.family_id);
      currentExpenses = expenses;

      if (expenses.length === 0) {
        expensesTableBody.innerHTML = '';
        emptyState.classList.remove('d-none');
        return;
      }

      emptyState.classList.add('d-none');
      expensesTableBody.innerHTML = expenses
        .map((expense) => {
          const actionsCell = isParent
            ? `
              <td>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary me-1 edit-expense-btn"
                  data-id="${expense.id}"
                  aria-label="Редактирай"
                >
                  <i class="bi bi-pencil"></i>
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-danger delete-expense-btn"
                  data-id="${expense.id}"
                  aria-label="Изтрий"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </td>`
            : '';

          return `
            <tr>
              <td>${expense.spent_on}</td>
              <td>${escapeHtml(expense.categories?.name ?? '')}</td>
              <td>${escapeHtml(expense.description ?? '')}</td>
              <td>${currencyFormatter.format(expense.amount)}</td>
              ${actionsCell}
            </tr>`;
        })
        .join('');
    }

    try {
      await loadCategories();
      await loadExpenses();
    } catch (error) {
      console.error(error);
      showAlert(alertContainer, mapError(error));
    }

    if (isParent) {
      cancelEditBtn.addEventListener('click', () => {
        exitEditMode();
      });

      expensesTableBody.addEventListener('click', async (event) => {
        const editBtn = event.target.closest('.edit-expense-btn');
        const deleteBtn = event.target.closest('.delete-expense-btn');

        if (editBtn) {
          const expense = currentExpenses.find((e) => e.id === editBtn.dataset.id);
          if (expense) {
            enterEditMode(expense);
          }
          return;
        }

        if (deleteBtn) {
          const id = deleteBtn.dataset.id;
          const confirmed = confirm('Сигурна ли си, че искаш да изтриеш този разход?');
          if (!confirmed) return;

          try {
            await deleteExpense(id);
            if (editingExpenseId === id) {
              exitEditMode();
            }
            showSuccessAlert('Разходът беше изтрит.');
            await loadExpenses();
          } catch (error) {
            console.error(error);
            showAlert(alertContainer, mapError(error));
          }
        }
      });

      newCategoryToggle.addEventListener('click', () => {
        newCategoryGroup.classList.toggle('d-none');
        newCategoryName.focus();
      });

      newCategoryConfirm.addEventListener('click', async () => {
        alertContainer.innerHTML = '';

        const name = newCategoryName.value.trim();
        if (!name) {
          showAlert(alertContainer, 'Въведете име на категория.');
          return;
        }

        try {
          const category = await createCategory(family.family_id, name);
          await loadCategories(category.id);
          newCategoryName.value = '';
          newCategoryGroup.classList.add('d-none');
        } catch (error) {
          console.error(error);
          showAlert(alertContainer, mapError(error));
        }
      });

      addExpenseForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        alertContainer.innerHTML = '';

        const categoryId = categorySelect.value;
        const amount = parseFloat(amountInput.value);

        if (!categoryId) {
          showAlert(alertContainer, 'Изберете категория.');
          return;
        }
        if (!(amount > 0)) {
          showAlert(alertContainer, 'Сумата трябва да е положително число.');
          return;
        }

        addExpenseBtn.disabled = true;
        addExpenseSpinner.classList.remove('d-none');

        const isEditing = editingExpenseId !== null;
        const expenseData = {
          categoryId,
          amount,
          description: descriptionInput.value.trim(),
          spentOn: spentOnInput.value,
        };

        try {
          if (isEditing) {
            await updateExpense(editingExpenseId, expenseData);
          } else {
            await createExpense({ familyId: family.family_id, ...expenseData });
          }

          exitEditMode();
          showSuccessAlert(isEditing ? 'Разходът е обновен.' : 'Разходът е добавен успешно.');
          await loadExpenses();
        } catch (error) {
          console.error(error);
          showAlert(alertContainer, mapError(error));
        } finally {
          addExpenseBtn.disabled = false;
          addExpenseSpinner.classList.add('d-none');
        }
      });
    }
  }
}
