import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

const page = (name) => fileURLToPath(new URL(`./${name}`, import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: page('index.html'),
        login: page('login.html'),
        register: page('register.html'),
        dashboard: page('dashboard.html'),
        calendar: page('calendar.html'),
        expenses: page('expenses.html'),
        admin: page('admin.html'),
        profile: page('profile.html'),
      },
    },
  },
});
