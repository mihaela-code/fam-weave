import '../../core/bootstrap.js';
import '../../styles/main.css';
import { APP_NAME } from '../../core/config.js';
import { mountNavbar, showAlert } from '../../core/ui.js';
import { requireAuth, requireFamily } from '../../core/auth.js';
import { getCategories, createCategory, getExpenses, createExpense } from '../../services/expense-service.js';

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
    mountNavbar(document.getElementById('navbar'), { activePage: 'expenses', session });

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

    const currencyFormatter = new Intl.NumberFormat('bg-BG', {
      style: 'currency',
      currency: 'EUR',
    });

    const isParent = family.role === 'parent';
    if (isParent) {
      addExpenseSection.classList.remove('d-none');
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

      if (expenses.length === 0) {
        expensesTableBody.innerHTML = '';
        emptyState.classList.remove('d-none');
        return;
      }

      emptyState.classList.add('d-none');
      expensesTableBody.innerHTML = expenses
        .map(
          (expense) => `
            <tr>
              <td>${expense.spent_on}</td>
              <td>${escapeHtml(expense.categories?.name ?? '')}</td>
              <td>${escapeHtml(expense.description ?? '')}</td>
              <td>${currencyFormatter.format(expense.amount)}</td>
            </tr>`
        )
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

        try {
          await createExpense({
            familyId: family.family_id,
            categoryId,
            amount,
            description: descriptionInput.value.trim(),
            spentOn: spentOnInput.value,
          });

          addExpenseForm.reset();
          spentOnInput.value = new Date().toISOString().slice(0, 10);
          showAlert(alertContainer, 'Разходът е добавен успешно.', 'success');
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
