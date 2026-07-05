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
