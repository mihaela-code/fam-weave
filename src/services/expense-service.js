import { supabase } from '../core/supabase.js';

export async function getCategories(familyId) {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .eq('family_id', familyId)
    .order('name');

  if (error) throw error;
  return data;
}

export async function createCategory(familyId, name) {
  const { data, error } = await supabase
    .from('categories')
    .insert({ family_id: familyId, name: name.trim() })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getExpenses(familyId) {
  const { data, error } = await supabase
    .from('expenses')
    .select('id, amount, description, spent_on, category_id, categories(name)')
    .eq('family_id', familyId)
    .order('spent_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data;
}

export async function updateExpense(id, { categoryId, amount, description, spentOn }) {
  const { data, error } = await supabase
    .from('expenses')
    .update({
      category_id: categoryId,
      amount,
      description: description || null,
      spent_on: spentOn,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteExpense(id) {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}

export async function createExpense({ familyId, categoryId, amount, description, spentOn }) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      family_id: familyId,
      category_id: categoryId,
      amount,
      description: description || null,
      spent_on: spentOn,
      created_by: session.user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
