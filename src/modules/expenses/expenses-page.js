import '../../core/bootstrap.js';
import '../../styles/main.css';
import { APP_NAME } from '../../core/config.js';
import { mountNavbar } from '../../core/ui.js';
import { requireAuth } from '../../core/auth.js';

document.title = `${APP_NAME} — Expenses`;

const session = await requireAuth();
if (session) {
  mountNavbar(document.getElementById('navbar'), { activePage: 'expenses', session });
}
