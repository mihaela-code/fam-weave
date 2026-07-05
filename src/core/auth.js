import { supabase } from './supabase.js';

export async function signUp({ displayName, email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
    },
  });
  if (error) throw error;
  return data;
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

export async function redirectIfAuthenticated() {
  const session = await getSession();
  if (session) {
    window.location.href = 'dashboard.html';
  }
  return session;
}

export async function getMyFamily() {
  const session = await getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from('family_members')
    .select('family_id, role, families(name)')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    family_id: data.family_id,
    role: data.role,
    family_name: data.families.name,
  };
}

let cachedFamily = null;

export async function requireFamily() {
  if (cachedFamily) return cachedFamily;

  const family = await getMyFamily();
  if (!family) {
    window.location.href = 'onboarding.html';
    return null;
  }

  cachedFamily = family;
  return cachedFamily;
}
