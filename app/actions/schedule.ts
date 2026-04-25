'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

export type ScheduleEventInput = {
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  isAllDay: boolean;
  location: string | null;
  notes: string | null;
};

export type ScheduleEvent = {
  id: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  isAllDay: boolean;
  location: string | null;
  notes: string | null;
};

export async function getScheduleEvents(
  dateFrom: string,
  dateTo: string,
): Promise<{ data: ScheduleEvent[]; error: string | null }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data, error } = await supabase
    .from('schedule_events')
    .select('id, title, date, start_time, end_time, is_all_day, location, notes')
    .eq('user_id', user.id)
    .gte('date', dateFrom)
    .lte('date', dateTo)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: false });

  if (error) return { data: [], error: error.message };

  return {
    data: (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      isAllDay: row.is_all_day,
      location: row.location,
      notes: row.notes,
    })),
    error: null,
  };
}

export async function createScheduleEvent(
  input: ScheduleEventInput,
): Promise<{ error: string | null }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase.from('schedule_events').insert({
    user_id: user.id,
    title: input.title.trim(),
    date: input.date,
    start_time: input.startTime || null,
    end_time: input.endTime || null,
    is_all_day: input.isAllDay,
    location: input.location?.trim() || null,
    notes: input.notes?.trim() || null,
  });

  if (error) return { error: error.message };

  revalidatePath('/schedule');
  return { error: null };
}

export async function updateScheduleEvent(
  id: string,
  input: ScheduleEventInput,
): Promise<{ error: string | null }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase
    .from('schedule_events')
    .update({
      title: input.title.trim(),
      date: input.date,
      start_time: input.startTime || null,
      end_time: input.endTime || null,
      is_all_day: input.isAllDay,
      location: input.location?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/schedule');
  return { error: null };
}

export async function deleteScheduleEvent(id: string): Promise<{ error: string | null }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase
    .from('schedule_events')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/schedule');
  return { error: null };
}
