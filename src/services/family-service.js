import { supabase } from '../core/supabase.js';

const ERROR_MESSAGES = {
  INVALID_NAME: 'Името трябва да е между 2 и 50 символа.',
  INVALID_CODE: 'Невалиден код за покана.',
  ALREADY_MEMBER: 'Вече си член на това семейство.',
};

function mapError(error) {
  for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
    if (error.message?.includes(code)) return message;
  }
  return 'Възникна грешка. Опитайте отново.';
}

export async function createFamily(name) {
  const { data, error } = await supabase.rpc('create_family', { family_name: name });

  if (error) {
    throw new Error(mapError(error));
  }

  return data;
}

export async function joinFamilyByCode(code) {
  const { data, error } = await supabase.rpc('join_family_by_code', { code });

  if (error) {
    throw new Error(mapError(error));
  }

  return data;
}

export async function getFamily(familyId) {
  const { data, error } = await supabase.from('families').select('name, invite_code').eq('id', familyId).single();

  if (error) throw error;
  return data;
}

export async function getFamilyMembers(familyId) {
  const { data, error } = await supabase
    .from('family_members')
    .select('id, user_id, role, joined_at, profiles(display_name, avatar_url)')
    .eq('family_id', familyId)
    .order('joined_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function updateMemberRole(memberId, newRole) {
  const { data, error } = await supabase
    .from('family_members')
    .update({ role: newRole })
    .eq('id', memberId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeMember(memberId) {
  const { error } = await supabase.from('family_members').delete().eq('id', memberId);
  if (error) throw error;
}
