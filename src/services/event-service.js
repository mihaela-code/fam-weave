import { supabase } from '../core/supabase.js';

export async function getEvents(familyId) {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, description, starts_at, ends_at, location')
    .eq('family_id', familyId)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function createEvent({ familyId, title, description, startsAt, endsAt, location }) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { data, error } = await supabase
    .from('events')
    .insert({
      family_id: familyId,
      title,
      description: description || null,
      starts_at: startsAt,
      ends_at: endsAt || null,
      location: location || null,
      created_by: session.user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateEvent(id, { title, description, startsAt, endsAt, location }) {
  const { data, error } = await supabase
    .from('events')
    .update({
      title,
      description: description || null,
      starts_at: startsAt,
      ends_at: endsAt || null,
      location: location || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEvent(id) {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}
