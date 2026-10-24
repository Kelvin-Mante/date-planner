-- Run this once in Supabase Dashboard > SQL Editor.
create table if not exists public.date_responses (
  id uuid primary key default gen_random_uuid(),
  date_choice text not null check (
    date_choice in ('Just hang out', 'Cute café date', 'Dinner date', 'Something else')
  ),
  available_on date,
  is_flexible boolean not null default false,
  time_preference text not null default 'Any time',
  extra_note text,
  created_at timestamptz not null default now(),
  constraint date_response_availability_check check (
    (is_flexible = true and available_on is null)
    or (is_flexible = false and available_on is not null)
  ),
  constraint date_response_time_preference_check check (
    time_preference in ('Any time', 'Afternoon', 'Evening')
  ),
  constraint date_response_extra_note_check check (
    extra_note is null or char_length(extra_note) <= 500
  )
);

-- These keep this setup script safe to re-run after the original table was created.
alter table public.date_responses
  add column if not exists time_preference text not null default 'Any time';
alter table public.date_responses
  add column if not exists extra_note text;

alter table public.date_responses
  drop constraint if exists date_response_time_preference_check;
alter table public.date_responses
  add constraint date_response_time_preference_check check (
    time_preference in ('Any time', 'Afternoon', 'Evening')
  );
alter table public.date_responses
  drop constraint if exists date_response_extra_note_check;
alter table public.date_responses
  add constraint date_response_extra_note_check check (
    extra_note is null or char_length(extra_note) <= 500
  );

alter table public.date_responses enable row level security;

-- The website can submit a response, but the public browser role cannot read or change responses.
revoke all on table public.date_responses from anon, authenticated;
grant insert on table public.date_responses to anon;

drop policy if exists "Anyone can submit a date response" on public.date_responses;
create policy "Anyone can submit a date response"
  on public.date_responses
  for insert
  to anon
  with check (true);
