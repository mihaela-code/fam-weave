import { supabase } from '../core/supabase.js';

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function uploadAvatar(userId, file, ext) {
  const path = `${userId}/avatar.${ext}`;

  const staleExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'].filter((e) => e !== ext);
  await supabase.storage
    .from('avatars')
    .remove(staleExtensions.map((e) => `${userId}/avatar.${e}`));

  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(path);

  const avatarUrl = `${publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId);
  if (updateError) throw updateError;

  return avatarUrl;
}
