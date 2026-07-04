import './core/bootstrap.js';
import './styles/main.css';
import { APP_NAME } from './core/config.js';
import { mountNavbar } from './core/ui.js';
import { getSession } from './core/auth.js';

document.title = APP_NAME;

const session = await getSession();
mountNavbar(document.getElementById('navbar'), { session });
